import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, isCompanyAdmin } from "@/lib/auth";
import { parseLang } from "@/lib/lang";
import { prisma } from "@/lib/prisma";
import { CompanyDocumentsPanel } from "@/components/company/CompanyDocumentsPanel";

export const dynamic = "force-dynamic";

export default async function CompanyDocumentsPage() {
  const lang = parseLang((await cookies()).get("mmps-lang")?.value);
  const so = lang === "so";
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isCompanyAdmin(user)) redirect("/dashboard");

  let companyId = user.companyId;
  if (!companyId && user.companySlug) {
    const company = await prisma.company.findUnique({
      where: { slug: user.companySlug },
      select: { id: true },
    });
    companyId = company?.id ?? null;
  }

  if (!companyId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        {so ? "Shirkad weli kuma xirna akoonkaaga." : "No company is linked to your account yet."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">{so ? "Dukumentiyada" : "Documents"}</h2>
        <p className="text-sm text-slate-500">{so ? "Dukumentiyada gaarka ah ee shirkadda" : "Private company documents"}</p>
      </div>
      <CompanyDocumentsPanel companyId={companyId} />
    </div>
  );
}
