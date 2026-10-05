import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, isLivestockBroker } from "@/lib/auth";
import { BrokerSidebar, BrokerTopbar, BrokerShellFooter } from "@/components/broker/BrokerSidebar";
import { prisma } from "@/lib/prisma";
import { isLegacyLivestockManagerEmail } from "@/lib/livestock-manager-broker";
import { getBrokerScope } from "@/lib/livestock-scope";
import { LanguageProvider } from "@/lib/language-context";
import { parseLang } from "@/lib/lang";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function BrokerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser("broker");
  if (!user) redirect("/login");
  if (!isLivestockBroker(user)) redirect("/login");

  // Retired Livestock Manager account — Super Admin handles approvals.
  if (isLegacyLivestockManagerEmail(user.email)) {
    redirect("/login?error=manager-retired");
  }

  let rawName = user.fullName;
  let focus: string | null = null;
  let marketName = "";
  if (user.brokerId) {
    const broker = await prisma.livestockBroker
      .findUnique({
        where: { id: user.brokerId },
        select: { name: true, livestockFocus: true },
      })
      .catch(() => null);
    if (broker?.name) rawName = broker.name;
    focus = broker?.livestockFocus ?? null;
    const scope = await getBrokerScope(user.brokerId).catch(() => null);
    marketName = scope?.markets[0]?.name?.trim() || "";
  }

  const initialLang = parseLang((await cookies()).get("mmps-lang")?.value);
  const brokerName = rawName;
  const userLabel = user.fullName;

  return (
    <LanguageProvider initialLang={initialLang}>
      <div className="company-admin-shell fixed inset-0 z-[60] flex overflow-hidden bg-[#f4f6f5]">
        <Suspense fallback={<aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] bg-[#00392b] lg:flex" />}>
          <BrokerSidebar
            userEmail={user.email}
            userName={brokerName}
            userRole={user.role}
            marketName={marketName}
          />
        </Suspense>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pl-[280px]">
          <Suspense
            fallback={
              <header className="sticky top-0 z-30 h-[76px] border-b border-slate-200/90 bg-white" />
            }
          >
            <BrokerTopbar
              brokerName={brokerName}
              livestockFocus={focus}
              userEmail={user.email}
              userName={userLabel}
              userRole={user.role}
              marketName={marketName}
            />
          </Suspense>
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 lg:px-8">
            {children}
          </main>
          <BrokerShellFooter year={new Date().getFullYear()} />
        </div>
      </div>
    </LanguageProvider>
  );
}
