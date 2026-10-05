import { redirect } from "next/navigation";

/** Opens inside the company admin dashboard, same place as the broker subscription page. */
export default function CompanySubscriptionPage() {
  redirect("/admin?tab=subscription");
}
