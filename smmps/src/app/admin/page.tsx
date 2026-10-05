import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isCompanyAdmin,
  isCompanyUser,
  resolveCompanyAdminSlug,
} from "@/lib/auth";
import { providerMetaForSlug } from "@/lib/company-scope-server";
import { getWaterPrices } from "@/lib/water-service";
import { getElectricityPrices } from "@/lib/electricity-service";
import { CompanyAdminHome } from "@/components/admin/CompanyAdminHome";

/**
 * Company Admin only. The old system-wide /admin console is removed —
 * Super Admin uses /super-admin.
 */
export default async function AdminDashboardPage() {
  const user = await getCurrentUser("admin");
  if (!user) redirect("/login?mode=admin");
  if (!isCompanyAdmin(user) && !isCompanyUser(user)) {
    redirect("/login?mode=admin");
  }

  const slug = resolveCompanyAdminSlug(user);
  const meta = slug ? providerMetaForSlug(slug) : null;
  const companyName = meta && "name" in meta ? String(meta.name) : "";
  let ownPriceCount = 0;
  try {
    const [water, electricity] = await Promise.all([
      getWaterPrices(),
      getElectricityPrices(),
    ]);
    const needles = [companyName]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    const match = (providerName: string) => {
      const n = providerName.toLowerCase();
      return needles.some((x) => n === x || n.includes(x) || x.includes(n));
    };
    ownPriceCount =
      water.records.filter((r) => match(r.providerName)).length +
      electricity.records.filter((r) => match(r.providerName)).length;
  } catch {
    ownPriceCount = 0;
  }

  return (
    <CompanyAdminHome
      user={{ ...user, companySlug: slug || user.companySlug }}
      ownPriceCount={ownPriceCount}
    />
  );
}
