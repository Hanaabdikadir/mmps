import { redirect } from "next/navigation";

/** Legacy route — applicants now sign in to /account for progress. */
export default function PendingApprovalPage() {
  redirect("/login");
}
