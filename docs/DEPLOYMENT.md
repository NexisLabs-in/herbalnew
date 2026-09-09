# Deploying Herbedia

The app is one Next.js server. It needs a **persistent Node process** — not
serverless — because the scheduled jobs run in-process (plan §3). A small VPS
is enough: 1 vCPU and 1 GB of RAM runs it comfortably, since MongoDB is hosted
elsewhere and images can live in a bucket.

---

## 1. Before you deploy

Collect these. The app boots without most of them and refuses politely instead
of pretending, but a live shop needs all of them.

| What | Where it comes from | Without it |
|---|---|---|
| MongoDB connection string | Atlas, or a Mongo you run | Nothing works |
| Stripe secret key (live) | Stripe dashboard → Developers → API keys | Checkout refuses |
| Stripe webhook secret | Created in step 5 below | **Orders never get marked paid** |
| Resend API key + verified domain, **or** SMTP host credentials | resend.com / your mail host | No emails at all — including login codes |
| S3-compatible bucket | Cloudflare R2, AWS S3, Backblaze | Uploads live on the container's disk |
| A domain with DNS pointed at the server | Your registrar | No HTTPS, and Stripe cannot reach the webhook |

**Rotate the development credentials.** The database password and session
secrets used while building are not production secrets.

---

## 2. Prepare the server

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
sudo usermod -aG docker "$USER"   # log out and back in
```

---

## 3. Configure

Create `.env.production` next to `docker-compose.yml`. It is read by the
container and must never be committed.

```bash
NODE_ENV=production

MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net
MONGODB_DB=herbedia

# openssl rand -base64 32   (run it twice — these must differ)
AUTH_CUSTOMER_SECRET=
AUTH_ADMIN_SECRET=

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...          # from step 5
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

MAIL_DRIVER=resend
RESEND_API_KEY=re_...
MAIL_FROM="Herbedia <orders@yourdomain.com>"
# Or SMTP instead of Resend:
# MAIL_DRIVER=nodemailer
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_SECURE=false

STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=herbedia
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

NEXT_PUBLIC_SITE_URL=https://yourdomain.com
TimeZone=Asia/Dubai

# Exactly ONE container may have this true, or every job runs twice.
CRON_ENABLED=true
```

`NEXT_PUBLIC_*` values are baked in at build time, so they also go in the
compose build args — which `docker-compose.yml` already reads from the shell.
**`MONGODB_URI` is a build arg too:** the shop and CMS pages prerender against
the live database during `next build`. Without it the image build dials
`127.0.0.1` inside the container and dies on `/shop/[slug]`. Atlas must allow
the build host (or `0.0.0.0/0` while you ship).

---

## 4. Build and start

```bash
set -a && . ./.env.production && set +a   # export for the build args (incl. Mongo)
docker compose up -d --build
curl -s localhost:3000/api/health          # {"ok":true,"db":"connected"}
```

Seed once, from the host:

```bash
npm ci
MONGODB_URI=... MONGODB_DB=herbedia SEED_ADMIN_EMAIL=you@yourdomain.com npm run seed
```

It prints a one-time admin password. Sign in at `/admin/login`; you are forced
to change it immediately.

---

## 5. HTTPS and the reverse proxy

Do this **before** creating the Stripe webhook — Stripe will not accept an
endpoint it cannot reach over HTTPS.

`/etc/nginx/sites-available/herbedia`:

```nginx
server {
  server_name yourdomain.com;

  # Stripe signs the exact bytes it sent. Anything that rewrites the body
  # breaks signature verification and every webhook starts failing.
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  client_max_body_size 8M;   # uploads are capped at 5 MB
}
```

```bash
sudo ln -s /etc/nginx/sites-available/herbedia /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

`X-Forwarded-For` matters: the OTP and contact-form rate limits read it. Without
it every visitor looks like the proxy and shares one limit.

---

## 6. Stripe webhook

1. Stripe dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://yourdomain.com/api/webhooks/stripe`
3. Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` and restart:
   `docker compose up -d`

**This is the one step that silently breaks everything if skipped.** Without a
working webhook customers pay, Stripe takes the money, and the order stays
`pending` forever — no stock decrement, no confirmation email, no invoice.

Verify with a real card in test mode before going live, and check the order
reaches `paid` in `/admin/orders`.

---

## 7. After launch

- **Set the alert addresses** in `/admin/settings` → Notifications, or nobody
  is told about orders, enquiries, messages or low stock.
- **Check the digest hour.** It is read at boot, so changing it needs a restart.
- **Watch the first order end to end** — payment, email, stock, invoice.

### Updating

```bash
git pull
set -a && . ./.env.production && set +a
docker compose up -d --build
```

Downtime is a few seconds. Nothing is lost: the database is external and
uploads are on a volume or in the bucket.

### Backups

MongoDB Atlas backs itself up. If you self-host Mongo, schedule `mongodump`.
If `STORAGE_DRIVER=local`, **back up the uploads volume** — those images exist
nowhere else.

---

## Things that will bite you

| Symptom | Cause |
|---|---|
| `Failed to collect page data for /[locale]/shop/[slug]` at build | `MONGODB_URI` not exported into the Docker build (`set -a && . ./.env.production`), or Atlas blocking the build host |
| Orders stuck on `pending` after payment | Webhook not configured, or the wrong signing secret |
| No emails at all | `MAIL_DRIVER` still `console`, Resend domain unverified, or SMTP host/auth wrong |
| Login codes never arrive | Same as above — OTP is an email |
| Every job runs twice | `CRON_ENABLED=true` on more than one container |
| Rate limits trip for everyone at once | Proxy not sending `X-Forwarded-For` |
| Product images vanish after a deploy | `STORAGE_DRIVER=local` with no volume mounted |
| Arabic checkout looks English | Expected — Stripe Checkout has no Arabic locale |
