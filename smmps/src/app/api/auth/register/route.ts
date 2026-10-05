import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbTimeout } from "@/lib/db-timeout";
import { hashPassword } from "@/lib/auth";
import {
  saveRegistrationDocument,
  saveRegistrationCompanyLogo,
  RegistrationUploadError,
} from "@/lib/registration-upload";
import {
  isCompanyRegistrationSector,
  REGISTRATION_COMPANY_LOGO_FIELD,
  REGISTRATION_DOCUMENT_FORM_PREFIX,
  requiredDocumentIds,
  type CompanyRegistrationSector,
  type RegistrationDocumentId,
} from "@/lib/registration-requirements";
import {
  formatRegisteredCompanyLocation,
  REGISTRATION_COMPANY_COUNTRY,
  companyInfoFieldErrorMessage,
  validateCompanyInfoFields,
  type CompanyInfoFieldError,
} from "@/lib/company-registration";
import {
  ALL_LIVESTOCK_TYPES,
  isUtilityCompanyType,
  parseLivestockTypeChoices,
} from "@/lib/register-flow";
import { areRegisteredLivestockTypeChoices } from "@/lib/livestock-catalog";
import { findRegistrationLivestockMarket } from "@/lib/livestock-registration-markets";
import {
  registerErrorMessage,
  validateRegisterAccountStrings,
  type RegisterErrorCode,
} from "@/lib/register-validation";
import {
  subscriptionPlanMatches,
  isFreePlanPrice,
  planInstallmentAmount,
  planMonthSpan,
} from "@/lib/pricing-plans";

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phone?: string;
  registrationKind?: "company" | "broker";
  isCompanyLivestockBroker?: boolean;
  companyName?: string;
  companySector?: string;
  companyLocation?: string;
  companyType?: string;
  companyEstablishedDate?: string;
  companyCountry?: string;
  companyDistrict?: string;
  companyAddress?: string;
  companyLogoFileName?: string;
  companyRegistrationNumber?: string;
  companyEmail?: string;
  contactRole?: string;
  documentFileName?: string;
  registrationDocuments?: string;
  marketId?: number;
  marketIds?: number[];
};

function errorJson(code: RegisterErrorCode, status = 400) {
  return NextResponse.json(
    { error: registerErrorMessage(code, "en"), code },
    { status }
  );
}

function companyInfoToRegisterCode(
  code: CompanyInfoFieldError
): RegisterErrorCode {
  return code as RegisterErrorCode;
}

async function saveRegistrationDocuments(
  form: FormData,
  sector: CompanyRegistrationSector,
  options: { required: boolean; optionalIds?: RegistrationDocumentId[] }
): Promise<string> {
  const ids = requiredDocumentIds(sector);
  if (ids.length === 0) {
    return "{}";
  }

  const stored: Partial<Record<RegistrationDocumentId, string>> = {};
  const optional = new Set(options.optionalIds ?? []);

  for (const id of ids) {
    const entry = form.get(`${REGISTRATION_DOCUMENT_FORM_PREFIX}${id}`);
    if (entry instanceof File && entry.size > 0) {
      stored[id] = await saveRegistrationDocument(entry);
    } else if (options.required && !optional.has(id)) {
      throw new RegistrationUploadError("docsRequired");
    }
  }

  if (options.required) {
    for (const id of ids) {
      if (optional.has(id)) continue;
      if (!stored[id]?.trim()) {
        throw new RegistrationUploadError("docsRequired");
      }
    }
  }

  const record: Record<string, string> = { ...(stored as Record<string, string>) };
  const planId = Number(String(form.get("selectedPlanId") ?? "").trim());
  if (Number.isFinite(planId) && planId > 0) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, active: true },
    });
    if (plan) {
      record.plan_id = String(plan.id);
      record.plan_price = String(plan.price);
      record.plan_duration_days = String(plan.durationDays);
      const payMonths = Math.min(
        planMonthSpan(plan.durationDays),
        Math.max(1, Number(String(form.get("payMonths") ?? "1")) || 1)
      );
      record.paid_amount = isFreePlanPrice(plan.price)
        ? "0.00"
        : planInstallmentAmount(
            Number(plan.price),
            plan.durationDays,
            payMonths
          ).toFixed(2);
      if (!isFreePlanPrice(plan.price)) {
        record.pay_months = String(payMonths);
      }
      record.plan_name = plan.name;
      record.plan_sector = plan.accountType;
      if (plan.maxMarkets != null) record.plan_max_markets = String(plan.maxMarkets);
      if (plan.maxLivestockTypes != null) {
        record.plan_max_livestock_types = String(plan.maxLivestockTypes);
      }
    }
  }

  const marketIdsRaw = String(form.get("marketIds") ?? "").trim();
  if (marketIdsRaw) {
    const ids = [
      ...new Set(
        marketIdsRaw
          .split(/[|,]/)
          .map(Number)
          .filter((id) => Number.isFinite(id) && id > 0)
      ),
    ];
    if (ids.length) record.market_ids = ids.join(",");
  }

  const paymentMethodRaw = String(form.get("paymentMethod") ?? "")
    .trim()
    .toLowerCase();
  if (
    paymentMethodRaw === "evc" ||
    paymentMethodRaw === "mastercard" ||
    paymentMethodRaw === "visa"
  ) {
    record.payment_method = paymentMethodRaw;
  }
  if (paymentMethodRaw === "mastercard" || paymentMethodRaw === "visa") {
    const cardHolder = String(form.get("cardHolder") ?? "").trim().slice(0, 80);
    const cardLast4 = String(form.get("cardLast4") ?? "").replace(/\D/g, "").slice(-4);
    const cardExpiry = String(form.get("cardExpiry") ?? "").trim().slice(0, 7);
    if (cardHolder) record.payment_card_holder = cardHolder;
    if (cardLast4.length === 4) record.payment_card_last4 = cardLast4;
    if (cardExpiry) record.payment_card_expiry = cardExpiry;
  }
  if (paymentMethodRaw === "evc") {
    const tx = String(form.get("evcTransactionId") ?? "").trim();
    const ref = String(form.get("evcReferenceId") ?? "").trim();
    const accountNo = String(form.get("evcAccountNo") ?? "").trim();
    const amount = String(form.get("evcAmount") ?? "").trim();
    const token = String(form.get("evcReceiptToken") ?? "").trim();
    const phone = String(form.get("evcPhone") ?? "").trim();
    if (tx) record.evc_transaction_id = tx;
    if (ref) record.evc_reference_id = ref;
    if (accountNo) record.evc_account_no = accountNo;
    if (amount) record.evc_amount = amount;
    if (token) record.evc_receipt_token = token;
    if (phone) record.evc_phone = phone;
  }

  return JSON.stringify(record);
}

function parseFormBoolean(value: FormDataEntryValue | null): boolean {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

async function parseRegisterPayload(request: Request): Promise<RegisterPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const registrationKindRaw = String(form.get("registrationKind") ?? "company");
    const registrationKind =
      registrationKindRaw === "broker" ? "broker" : "company";
    const companySector = String(form.get("companySector") ?? "") || undefined;
    const isCompanyLivestockBroker =
      registrationKind === "broker" &&
      parseFormBoolean(form.get("isCompanyLivestockBroker"));
    let registrationDocuments: string | undefined;
    let documentFileName: string | undefined;
    let companyLogoFileName: string | undefined;

    const logoEntry = form.get(REGISTRATION_COMPANY_LOGO_FIELD);
    if (logoEntry instanceof File && logoEntry.size > 0) {
      companyLogoFileName = await saveRegistrationCompanyLogo(logoEntry);
    }

    const requiresDocuments =
      registrationKind === "company" ||
      (registrationKind === "broker" && isCompanyLivestockBroker);

    if (companySector && isCompanyRegistrationSector(companySector)) {
      if (requiresDocuments) {
        registrationDocuments = await saveRegistrationDocuments(form, companySector, {
          required: true,
          optionalIds: registrationKind === "broker" ? ["personal_photo"] : [],
        });
      } else if (registrationKind === "broker") {
        registrationDocuments = await saveRegistrationDocuments(form, companySector, {
          required: false,
        });
      }

      if (registrationDocuments && registrationDocuments !== "{}") {
        try {
          const parsed = JSON.parse(registrationDocuments) as Record<string, string>;
          documentFileName =
            parsed.business_license ??
            parsed.id_passport ??
            parsed.payment_receipt ??
            parsed.personal_photo;
        } catch {
          documentFileName = undefined;
        }
      } else if (registrationDocuments === "{}") {
        registrationDocuments = undefined;
      }
    }

    return {
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      confirmPassword: String(form.get("confirmPassword") ?? ""),
      phone: String(form.get("phone") ?? "") || undefined,
      registrationKind,
      isCompanyLivestockBroker,
      companyName: String(form.get("companyName") ?? "") || undefined,
      companySector,
      companyLocation: String(form.get("companyLocation") ?? "") || undefined,
      companyType: String(form.get("companyType") ?? "").trim() || undefined,
      companyEstablishedDate:
        String(form.get("companyEstablishedDate") ?? "").trim() || undefined,
      companyCountry:
        String(form.get("companyCountry") ?? "").trim() || REGISTRATION_COMPANY_COUNTRY,
      companyDistrict: String(form.get("companyDistrict") ?? "").trim() || undefined,
      companyAddress: String(form.get("companyAddress") ?? "").trim() || undefined,
      companyLogoFileName,
      companyRegistrationNumber:
        String(form.get("companyRegistrationNumber") ?? "").trim() || undefined,
      companyEmail:
        String(form.get("companyEmail") ?? "")
          .trim()
          .toLowerCase() || undefined,
      contactRole: String(form.get("contactRole") ?? "").trim() || undefined,
      documentFileName,
      registrationDocuments,
      marketId: (() => {
        const raw = String(form.get("marketId") ?? "").trim();
        const id = raw ? Number(raw) : NaN;
        return Number.isFinite(id) && id > 0 ? id : undefined;
      })(),
      marketIds: (() => {
        const raw = String(form.get("marketIds") ?? form.get("marketId") ?? "").trim();
        if (!raw) return undefined;
        const ids = [
          ...new Set(
            raw
              .split(/[|,]/)
              .map(Number)
              .filter((id) => Number.isFinite(id) && id > 0)
          ),
        ];
        return ids.length ? ids : undefined;
      })(),
    };
  }

  const body = (await request.json()) as Partial<RegisterPayload>;
  return {
    fullName: body.fullName ?? "",
    email: body.email ?? "",
    password: body.password ?? "",
    confirmPassword: body.confirmPassword ?? "",
    phone: body.phone,
    registrationKind: body.registrationKind === "broker" ? "broker" : "company",
    isCompanyLivestockBroker: Boolean(body.isCompanyLivestockBroker),
    companyName: body.companyName,
    companySector: body.companySector,
    companyLocation: body.companyLocation,
    companyType: body.companyType,
    companyEstablishedDate: body.companyEstablishedDate,
    companyCountry: body.companyCountry,
    companyDistrict: body.companyDistrict,
    companyAddress: body.companyAddress,
    companyLogoFileName: body.companyLogoFileName,
    companyRegistrationNumber: body.companyRegistrationNumber,
    companyEmail: body.companyEmail,
    contactRole: body.contactRole,
    documentFileName: body.documentFileName,
    registrationDocuments: body.registrationDocuments,
    marketId:
      body.marketId != null && Number.isFinite(Number(body.marketId))
        ? Number(body.marketId)
        : undefined,
    marketIds: Array.isArray(body.marketIds)
      ? [
          ...new Set(
            body.marketIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
          ),
        ]
      : undefined,
  };
}

function normalizePhone(phone?: string): string | undefined {
  const trimmed = phone?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("+")) return trimmed;
  return `+252 ${trimmed.replace(/\s+/g, "")}`;
}

export async function POST(request: Request) {
  try {
    const {
      fullName,
      email,
      password,
      confirmPassword = "",
      phone,
      registrationKind = "company",
      isCompanyLivestockBroker = false,
      companyName,
      companySector,
      companyLocation,
      companyType,
      companyEstablishedDate,
      companyCountry,
      companyDistrict,
      companyAddress,
      companyLogoFileName,
      companyRegistrationNumber,
      companyEmail,
      contactRole,
      documentFileName,
      registrationDocuments: registrationDocumentsRaw,
      marketId,
      marketIds: rawMarketIds,
    } = await parseRegisterPayload(request);

    let registrationDocuments = registrationDocumentsRaw;

    const isBroker = registrationKind === "broker";
    const selectedMarketIds = [
      ...new Set(
        (rawMarketIds?.length
          ? rawMarketIds
          : marketId
            ? [marketId]
            : []
        ).filter((id) => Number.isFinite(id) && id > 0)
      ),
    ];
    const primaryMarketId = selectedMarketIds[0];

    const accountError = validateRegisterAccountStrings({
      fullName,
      email,
      phone: phone ?? "",
      password,
      confirmPassword,
    });
    if (accountError) {
      return errorJson(accountError);
    }

    if (!companyName?.trim()) {
      return errorJson(isBroker ? "selectOptionError" : "companyNameRequired");
    }

    if (!companySector || !isCompanyRegistrationSector(companySector)) {
      return errorJson("selectOptionError");
    }

    const chosenPlanId = (() => {
      if (!registrationDocuments) return null;
      try {
        const id = Number(
          (JSON.parse(registrationDocuments) as { plan_id?: unknown }).plan_id
        );
        return Number.isFinite(id) && id > 0 ? id : null;
      } catch {
        return null;
      }
    })();
    if (!chosenPlanId) {
      return NextResponse.json(
        {
          error: "Select an active subscription plan added by Super Admin.",
          code: "selectOptionError",
        },
        { status: 400 }
      );
    }

    const chosenPlan = await prisma.subscriptionPlan.findFirst({
      where: { id: chosenPlanId, active: true },
    });
    if (
      !chosenPlan ||
      !subscriptionPlanMatches(
        chosenPlan.accountType,
        companySector,
        isBroker ? "broker" : "company",
        chosenPlan.durationDays
      )
    ) {
      return NextResponse.json(
        {
          error: "Select an active subscription plan for this account.",
          code: "selectOptionError",
        },
        { status: 400 }
      );
    }

    const freePlan = isFreePlanPrice(chosenPlan.price);
    const paymentMethod = (() => {
      if (!registrationDocuments) return "";
      try {
        return String(
          (JSON.parse(registrationDocuments) as { payment_method?: unknown })
            .payment_method ?? ""
        )
          .trim()
          .toLowerCase();
      } catch {
        return "";
      }
    })();
    if (
      !freePlan &&
      paymentMethod !== "evc" &&
      paymentMethod !== "mastercard" &&
      paymentMethod !== "visa"
    ) {
      return NextResponse.json(
        {
          error: "Choose EVC, MasterCard, or Visa as the payment method.",
          code: "selectOptionError",
        },
        { status: 400 }
      );
    }
    if (!freePlan && (paymentMethod === "mastercard" || paymentMethod === "visa")) {
      const cardMeta = (() => {
        try {
          const parsed = JSON.parse(registrationDocuments || "{}") as {
            payment_card_last4?: string;
            payment_card_expiry?: string;
            payment_card_holder?: string;
          };
          return parsed;
        } catch {
          return {};
        }
      })();
      const last4 = String(cardMeta.payment_card_last4 || "").replace(/\D/g, "");
      if (last4.length !== 4 || !cardMeta.payment_card_expiry || !cardMeta.payment_card_holder) {
        return NextResponse.json(
          {
            error:
              paymentMethod === "visa"
                ? "Enter valid Visa details to continue."
                : "Enter valid MasterCard details to continue.",
            code: "selectOptionError",
          },
          { status: 400 }
        );
      }
    }
    if (!freePlan && paymentMethod === "evc") {
      const { verifyEvcReceiptToken } = await import("@/lib/evc-payment");
      const evcMeta = (() => {
        try {
          return JSON.parse(registrationDocuments || "{}") as {
            evc_transaction_id?: string;
            evc_account_no?: string;
            evc_amount?: string;
            evc_receipt_token?: string;
            pay_months?: string;
          };
        } catch {
          return {};
        }
      })();
      const tx = String(evcMeta.evc_transaction_id || "").trim();
      const accountNo = String(evcMeta.evc_account_no || "").trim();
      const token = String(evcMeta.evc_receipt_token || "").trim();
      const paidAmount = Number(evcMeta.evc_amount);
      const { planInstallmentAmount, planMonthSpan } = await import("@/lib/pricing-plans");
      const payMonths = Math.min(
        planMonthSpan(chosenPlan.durationDays),
        Math.max(1, Number(evcMeta.pay_months || 1) || 1)
      );
      const planAmount = planInstallmentAmount(
        Number(chosenPlan.price),
        chosenPlan.durationDays,
        payMonths
      );
      if (
        !tx ||
        !accountNo ||
        !token ||
        !Number.isFinite(paidAmount) ||
        Math.abs(paidAmount - planAmount) > 0.009 ||
        !verifyEvcReceiptToken({
          transactionId: tx,
          accountNo,
          amount: paidAmount,
          token,
        })
      ) {
        return NextResponse.json(
          {
            error:
              "Complete the real EVC payment first (approve the PIN on your phone).",
            code: "selectOptionError",
          },
          { status: 400 }
        );
      }
    }

    let brokerMarket: { id: number; name: string; location: string | null } | null =
      null;
    /** All selected market display names (comma-separated) for Approvals. */
    let brokerMarketsLabel = "";

    if (isBroker) {
      if (
        companySector !== "livestock" ||
        !companyType ||
        !(await areRegisteredLivestockTypeChoices(companyType))
      ) {
        return NextResponse.json(
          {
            error: "Please select one or more livestock types.",
            code: "selectOptionError",
          },
          { status: 400 }
        );
      }

      const typeParts = parseLivestockTypeChoices(companyType);
      const wantsAllTypes = typeParts.includes(ALL_LIVESTOCK_TYPES);
      if (
        chosenPlan.maxLivestockTypes != null &&
        (wantsAllTypes || typeParts.length > chosenPlan.maxLivestockTypes)
      ) {
        return NextResponse.json(
          {
            error: `This plan allows up to ${chosenPlan.maxLivestockTypes} livestock type(s).`,
            code: "selectOptionError",
          },
          { status: 400 }
        );
      }

      if (
        chosenPlan.maxMarkets != null &&
        selectedMarketIds.length > chosenPlan.maxMarkets
      ) {
        return NextResponse.json(
          {
            error: `This plan allows up to ${chosenPlan.maxMarkets} market(s).`,
            code: "selectOptionError",
          },
          { status: 400 }
        );
      }

      if (!primaryMarketId) {
        return NextResponse.json(
          {
            error: registerErrorMessage("livestockMarketRequired", "en"),
            code: "livestockMarketRequired",
          },
          { status: 400 }
        );
      }

      brokerMarket = await withDbTimeout(findRegistrationLivestockMarket(primaryMarketId));
      if (!brokerMarket) {
        return NextResponse.json(
          {
            error: registerErrorMessage("livestockMarketRequired", "en"),
            code: "livestockMarketRequired",
          },
          { status: 400 }
        );
      }

      const selectedBrokerMarkets: {
        id: number;
        name: string;
        location: string | null;
      }[] = [brokerMarket];

      // Confirm every selected market exists
      for (const mid of selectedMarketIds.slice(1)) {
        const extra = await withDbTimeout(findRegistrationLivestockMarket(mid));
        if (!extra) {
          return NextResponse.json(
            {
              error: registerErrorMessage("livestockMarketRequired", "en"),
              code: "livestockMarketRequired",
            },
            { status: 400 }
          );
        }
        selectedBrokerMarkets.push(extra);
      }

      // Persist multi-market choice (even when broker skipped document uploads)
      brokerMarketsLabel = selectedBrokerMarkets
        .map((m) => m.name.trim())
        .filter(Boolean)
        .join(", ");
      if (selectedMarketIds.length) {
        try {
          const docs = registrationDocuments
            ? (JSON.parse(registrationDocuments) as Record<string, string>)
            : {};
          docs.market_ids = selectedMarketIds.join(",");
          if (brokerMarketsLabel) docs.market_names = brokerMarketsLabel;
          registrationDocuments = JSON.stringify(docs);
        } catch {
          registrationDocuments = JSON.stringify({
            market_ids: selectedMarketIds.join(","),
            ...(brokerMarketsLabel
              ? { market_names: brokerMarketsLabel }
              : {}),
          });
        }
      }
    } else {
      if (
        (companySector !== "water" && companySector !== "electricity") ||
        !companyType ||
        !isUtilityCompanyType(companyType)
      ) {
        return NextResponse.json(
          {
            error: "Please select Water Supply or Electricity Supply company.",
            code: "selectOptionError",
          },
          { status: 400 }
        );
      }

      const companyInfoError = validateCompanyInfoFields({
        companyType,
        companyName,
        companyDistrict,
        companyAddress,
        companyEmail,
      });
      if (companyInfoError) {
        const code = companyInfoToRegisterCode(companyInfoError);
        return NextResponse.json(
          {
            error: companyInfoFieldErrorMessage(companyInfoError),
            code,
          },
          { status: 400 }
        );
      }
    }

    const requiresDocuments =
      !isBroker || Boolean(isCompanyLivestockBroker);

    if (requiresDocuments) {
      if (!registrationDocuments) {
        return errorJson("docsRequired");
      }

      try {
        const parsed = JSON.parse(registrationDocuments) as Record<string, string>;
        for (const id of requiredDocumentIds(companySector)) {
          if (freePlan && id === "payment_receipt") continue;
          if (!parsed[id]?.trim()) {
            return errorJson("docsRequired");
          }
        }
      } catch {
        return errorJson("docsRequired");
      }
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = normalizePhone(phone);
    const trimmedCompany = companyName.trim();
    const trimmedDistrict = (companyDistrict?.trim() || "").trim();
    const trimmedAddress = (
      isBroker
        ? brokerMarketsLabel ||
          companyAddress?.trim() ||
          brokerMarket?.name.trim() ||
          companyType ||
          "Livestock Market"
        : companyAddress?.trim() || ""
    ).trim();
    const trimmedLocation =
      (isBroker && brokerMarketsLabel
        ? `${brokerMarketsLabel}${
            brokerMarket?.location ? `, ${brokerMarket.location}` : ""
          }, Mogadishu, Banadir, ${REGISTRATION_COMPANY_COUNTRY}`
        : null) ||
      companyLocation?.trim() ||
      (isBroker && brokerMarket
        ? `${brokerMarket.name}${brokerMarket.location ? `, ${brokerMarket.location}` : ""}, Mogadishu, Banadir, ${REGISTRATION_COMPANY_COUNTRY}`
        : trimmedDistrict && trimmedAddress
          ? formatRegisteredCompanyLocation(trimmedDistrict, trimmedAddress)
          : `Mogadishu, Banadir, ${REGISTRATION_COMPANY_COUNTRY}`);
    const resolvedCompanyEmail =
      companyEmail?.trim().toLowerCase() || normalizedEmail;

    const profileData = {
      phone: normalizedPhone,
      companyName: trimmedCompany,
      companySector,
      companyLocation: trimmedLocation,
      companyType: companyType!.trim(),
      companyEstablishedDate: companyEstablishedDate?.trim() || undefined,
      companyCountry: companyCountry?.trim() || REGISTRATION_COMPANY_COUNTRY,
      companyDistrict: trimmedDistrict || undefined,
      companyAddress: trimmedAddress || undefined,
      companyLogoFileName: companyLogoFileName?.trim(),
      companyRegistrationNumber: companyRegistrationNumber?.trim() || undefined,
      companyEmail: resolvedCompanyEmail,
      contactRole:
        contactRole?.trim() ||
        (isBroker
          ? isCompanyLivestockBroker
            ? "Company Livestock Broker"
            : "Livestock Market Broker"
          : "Company Admin / Signatory"),
      documentFileName: documentFileName?.trim() || undefined,
      registrationDocuments: registrationDocuments ?? undefined,
      ...(isBroker && brokerMarket ? { marketId: brokerMarket.id } : {}),
    };

    try {
      const existing = await withDbTimeout(
        prisma.user.findUnique({
          where: { email: normalizedEmail },
        })
      );
      if (existing) {
        return errorJson("emailAlreadyRegistered", 409);
      }

      const hashed = await hashPassword(password);
      const user = await withDbTimeout(
        prisma.user.create({
          data: {
            fullName: fullName.trim(),
            email: normalizedEmail,
            password: hashed,
            role: "REGISTERED",
            status: "PENDING",
            ...profileData,
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            companyName: true,
            companySector: true,
            companyLocation: true,
            documentFileName: true,
            role: true,
            status: true,
            createdAt: true,
          },
        })
      );

      try {
        const { createNotification } = await import("@/lib/notifications");
        await createNotification({
          userId: user.id,
          title: "Registration received",
          message:
            "We received your MMPS application. An admin will review your documents. You will get a notification here if a file needs to be updated.",
          type: "GENERAL",
          sector: "account",
        });
      } catch {
        // never block registration
      }

      try {
        const { addRegistrationTimelineEvent } = await import(
          "@/lib/registration-tracking"
        );
        const now = user.createdAt ?? new Date();
        await addRegistrationTimelineEvent({
          userId: user.id,
          eventType: "SUBMITTED",
          title: "Application submitted",
          detail: null,
          statusLabel: "Submitted",
          actorLabel: null,
          at: now,
        });
        await addRegistrationTimelineEvent({
          userId: user.id,
          eventType: "UNDER_REVIEW",
          title: "Application review started",
          detail: null,
          statusLabel: "Under Review",
          actorLabel: "MMPS Administration",
          at: new Date(now.getTime() + 1000),
        });
      } catch {
        // never block registration
      }

      try {
        const { ensureWelcomeMessage } = await import(
          "@/lib/registration-messages"
        );
        await ensureWelcomeMessage(user.id);
      } catch {
        // never block registration
      }

      try {
        const { createVerificationCode } = await import(
          "@/lib/verification-service"
        );
        const verifyResult = await createVerificationCode(user.id, normalizedEmail);
        if ("code" in verifyResult) {
          console.log(`[Registration] Verification code created for ${normalizedEmail}`);
        }
      } catch {
        console.warn("[Registration] Failed to create verification code");
      }

      try {
        const { notifySuperAdmin } = await import(
          "@/lib/system-notifications-store"
        );
        const sector =
          companySector === "electricity"
            ? "electricity"
            : companySector === "livestock"
              ? "livestock"
              : "water";
        await notifySuperAdmin({
          title: isBroker
            ? "New livestock broker registration - Needs Verification"
            : "New company registration - Needs Verification",
          message: `${trimmedCompany} (${normalizedEmail}) submitted a registration request and requires verification before approval.`,
          sector,
          href: "/super-admin/approvals",
        });
      } catch {
        // never block registration
      }

      try {
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/super-admin/approvals");
        revalidatePath("/super-admin/notifications");
        revalidatePath("/super-admin");
      } catch {
        // ignore
      }

      return NextResponse.json(
        {
          pending: true,
          message:
            "Registration submitted. An administrator must approve your account before you can sign in.",
          user,
        },
        { status: 201 }
      );
    } catch (dbError) {
      console.error("[auth/register] Database unavailable:", dbError);
      return NextResponse.json(
        {
          error: "Registration service is temporarily unavailable",
          code: "registrationFailed",
        },
        { status: 503 }
      );
    }
  } catch (error) {
    if (error instanceof RegistrationUploadError) {
      return errorJson(error.code);
    }
    const message =
      error instanceof Error ? error.message : "Registration failed";
    console.error("[auth/register]", error);
    return NextResponse.json(
      { error: message, code: "registrationFailed" },
      { status: 500 }
    );
  }
}
