import { redirect } from "next/navigation";

/** Legacy data-entry deep link — company admins use their dashboard. */
export default function AdminEntryRedirect() {
  redirect("/admin");
}
