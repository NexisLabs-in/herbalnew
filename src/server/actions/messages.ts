"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { connectDb } from "@/lib/db";
import { ContactMessage } from "@/lib/models/ContactMessage";
import type { ActionState } from "@/lib/validation/shared";

/** The contact inbox. Read and archive only — replies happen by email, because
 *  building a second inbox nobody checks is worse than using the one they do. */
export async function setMessageStatus(
  messageId: string,
  status: "new" | "read" | "archived",
): Promise<ActionState> {
  const admin = await requireAdmin("messages:write");
  await connectDb();

  const message = await ContactMessage.findByIdAndUpdate(messageId, {
    $set: { status, handledBy: admin.adminId },
  });
  if (!message) return { error: "That message no longer exists." };

  revalidatePath("/admin/messages");
  return { ok: true };
}

export async function deleteMessage(messageId: string): Promise<ActionState> {
  await requireAdmin("messages:write");
  await connectDb();

  await ContactMessage.findByIdAndDelete(messageId);
  revalidatePath("/admin/messages");
  return { ok: true, notice: "Message deleted." };
}
