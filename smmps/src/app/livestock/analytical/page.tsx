import { redirect } from "next/navigation";

/** Old analytics URL — removed with public Lab/Dhedig charts. */
export default function LivestockAnalyticalRedirectPage() {
  redirect("/livestock");
}
