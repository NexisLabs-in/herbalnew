import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { toAed } from "@/lib/money";
import { Customer, Order, Product, type OrderDoc } from "@/lib/models";
import { can } from "@/lib/permissions";
import { toCsv } from "@/lib/reports";

/** CSV exports.
 *
 *  A route handler rather than a server action because the browser needs to be
 *  handed a file, and an action can only return data. Amounts are exported in
 *  AED rather than fils: this is opened in a spreadsheet by a person, not read
 *  back by the app.
 */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin || !can(admin.permissions, "reports:read")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "orders";
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 30), 1), 730);
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  await connectDb();
  let rows: (string | number)[][];
  let name: string;

  switch (type) {
    case "products": {
      const products = await Product.find().sort({ "name.en": 1 }).lean();
      name = "products";
      rows = [
        ["SKU", "Name", "Arabic name", "Category", "Pricing", "Price AED", "Stock", "Status", "Rating", "Reviews"],
        ...products.map((product) => [
          product.sku,
          product.name.en,
          product.name.ar ?? "",
          String(product.categoryId),
          product.pricingMode,
          product.priceFils === null ? "" : toAed(product.priceFils).toFixed(2),
          product.trackInventory ? product.stock : "not tracked",
          product.status,
          product.ratingAvg,
          product.reviewCount,
        ]),
      ];
      break;
    }

    case "customers": {
      const customers = await Customer.find({ createdAt: { $gte: from } })
        .sort({ createdAt: -1 })
        .lean();
      name = "customers";
      rows = [
        ["Email", "Name", "Phone", "Addresses", "Joined", "Status"],
        ...customers.map((customer) => [
          customer.email,
          customer.name ?? "",
          customer.phone ?? "",
          customer.addresses.length,
          new Date(customer.createdAt).toISOString().slice(0, 10),
          customer.status,
        ]),
      ];
      break;
    }

    case "items": {
      const orders = await Order.find({ paymentStatus: "paid", paidAt: { $gte: from } })
        .sort({ paidAt: -1 })
        .lean<OrderDoc[]>();
      name = "order-items";
      rows = [
        ["Order", "Date", "SKU", "Product", "Qty", "Unit AED", "Discount AED", "Line total AED"],
        ...orders.flatMap((order) =>
          order.items.map((item) => [
            order.orderNumber,
            order.paidAt ? new Date(order.paidAt).toISOString().slice(0, 10) : "",
            item.sku,
            item.name.en,
            item.qty,
            toAed(item.unitPriceFils).toFixed(2),
            toAed(item.discountFils).toFixed(2),
            toAed(item.lineTotalFils).toFixed(2),
          ]),
        ),
      ];
      break;
    }

    default: {
      const orders = await Order.find({ paidAt: { $gte: from } })
        .sort({ paidAt: -1 })
        .lean<OrderDoc[]>();
      name = "orders";
      rows = [
        [
          "Order", "Date", "Customer", "Email", "Emirate", "Items",
          "Subtotal AED", "Discounts AED", "Coupon", "Coupon AED",
          "Shipping AED", "Tax AED", "Total AED", "Payment", "Stage", "Invoice",
        ],
        ...orders.map((order) => [
          order.orderNumber,
          order.paidAt ? new Date(order.paidAt).toISOString().slice(0, 10) : "",
          order.shippingAddress.fullName,
          order.email,
          order.shippingAddress.emirate,
          order.items.reduce((total, item) => total + item.qty, 0),
          toAed(order.subtotalFils).toFixed(2),
          toAed(order.productDiscountFils).toFixed(2),
          order.couponCode ?? "",
          toAed(order.couponDiscountFils).toFixed(2),
          toAed(order.shippingFils).toFixed(2),
          toAed(order.taxFils).toFixed(2),
          toAed(order.grandTotalFils).toFixed(2),
          order.paymentStatus,
          order.fulfillmentStatus,
          order.invoiceNumber ?? "",
        ]),
      ];
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // A BOM would help Excel with Arabic, but breaks other readers; the
      // export is ASCII-safe apart from names, which modern Excel handles.
      "Content-Disposition": `attachment; filename="herbedia-${name}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
