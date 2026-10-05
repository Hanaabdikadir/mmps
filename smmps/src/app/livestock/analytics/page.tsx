import { redirect } from "next/navigation";

/** Public Lab/Dhedig analytics charts were removed — current flow is Birimo/Sugunto → markets. */
export default function LivestockAnalyticsRemovedPage() {
  redirect("/livestock");
}
