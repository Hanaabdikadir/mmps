import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, isCompanyAdmin, isCompanyUser } from "@/lib/auth";
import { SessionIdleGuard } from "@/components/auth/SessionIdleGuard";
import { LanguageProvider } from "@/lib/language-context";
import { parseLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser("admin");
  if (!user) redirect("/login?mode=admin");
  if (!isCompanyAdmin(user) && !isCompanyUser(user)) {
    redirect("/login?mode=admin");
  }

  const initialLang = parseLang((await cookies()).get("mmps-lang")?.value);

  return (
    <LanguageProvider initialLang={initialLang}>
      <SessionIdleGuard loginHref="/login?mode=admin" portal="admin" />
      {children}
    </LanguageProvider>
  );
}
