import { redirect } from "next/navigation";

/** Public water analytics charts were removed from the public site. */
export default function WaterAnalyticsRemovedPage() {
  redirect("/water");
}
