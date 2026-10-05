import { redirect } from "next/navigation";

/** Public electricity analytics charts were removed from the public site. */
export default function ElectricityAnalyticsRemovedPage() {
  redirect("/electricity");
}
