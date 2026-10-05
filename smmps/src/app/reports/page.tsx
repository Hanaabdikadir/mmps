import { redirect } from "next/navigation";

/** Old public URL — Compare Prices is no longer in the system. */
export default function ReportsRedirectPage() {
  redirect("/");
}
