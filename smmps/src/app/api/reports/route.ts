import { NextResponse } from "next/server";
import { getCurrentUser, checkPermission, isCompanyAdmin, isSuperAdmin } from "@/lib/auth";
import { generateReport, type ReportFilters } from "@/lib/report-engine";
import { prisma } from "@/lib/prisma";
import { getAccountPlanTier } from "@/lib/subscriptions";
import type { AuthUser } from "@/lib/auth";

function filtersFromSearchParams(searchParams: URLSearchParams): ReportFilters {
  return {
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
    sector: searchParams.get("sector") as ReportFilters["sector"],
    status: searchParams.get("status") as ReportFilters["status"],
    sectionId: searchParams.get("sectionId"),
    company: searchParams.get("company"),
    provider: searchParams.get("provider"),
  };
}

/** Detailed reports require 1-year (premium) plan for company admins. */
async function companyReportsAllowed(user: AuthUser): Promise<boolean> {
  if (isSuperAdmin(user)) return true;
  if (!isCompanyAdmin(user) || !user.companyId) return true;
  const access = await getAccountPlanTier({ companyId: user.companyId });
  return access.tier === "premium";
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !checkPermission(user, "VIEW_REPORTS")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!(await companyReportsAllowed(user))) {
      return NextResponse.json(
        { error: "Detailed reports require the 1 Year plan" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    if (searchParams.get("catalog") === "sections") {
      const sections = await prisma.marketSection.findMany({
        where: { deletedAt: null, status: "ACTIVE" },
        include: {
          market: { select: { id: true, name: true, marketType: true } },
        },
        orderBy: [{ market: { name: "asc" } }, { name: "asc" }],
      });
      return NextResponse.json({
        sections: sections.map((s) => ({
          id: s.id,
          name: s.name,
          marketId: s.marketId,
          marketName: s.market.name,
          marketType: s.market.marketType,
        })),
      });
    }

    const filters = filtersFromSearchParams(searchParams);
    const print = searchParams.get("print") === "1" || searchParams.get("print") === "true";
    const hasFilterParams = [
      "dateFrom",
      "dateTo",
      "sector",
      "status",
      "company",
      "provider",
    ].some((k) => Boolean(searchParams.get(k)));

    const report = await generateReport(user, filters);

    if (print && checkPermission(user, "PRINT_REPORTS")) {
    } else if (hasFilterParams && checkPermission(user, "FILTER_REPORTS")) {
    }

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("[api/reports GET]", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !checkPermission(user, "VIEW_REPORTS")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!(await companyReportsAllowed(user))) {
      return NextResponse.json(
        { error: "Detailed reports require the 1 Year plan" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as ReportFilters & {
      action?: "FILTER" | "PRINT" | "VIEW";
    };

    const report = await generateReport(user, body);
    const action = body.action ?? "FILTER";

    if (action === "PRINT" && checkPermission(user, "PRINT_REPORTS")) {
    } else if (action === "FILTER" && checkPermission(user, "FILTER_REPORTS")) {
    }

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("[api/reports POST]", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
