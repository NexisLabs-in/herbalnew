import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { EnquiryList, type AdminEnquiry } from "@/components/admin/EnquiryList";
import { requireAdminPage } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { formatFils } from "@/lib/i18n";
import { Order, PriceEnquiry, Product, type PriceEnquiryDoc } from "@/lib/models";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Price enquiries" };
export const dynamic = "force-dynamic";

export default async function AdminEnquiriesPage() {
  const admin = await requireAdminPage("enquiries:read");

  await connectDb();
  // Newest first, but anything still unanswered comes before anything settled.
  const enquiries = await PriceEnquiry.find()
    .sort({ status: 1, createdAt: -1 })
    .limit(200)
    .lean<PriceEnquiryDoc[]>();

  const [products, orders] = await Promise.all([
    Product.find({ _id: { $in: enquiries.map((e) => e.productId) } })
      .select("name sku")
      .lean(),
    Order.find({ _id: { $in: enquiries.map((e) => e.orderId).filter(Boolean) } })
      .select("orderNumber")
      .lean(),
  ]);

  const product = new Map(products.map((p) => [String(p._id), p]));
  const order = new Map(orders.map((o) => [String(o._id), o.orderNumber]));

  const rows: AdminEnquiry[] = enquiries.map((enquiry) => ({
    id: String(enquiry._id),
    productName: product.get(String(enquiry.productId))?.name.en ?? "—",
    productSku: product.get(String(enquiry.productId))?.sku ?? "",
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone ?? "",
    qty: enquiry.qty,
    message: enquiry.message ?? "",
    status: enquiry.status,
    locale: enquiry.locale ?? "en",
    quotedPrice: enquiry.quotedUnitPriceFils
      ? (formatFils(enquiry.quotedUnitPriceFils, "en") ?? "")
      : "",
    quoteExpiresAt: enquiry.quoteExpiresAt ? new Date(enquiry.quoteExpiresAt).toISOString() : null,
    orderNumber: enquiry.orderId ? (order.get(String(enquiry.orderId)) ?? null) : null,
    createdAt: new Date(enquiry.createdAt).toISOString(),
  }));

  const waiting = rows.filter((row) => row.status === "new").length;

  return (
    <AdminShell admin={admin} badges={{ newEnquiries: waiting }}>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Price enquiries</h1>
          <p className="admin-head__sub">
            {waiting} waiting for a price · from products priced on request
          </p>
        </div>
      </div>

      <EnquiryList enquiries={rows} canWrite={can(admin.permissions, "enquiries:write")} />
    </AdminShell>
  );
}
