import type { Metadata } from "next";
import Link from "next/link";
import { SalesChart } from "@/components/admin/SalesChart";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatFils } from "@/lib/i18n";
import { toAed } from "@/lib/money";
import { buildReport, rangeFromDays } from "@/lib/reports";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const admin = await requireAdminPage("reports:read");
  const { days: daysParam } = await searchParams;

  const days = PERIODS.some((period) => String(period.days) === daysParam)
    ? Number(daysParam)
    : 30;

  const report = await buildReport(rangeFromDays(days));

  const stats = [
    { label: "Revenue", value: formatFils(report.revenueFils, "en") ?? "—" },
    { label: "Paid orders", value: String(report.orders) },
    { label: "Average order", value: formatFils(report.averageOrderFils, "en") ?? "—" },
    { label: "Items sold", value: String(report.itemsSold) },
    { label: "New customers", value: String(report.newCustomers) },
  ];

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Reports</h1>
          <p className="admin-head__sub">Paid orders only — attempts are not revenue.</p>
        </div>
        <div className="admin-filters" style={{ margin: 0 }}>
          {PERIODS.map((period) => (
            <Link
              className={`filter${period.days === days ? " is-active" : ""}`}
              key={period.days}
              href={`/admin/reports?days=${period.days}`}
            >
              {period.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="admin-grid">
        {stats.map((stat) => (
          <div className="admin-card" key={stat.label}>
            <p className="admin-stat__label">{stat.label}</p>
            <p className="admin-stat__value">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="admin-card" style={{ marginTop: "1.25rem" }}>
        <h2 className="admin-fieldset__legend">Revenue</h2>
        <div style={{ marginTop: "1rem" }}>
          <SalesChart
            data={report.series.map((point) => ({
              date: point.date,
              revenue: toAed(point.revenueFils),
              orders: point.orders,
            }))}
          />
        </div>
      </div>

      <div className="admin-order" style={{ marginTop: "1.25rem" }}>
        <div className="admin-card">
          <h2 className="admin-fieldset__legend">Best sellers</h2>
          {report.topProducts.length === 0 ? (
            <p className="admin-stat__note" style={{ marginTop: ".75rem" }}>
              Nothing sold in this period.
            </p>
          ) : (
            <div className="admin-table-wrap" style={{ border: "none", marginTop: ".75rem" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="admin-table__actions">Sold</th>
                    <th className="admin-table__actions">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProducts.map((product) => (
                    <tr key={product.sku}>
                      <td>
                        <span className="admin-table__title">{product.name}</span>
                        <span className="admin-table__meta">{product.sku}</span>
                      </td>
                      <td className="admin-table__actions admin-table__mono">{product.qty}</td>
                      <td className="admin-table__actions admin-table__mono">
                        {formatFils(product.revenueFils, "en")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="admin-card">
            <h2 className="admin-fieldset__legend">Where orders are</h2>
            {report.byStatus.length === 0 ? (
              <p className="admin-stat__note" style={{ marginTop: ".75rem" }}>
                No paid orders yet.
              </p>
            ) : (
              <dl className="cart-totals" style={{ marginTop: ".75rem" }}>
                {report.byStatus.map((row) => (
                  <div key={row.status}>
                    <dt>{row.status.replace(/_/g, " ")}</dt>
                    <dd>{row.count}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="admin-card" style={{ marginTop: "1.25rem" }}>
            <h2 className="admin-fieldset__legend">Low stock</h2>
            {report.lowStock.length === 0 ? (
              <p className="admin-stat__note" style={{ marginTop: ".75rem" }}>
                Nothing is running low.
              </p>
            ) : (
              <dl className="cart-totals" style={{ marginTop: ".75rem" }}>
                {report.lowStock.map((product) => (
                  <div key={product.sku}>
                    <dt>{product.name}</dt>
                    <dd className={product.stock === 0 ? "" : undefined}>{product.stock}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="admin-card" style={{ marginTop: "1.25rem" }}>
            <h2 className="admin-fieldset__legend">Export</h2>
            <p className="admin-fieldset__hint">Opens in Excel or Numbers.</p>
            <div className="admin-jobs" style={{ marginTop: ".9rem" }}>
              {[
                { type: "orders", label: "Orders" },
                { type: "items", label: "Order items" },
                { type: "products", label: "Products" },
                { type: "customers", label: "Customers" },
              ].map((option) => (
                <a
                  className="btn btn--ghost btn--sm"
                  key={option.type}
                  href={`/api/reports/export?type=${option.type}&days=${days}`}
                >
                  {option.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
