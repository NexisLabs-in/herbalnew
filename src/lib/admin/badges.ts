import "server-only";
import { connectDb } from "../db";
import { ContactMessage } from "../models/ContactMessage";
import { Order } from "../models/Order";
import { PriceEnquiry } from "../models/PriceEnquiry";
import { Product } from "../models/Product";
import { Review } from "../models/Review";
import { can } from "../permissions";
import { getSettings } from "../settings";

/** The counts on the admin navigation.
 *
 *  Computed here, once, for whatever page is being rendered — rather than by
 *  each page passing in the ones it happened to calculate. That was the earlier
 *  arrangement and it meant the badges changed depending on where you stood:
 *  the enquiries count only appeared once you were already looking at
 *  enquiries, which is exactly when you no longer need telling.
 *
 *  Only counts the admin is allowed to see. A badge on a nav item their role
 *  hides would be pointing at a door they cannot open, and the count itself
 *  leaks how much is going on in a part of the shop they were not given.
 */
export type AdminBadges = {
  newOrders?: number;
  pendingReviews?: number;
  newEnquiries?: number;
  lowStock?: number;
  newMessages?: number;
};

export async function getAdminBadges(permissions: readonly string[]): Promise<AdminBadges> {
  try {
    await connectDb();

    const wants = {
      orders: can(permissions, "orders:read"),
      reviews: can(permissions, "reviews:read"),
      enquiries: can(permissions, "enquiries:read"),
      inventory: can(permissions, "inventory:read"),
      messages: can(permissions, "messages:read"),
    };

    // Indexed counts, and only the ones this admin can act on.
    const [newOrders, pendingReviews, newEnquiries, lowStock, newMessages] = await Promise.all([
      wants.orders
        ? Order.countDocuments({ fulfillmentStatus: "new", paymentStatus: "paid" })
        : Promise.resolve(0),
      wants.reviews ? Review.countDocuments({ status: "pending" }) : Promise.resolve(0),
      wants.enquiries ? PriceEnquiry.countDocuments({ status: "new" }) : Promise.resolve(0),
      wants.inventory
        ? getSettings().then((settings) =>
            Product.countDocuments({
              trackInventory: true,
              status: "published",
              stock: { $lte: settings.inventory.lowStockThreshold },
            }),
          )
        : Promise.resolve(0),
      wants.messages ? ContactMessage.countDocuments({ status: "new" }) : Promise.resolve(0),
    ]);

    return { newOrders, pendingReviews, newEnquiries, lowStock, newMessages };
  } catch (error) {
    // A badge is not worth failing a page for. Without counts the navigation
    // still works; without the page an admin cannot do their job.
    console.error("[admin] could not read navigation counts", error);
    return {};
  }
}
