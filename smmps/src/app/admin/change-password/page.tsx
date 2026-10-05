import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminChangePasswordPage() {
  redirect("/admin?tab=password");
}
