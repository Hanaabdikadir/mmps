"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  CreditCard,
  Droplets,
  Lock,
  Mail,
  MapPin,
  Phone,
  Store,
  User,
  UserPlus,
  Zap,
  Minus,
  Plus,
  Sparkles,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthFormCard, AuthPasswordField } from "@/components/auth/auth-ui";
import {
  RegisterStepper,
  registerStepNavButtonClass,
} from "@/components/auth/RegisterStepper";
import {
  RegisterSubmissionScreen,
  REGISTER_SUBMIT_LOADING_MS,
} from "@/components/auth/RegisterSubmissionResult";
import { SYSTEM_LOGO_SRC } from "@/components/SystemLogo";
import { RegisterMarketLayout, marketInputClass } from "@/components/auth/auth-market-ui";
import {
  RegisterCompanyInfoCard,
  type RegisterCompanyInfoValues,
} from "@/components/auth/RegisterCompanyInfoCard";
import { RegistrationDocumentsStep } from "@/components/auth/RegisterRequirements";
import { RegisterSelectionCards } from "@/components/auth/RegisterSelectionCards";
import { RegisterUploadZone } from "@/components/auth/RegisterUploadZone";
import { useFileObjectUrl } from "@/hooks/use-file-object-url";
import { livestockMarketDisplayName } from "@/lib/livestock-registration-markets";
import { useLang, TRANSLATIONS } from "@/lib/language-context";
import { StablePair } from "@/components/ui/StableBilingual";
import {
  brokerDisplayName,
  livestockChoiceIdFromCatalogSlug,
  isUtilityCompanyType,
  serializeLivestockTypeChoices,
  type RegistrationKind,
  type UtilityCompanyType,
  utilityTypeToSector,
} from "@/lib/register-flow";
import {
  PAYMENT_PHONE_NUMBER,
  PAYMENT_ACCOUNT_NAME,
  PAYMENT_METHOD_OPTIONS,
  subscriptionPlanMatches,
  livestockScopeLabels,
  electricityFeatureLabels,
  waterFeatureLabels,
  isFreePlanPrice,
  planCardOrder,
  planColorName,
  planDurationChoiceLabel,
  planInstallmentAmount,
  planMonthSpan,
  planMonthlyRateLabel,
  adsIncludedLabel,
  publicPlanName,
  type PaymentMethodId,
  type PublicSubscriptionPlan,
} from "@/lib/pricing-plans";
import {
  toMastercardSafePayload,
  validateMastercardForm,
  EMPTY_MASTERCARD_FORM,
  type MastercardFormValues,
} from "@/lib/mastercard-payment";
import { MastercardPaymentForm } from "@/components/payments/MastercardPaymentForm";
import { EvcChargeForm } from "@/components/payments/EvcChargeForm";
import {
  REGISTRATION_COMPANY_LOGO_FIELD,
  REGISTRATION_DOCUMENT_FORM_PREFIX,
  requiredDocumentIds,
  type RegistrationDocumentId,
} from "@/lib/registration-requirements";
import {
  formatRegisteredCompanyLocation,
  REGISTRATION_COMPANY_COUNTRY,
} from "@/lib/company-registration";
import { LIVESTOCK_PHOTO_URLS } from "@/lib/livestock-data";
import { normalizeBanadirDistrict } from "@/lib/banadir-districts";
import {
  REGISTER_PASSWORD_MIN_LENGTH,
  docFieldKey,
  firstRegisterErrorField,
  registerErrorMessage,
  registerFieldDomId,
  resolveRegisterApiError,
  validateDocumentFile,
  validateEmailField,
  validateImageFile,
  validatePasswordField,
  validateConfirmPasswordField,
  validatePersonName,
  validatePhoneField,
  sanitizePhoneInput,
  phoneDigitCount,
  PHONE_MAX_DIGITS,
  validateRegisterDetails,
  type RegisterErrorCode,
  type RegisterFieldErrors,
  type RegisterFieldKey,
} from "@/lib/register-validation";

const primaryBtnBaseClass =
  "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition disabled:opacity-60";

const inputErrorClass =
  "border-red-300 focus:border-red-500 focus:ring-red-200 hover:border-red-300 hover:bg-red-50/20";

function Field({
  id,
  label,
  icon: Icon,
  iconClassName = "text-gray-400",
  error,
  children,
}: {
  id: string;
  label: string;
  icon: typeof User;
  iconClassName?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div data-register-field={id}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <Icon
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2",
            iconClassName
          )}
        />
        {children}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Subtle section label for the details step — not a competing H1. */
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-900/75">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const emptyCompanyInfo: RegisterCompanyInfoValues = {
  companyName: "",
  companyType: "",
  companyDistrict: "",
  companyEmail: "",
  companyAddress: "",
};

type PublicLivestockMarket = {
  id: number;
  name: string;
  location: string | null;
};

function RegisterPageContent() {
  const { lang } = useLang();
  const searchParams = useSearchParams();

  const urlPlanId = Number(searchParams?.get("plan") ?? "");
  const copy = TRANSLATIONS.register;

  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<RegistrationKind | null>(null);
  const [companyType, setCompanyType] = useState<UtilityCompanyType | null>(null);
  const [livestockSections, setLivestockSections] = useState<string[]>([]);
  const [livestockCategories, setLivestockCategories] = useState<
    {
      slug: string;
      nameEn: string;
      nameSo: string;
      imageUrl?: string | null;
    }[]
  >([]);
  const [livestockMarketIds, setLivestockMarketIds] = useState<string[]>([]);
  const [livestockMarkets, setLivestockMarkets] = useState<PublicLivestockMarket[]>(
    []
  );
  const [marketsLoading, setMarketsLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCompanyLivestockBroker, setIsCompanyLivestockBroker] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<RegisterCompanyInfoValues>(emptyCompanyInfo);
  const [photo, setPhoto] = useState<File | null>(null);
  const photoPreviewUrl = useFileObjectUrl(photo);
  const [documents, setDocuments] = useState<
    Partial<Record<RegistrationDocumentId, File | null>>
  >({});
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [subscriptionPlans, setSubscriptionPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [payMonthsByPlan, setPayMonthsByPlan] = useState<Record<number, number>>({});
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(
    Number.isFinite(urlPlanId) && urlPlanId > 0 ? urlPlanId : null
  );
  const [acceptSubscription, setAcceptSubscription] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [mastercardForm, setMastercardForm] = useState<MastercardFormValues>(
    EMPTY_MASTERCARD_FORM
  );
  const [mastercardError, setMastercardError] = useState("");
  const [evcPaid, setEvcPaid] = useState<{
    phone: string;
    transactionId: string;
    referenceId: string;
    accountNo: string;
    amount: number;
    receiptToken: string;
  } | null>(null);

  const companySector =
    kind === "company" && companyType
      ? utilityTypeToSector(companyType)
      : kind === "broker"
        ? "livestock"
        : "";

  const availablePlans = useMemo(() => {
    const sector = companySector || (kind === "broker" ? "livestock" : "");
    const registrationKind = kind === "broker" ? "broker" : "company";
    return subscriptionPlans
      .filter((plan) =>
        subscriptionPlanMatches(
          plan.accountType,
          sector,
          registrationKind,
          plan.durationDays
        )
      )
      .sort((a, b) => planCardOrder(a) - planCardOrder(b) || a.id - b.id);
  }, [subscriptionPlans, companySector, kind]);

  const selectedPricingPlan = useMemo(() => {
    return availablePlans.find((plan) => plan.id === selectedPlanId) ?? null;
  }, [availablePlans, selectedPlanId]);

  // Drop a plan that no longer matches the chosen sector (e.g. livestock → electricity).
  useEffect(() => {
    if (selectedPlanId == null || plansLoading) return;
    if (availablePlans.some((plan) => plan.id === selectedPlanId)) return;
    setSelectedPlanId(null);
    setAcceptSubscription(false);
  }, [availablePlans, plansLoading, selectedPlanId]);

  const urlPlanApplied = useRef(false);
  useEffect(() => {
    if (urlPlanApplied.current || plansLoading) return;
    const plan = subscriptionPlans.find((item) => item.id === urlPlanId);
    if (!plan) return;
    urlPlanApplied.current = true;
    setSelectedPlanId(plan.id);
    const type = plan.accountType.trim().toUpperCase();
    if (type === "WATER") {
      setKind("company");
      setCompanyType("Water Supply Company");
      setStep(2);
    } else if (type === "ELECTRICITY") {
      setKind("company");
      setCompanyType("Electricity Supply Company");
      setStep(2);
    } else if (type === "LIVESTOCK" || type === "BROKER") {
      setKind("broker");
      setStep(1);
    }
  }, [plansLoading, subscriptionPlans, urlPlanId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/subscriptions/public", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { plans?: PublicSubscriptionPlan[] }) => {
        if (cancelled) return;
        setSubscriptionPlans(Array.isArray(data.plans) ? data.plans : []);
      })
      .catch(() => {
        if (!cancelled) setSubscriptionPlans([]);
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/livestock/public-catalog", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: {
        categories?: {
          slug: string;
          nameEn: string;
          nameSo: string;
          imageUrl?: string | null;
        }[];
      }) => {
        if (cancelled) return;
        setLivestockCategories(Array.isArray(data.categories) ? data.categories : []);
      })
      .catch(() => {
        if (!cancelled) setLivestockCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);



  useEffect(() => {
    if (kind !== "broker") return;
    let cancelled = false;
    setMarketsLoading(true);
    fetch("/api/markets/public")
      .then((res) => res.json())
      .then((data: { markets?: PublicLivestockMarket[] }) => {
        if (cancelled) return;
        setLivestockMarkets(Array.isArray(data.markets) ? data.markets : []);
      })
      .catch(() => {
        if (!cancelled) setLivestockMarkets([]);
      })
      .finally(() => {
        if (!cancelled) setMarketsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const sectionOptions = useMemo(
    () => [
      {
        id: "company",
        title: copy.registerAsCompany,
        subtitle: copy.registerAsCompanyHint,
        icon: Building2,
        iconActiveClass: "bg-emerald-600 text-white shadow-md shadow-emerald-300/50",
        iconIdleClass: "bg-emerald-100 text-emerald-700",
        idleCardClass: "border-emerald-200",
        idleBarClass: "bg-emerald-400",
        selectedCardClass:
          "border-emerald-500 bg-gradient-to-br from-emerald-50 to-white",
        hoverCardClass:
          "hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md hover:shadow-emerald-100",
        hoverBarClass: "group-hover:bg-emerald-600",
        checkClass: "bg-emerald-600",
        selectedTitleClass: "text-emerald-950",
      },
      {
        id: "broker",
        title: copy.registerAsBroker,
        subtitle: copy.registerAsBrokerHint,
        icon: Store,
        iconActiveClass: "bg-sky-600 text-white shadow-md shadow-sky-300/50",
        iconIdleClass: "bg-sky-100 text-sky-700",
        idleCardClass: "border-sky-200",
        idleBarClass: "bg-sky-400",
        selectedCardClass:
          "border-sky-500 bg-gradient-to-br from-sky-50 to-white",
        hoverCardClass:
          "hover:border-sky-500 hover:bg-sky-50 hover:shadow-md hover:shadow-sky-100",
        hoverBarClass: "group-hover:bg-sky-600",
        checkClass: "bg-sky-600",
        selectedTitleClass: "text-sky-950",
      },
    ],
    [copy]
  );

  const companyTypeOptions = useMemo(
    () => [
      {
        id: "Water Supply Company",
        title: copy.waterSupplyCompany,
        icon: Droplets,
        iconActiveClass: "bg-cyan-600 text-white shadow-md shadow-cyan-300/50",
        iconIdleClass: "bg-cyan-100 text-cyan-700",
        idleCardClass: "border-cyan-200",
        idleBarClass: "bg-cyan-400",
        selectedCardClass:
          "border-cyan-500 bg-gradient-to-br from-cyan-50 to-white",
        hoverCardClass:
          "hover:border-cyan-500 hover:bg-cyan-50 hover:shadow-md hover:shadow-cyan-100",
        hoverBarClass: "group-hover:bg-cyan-600",
        checkClass: "bg-cyan-600",
        selectedTitleClass: "text-cyan-950",
      },
      {
        id: "Electricity Supply Company",
        title: copy.electricitySupplyCompany,
        icon: Zap,
        iconActiveClass: "bg-orange-500 text-white shadow-md shadow-orange-300/50",
        iconIdleClass: "bg-orange-100 text-orange-600",
        idleCardClass: "border-orange-200",
        idleBarClass: "bg-orange-400",
        selectedCardClass:
          "border-orange-500 bg-gradient-to-br from-orange-50 to-white",
        hoverCardClass:
          "hover:border-orange-500 hover:bg-orange-50 hover:shadow-md hover:shadow-orange-100",
        hoverBarClass: "group-hover:bg-orange-500",
        checkClass: "bg-orange-500",
        selectedTitleClass: "text-orange-950",
      },
    ],
    [copy]
  );

  const livestockOptions = useMemo(() => {
    const palettes = [
      {
        iconActiveClass: "bg-amber-500 text-amber-950 shadow-sm shadow-amber-200",
        iconIdleClass: "bg-amber-100 text-amber-700",
        idleCardClass: "border-amber-200",
        idleBarClass: "bg-amber-400",
        selectedCardClass:
          "border-amber-500 bg-gradient-to-br from-amber-50 to-white",
        hoverCardClass:
          "hover:border-amber-500 hover:bg-amber-50 hover:shadow-md hover:shadow-amber-100",
        hoverBarClass: "group-hover:bg-amber-500",
        checkClass: "bg-amber-500",
        selectedTitleClass: "text-amber-950",
      },
      {
        iconActiveClass: "bg-teal-600 text-teal-50 shadow-sm shadow-teal-200",
        iconIdleClass: "bg-teal-100 text-teal-700",
        idleCardClass: "border-teal-200",
        idleBarClass: "bg-teal-400",
        selectedCardClass:
          "border-teal-500 bg-gradient-to-br from-teal-50 to-white",
        hoverCardClass:
          "hover:border-teal-500 hover:bg-teal-50 hover:shadow-md hover:shadow-teal-100",
        hoverBarClass: "group-hover:bg-teal-600",
        checkClass: "bg-teal-600",
        selectedTitleClass: "text-teal-950",
      },
      {
        iconActiveClass: "bg-violet-600 text-violet-50 shadow-sm shadow-violet-200",
        iconIdleClass: "bg-violet-100 text-violet-700",
        idleCardClass: "border-violet-200",
        idleBarClass: "bg-violet-400",
        selectedCardClass:
          "border-violet-500 bg-gradient-to-br from-violet-50 to-white",
        hoverCardClass:
          "hover:border-violet-500 hover:bg-violet-50 hover:shadow-md hover:shadow-violet-100",
        hoverBarClass: "group-hover:bg-violet-600",
        checkClass: "bg-violet-600",
        selectedTitleClass: "text-violet-950",
      },
      {
        iconActiveClass: "bg-sky-600 text-sky-50 shadow-sm shadow-sky-200",
        iconIdleClass: "bg-sky-100 text-sky-700",
        idleCardClass: "border-sky-200",
        idleBarClass: "bg-sky-400",
        selectedCardClass:
          "border-sky-500 bg-gradient-to-br from-sky-50 to-white",
        hoverCardClass:
          "hover:border-sky-500 hover:bg-sky-50 hover:shadow-md hover:shadow-sky-100",
        hoverBarClass: "group-hover:bg-sky-600",
        checkClass: "bg-sky-600",
        selectedTitleClass: "text-sky-950",
      },
    ] as const;

    const fallback = [
      {
        slug: "geel",
        nameEn: copy.camelMarketSection.en,
        nameSo: copy.camelMarketSection.so,
        imageUrl: LIVESTOCK_PHOTO_URLS.geel,
      },
      {
        slug: "loda",
        nameEn: copy.cattleMarketSection.en,
        nameSo: copy.cattleMarketSection.so,
        imageUrl: LIVESTOCK_PHOTO_URLS.loda,
      },
      {
        slug: "arri",
        nameEn: copy.goatMarketSection.en,
        nameSo: copy.goatMarketSection.so,
        imageUrl: LIVESTOCK_PHOTO_URLS.arri,
      },
    ];
    const rows = livestockCategories.length ? livestockCategories : fallback;
    return rows.map((cat, i) => {
      const palette = palettes[i % palettes.length];
      const photo =
        cat.imageUrl?.trim() ||
        (cat.slug === "geel"
          ? LIVESTOCK_PHOTO_URLS.geel
          : cat.slug === "loda"
            ? LIVESTOCK_PHOTO_URLS.loda
            : cat.slug === "arri"
              ? LIVESTOCK_PHOTO_URLS.arri
              : LIVESTOCK_PHOTO_URLS.marketHero);
      return {
        id: livestockChoiceIdFromCatalogSlug(cat.slug),
        title: { en: cat.nameEn, so: cat.nameSo },
        photo,
        ...palette,
      };
    });
  }, [copy, livestockCategories]);

  const livestockMarketOptions = useMemo(
    () =>
      livestockMarkets.map((market, index) => {
        const accents = [
          {
            icon: "text-emerald-600",
            row: "bg-emerald-50 text-emerald-800",
          },
          {
            icon: "text-amber-600",
            row: "bg-amber-50 text-amber-800",
          },
          {
            icon: "text-teal-600",
            row: "bg-teal-50 text-teal-800",
          },
          {
            icon: "text-orange-600",
            row: "bg-orange-50 text-orange-800",
          },
          {
            icon: "text-green-600",
            row: "bg-green-50 text-green-800",
          },
        ][index % 5];
        return {
          value: String(market.id),
          label: livestockMarketDisplayName(market.name, lang),
          icon: MapPin,
          iconClassName: accents.icon,
          rowClassName: accents.row,
        };
      }),
    [livestockMarkets, lang]
  );

  const selectedLivestockMarkets = useMemo(
    () =>
      livestockMarkets.filter((market) =>
        livestockMarketIds.includes(String(market.id))
      ),
    [livestockMarkets, livestockMarketIds]
  );
  const selectedLivestockMarket = selectedLivestockMarkets[0] ?? null;
  const selectedPayMonths = selectedPricingPlan
    ? Math.min(
        planMonthSpan(selectedPricingPlan.durationDays),
        Math.max(1, payMonthsByPlan[selectedPricingPlan.id] || 1)
      )
    : 1;
  const selectedDue = selectedPricingPlan
    ? planInstallmentAmount(
        Number(selectedPricingPlan.price),
        selectedPricingPlan.durationDays,
        selectedPayMonths
      )
    : 0;
  const isFreeSelectedPlan = selectedPricingPlan
    ? isFreePlanPrice(selectedPricingPlan.price)
    : false;
  const maxMarketsAllowed = selectedPricingPlan?.maxMarkets ?? null;
  const maxTypesAllowed = selectedPricingPlan?.maxLivestockTypes ?? null;

  function msg(code: RegisterErrorCode): string {
    return registerErrorMessage(code, lang);
  }

  function fieldMsg(key: RegisterFieldKey): string | undefined {
    const code = fieldErrors[key];
    return code ? msg(code) : undefined;
  }

  function clearFieldError(key: RegisterFieldKey) {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function setCompanyField<K extends keyof RegisterCompanyInfoValues>(
    key: K,
    value: RegisterCompanyInfoValues[K]
  ) {
    let nextValue = value;
    if (key === "companyDistrict" && typeof value === "string" && value) {
      const canonical = normalizeBanadirDistrict(value);
      if (canonical) nextValue = canonical as RegisterCompanyInfoValues[K];
    }
    setCompanyInfo((prev) => ({ ...prev, [key]: nextValue }));
    const map: Partial<Record<keyof RegisterCompanyInfoValues, RegisterFieldKey>> = {
      companyName: "companyName",
      companyType: "companyType",
      companyDistrict: "companyDistrict",
      companyEmail: "companyEmail",
      companyAddress: "companyAddress",
    };
    const fieldKey = map[key];
    if (!fieldKey) return;

    // Selects: validate immediately with the new value (avoid stale state on blur)
    if (key === "companyDistrict" || key === "companyType") {
      const info = { ...companyInfo, [key]: nextValue };
      const snapshot = validateRegisterDetails({
        kind,
        firstName,
        lastName,
        email,
        phone,
        password,
        confirmPassword,
        photo,
        isCompanyLivestockBroker,
        companyType:
          key === "companyType"
            ? String(value)
            : companyType ?? undefined,
        companyName: info.companyName,
        companyDistrict: info.companyDistrict,
        companyEmail: info.companyEmail,
        companyAddress: info.companyAddress,
        sector: companySector || null,
        documents,
      });
      setFieldErrors((prev) => {
        const next = { ...prev };
        const code = snapshot?.[fieldKey];
        if (code) next[fieldKey] = code;
        else delete next[fieldKey];
        return next;
      });
      return;
    }

    if (fieldErrors[fieldKey]) {
      const info = { ...companyInfo, [key]: nextValue };
      const snapshot = validateRegisterDetails({
        kind,
        firstName,
        lastName,
        email,
        phone,
        password,
        confirmPassword,
        photo,
        isCompanyLivestockBroker,
        companyType: companyType ?? undefined,
        companyName: info.companyName,
        companyDistrict: info.companyDistrict,
        companyEmail: info.companyEmail,
        companyAddress: info.companyAddress,
        sector: companySector || null,
        documents,
      });
      setFieldErrors((prev) => {
        const next = { ...prev };
        const code = snapshot?.[fieldKey];
        if (code) next[fieldKey] = code;
        else delete next[fieldKey];
        return next;
      });
      return;
    }

    clearFieldError(fieldKey);
  }

  function setDocument(id: RegistrationDocumentId, file: File | null) {
    const key = docFieldKey(id);
    if (file) {
      const fileErr = validateDocumentFile(file);
      if (fileErr) {
        if (key) {
          setFieldErrors((prev) => ({ ...prev, [key]: fileErr }));
        }
        return;
      }
    }
    setDocuments((prev) => {
      if (file === null) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: file };
    });
    if (key) clearFieldError(key);
  }

  function handlePhotoChange(file: File | null) {
    if (file) {
      const fileErr = validateImageFile(file);
      if (fileErr) {
        setFieldErrors((prev) => ({ ...prev, photo: fileErr }));
        return;
      }
    }
    setPhoto(file);
    clearFieldError("photo");
  }

  function blurPersonName(which: "first" | "last") {
    const key: RegisterFieldKey = which === "first" ? "firstName" : "lastName";
    const code = validatePersonName(which === "first" ? firstName : lastName, which);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (code) next[key] = code;
      else delete next[key];
      return next;
    });
  }

  function blurEmail() {
    const code = validateEmailField(email);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (code) next.email = code;
      else delete next.email;
      return next;
    });
  }

  function blurPassword() {
    const code = validatePasswordField(password);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (code) next.password = code;
      else delete next.password;
      if (confirmPassword) {
        const confirmCode = validateConfirmPasswordField(password, confirmPassword);
        if (confirmCode) next.confirmPassword = confirmCode;
        else delete next.confirmPassword;
      }
      return next;
    });
  }

  function blurConfirmPassword() {
    const code = validateConfirmPasswordField(password, confirmPassword);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (code) next.confirmPassword = code;
      else delete next.confirmPassword;
      return next;
    });
  }

  function blurCompanyField(key: keyof RegisterCompanyInfoValues) {
    const snapshot = validateRegisterDetails({
      kind,
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      photo,
      isCompanyLivestockBroker,
      companyType: companyType ?? undefined,
      companyName: companyInfo.companyName,
      companyDistrict: companyInfo.companyDistrict,
      companyEmail: companyInfo.companyEmail,
      companyAddress: companyInfo.companyAddress,
      sector: companySector || null,
      documents,
    });
    const fieldMap: Partial<Record<keyof RegisterCompanyInfoValues, RegisterFieldKey>> = {
      companyName: "companyName",
      companyType: "companyType",
      companyDistrict: "companyDistrict",
      companyEmail: "companyEmail",
      companyAddress: "companyAddress",
    };
    const fieldKey = fieldMap[key];
    if (!fieldKey) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      const code = snapshot?.[fieldKey];
      if (code) next[fieldKey] = code;
      else delete next[fieldKey];
      return next;
    });
  }

  function scrollToFirstError(errors: RegisterFieldErrors) {
    const first = firstRegisterErrorField(errors);
    if (!first) return;
    const domId = registerFieldDomId(first);
    const el =
      document.getElementById(domId) ??
      document.querySelector(`[data-register-field="${first}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function toggleCompanyLivestockBroker(checked: boolean) {
    setIsCompanyLivestockBroker(checked);
    if (!checked) {
      setDocuments({});
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.doc_business_license;
        delete next.doc_id_passport;
        delete next.doc_personal_photo;
        return next;
      });
    }
  }

  function validateDetails(): boolean {
    const errors = validateRegisterDetails({
      kind,
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      photo,
      isCompanyLivestockBroker,
      companyType: companyType ?? undefined,
      companyName: companyInfo.companyName,
      companyDistrict: companyInfo.companyDistrict,
      companyEmail: companyInfo.companyEmail,
      companyAddress: companyInfo.companyAddress,
      livestockMarketId: livestockMarketIds[0] || "",
      sector: companySector || (kind === "broker" ? "livestock" : null),
      documents,
      skipPaymentReceipt: isFreeSelectedPlan,
    });

    if (errors) {
      setFieldErrors(errors);
      setError(copy.fixHighlightedFields[lang]);
      window.setTimeout(() => scrollToFirstError(errors), 50);
      return false;
    }

    if (kind === "broker") {
      if (
        maxTypesAllowed != null &&
        livestockSections.length > maxTypesAllowed
      ) {
        setError(
          lang === "so"
            ? `Qidmadan waxay oggol tahay ugu badnaan ${maxTypesAllowed} nooc xoolo.`
            : `This plan allows up to ${maxTypesAllowed} livestock type(s).`
        );
        return false;
      }
      if (
        maxMarketsAllowed != null &&
        livestockMarketIds.length > maxMarketsAllowed
      ) {
        setError(
          lang === "so"
            ? `Qidmadan waxay oggol tahay ugu badnaan ${maxMarketsAllowed} suuq.`
            : `This plan allows up to ${maxMarketsAllowed} market(s).`
        );
        return false;
      }
    }

    if (!selectedPricingPlan) {
      setError(copy.subscriptionNoPlan[lang]);
      return false;
    }

    if (!acceptSubscription) {
      setError(
        lang === "so"
          ? "Fadlan calaamadee sanduuqa xaqiijinta qidmada."
          : copy.subscriptionMustAccept[lang]
      );
      return false;
    }

    if (!isFreeSelectedPlan && !paymentMethod) {
      setError(
        lang === "so"
          ? "Dooro habka lacag-bixinta: EVC, MasterCard, ama Visa."
          : "Choose a payment method: EVC, MasterCard, or Visa."
      );
      return false;
    }

    if (
      !isFreeSelectedPlan &&
      (paymentMethod === "mastercard" || paymentMethod === "visa")
    ) {
      const cardErr = validateMastercardForm(
        mastercardForm,
        lang,
        paymentMethod === "visa" ? "visa" : "mastercard"
      );
      if (cardErr) {
        setMastercardError(cardErr);
        setError(cardErr);
        return false;
      }
      setMastercardError("");
    }

    if (!isFreeSelectedPlan && paymentMethod === "evc") {
      if (!evcPaid?.receiptToken || !evcPaid.transactionId) {
        setError(
          lang === "so"
            ? "Marka hore ku bixi EVC — geli lambarkaaga oo ansixi PIN-ka phone-ka."
            : "Pay with EVC first — enter your number and approve the PIN on your phone."
        );
        return false;
      }
      if (
        selectedPricingPlan &&
        Math.abs(evcPaid.amount - selectedDue) > 0.009
      ) {
        setError(
          lang === "so"
            ? "Qadarka lacagta EVC kuma habboona qidmada — isku day mar kale."
            : "EVC amount does not match the selected plan — pay again."
        );
        return false;
      }
    }

    setFieldErrors({});
    setError("");
    return true;
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (step === 0 || step === 1) return;
    if (step === 2) {
      if (!validateDetails()) return;
      void submitRegistration();
    }
  }

  async function submitRegistration() {
    setLoading(true);
    setError("");
    setSuccess("");

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const form = new FormData();
    form.append("fullName", fullName);
    form.append("email", email.trim());
    form.append("phone", phone.trim());
    form.append("password", password);
    form.append("confirmPassword", confirmPassword);
    form.append("registrationKind", kind ?? "company");

    if (photo) form.append(REGISTRATION_COMPANY_LOGO_FIELD, photo);

    if (kind === "broker" && livestockSections.length) {
      const livestockSection = serializeLivestockTypeChoices(livestockSections);
      form.append("companySector", "livestock");
      form.append("companyType", livestockSection);
      form.append(
        "isCompanyLivestockBroker",
        isCompanyLivestockBroker ? "1" : "0"
      );
      form.append(
        "contactRole",
        isCompanyLivestockBroker
          ? "Company Livestock Broker"
          : "Livestock Market Broker"
      );
      form.append("companyName", brokerDisplayName(fullName, livestockSection));
      form.append("companyEmail", email.trim().toLowerCase());
      form.append("companyCountry", REGISTRATION_COMPANY_COUNTRY);
      // Brokers pick a market, not a Banadir company district — never invent "Hodan".
      if (selectedLivestockMarkets.length) {
        form.append("marketId", String(selectedLivestockMarkets[0].id));
        form.append(
          "marketIds",
          selectedLivestockMarkets.map((m) => m.id).join(",")
        );
        form.append(
          "companyAddress",
          selectedLivestockMarkets.map((m) => m.name).join(", ")
        );
        const marketLoc = selectedLivestockMarkets
          .map((m) => m.location)
          .filter(Boolean)
          .join(" · ");
        const inferredDistrict = marketLoc
          ? normalizeBanadirDistrict(marketLoc)
          : null;
        if (inferredDistrict) {
          form.append("companyDistrict", inferredDistrict);
        }
        form.append(
          "companyLocation",
          `${selectedLivestockMarkets.map((m) => m.name).join(" · ")}${
            selectedLivestockMarkets[0].location
              ? `, ${selectedLivestockMarkets[0].location}`
              : ""
          }, Mogadishu, Banadir, ${REGISTRATION_COMPANY_COUNTRY}`
        );
      } else {
        form.append("companyAddress", livestockSection);
        form.append(
          "companyLocation",
          `${livestockSection}, Mogadishu, Banadir, ${REGISTRATION_COMPANY_COUNTRY}`
        );
      }
      for (const id of requiredDocumentIds("livestock")) {
        const file = documents[id];
        if (file) form.append(`${REGISTRATION_DOCUMENT_FORM_PREFIX}${id}`, file);
      }
    } else if (kind === "company" && companyType) {
      const sector = utilityTypeToSector(companyType);
      form.append("companySector", sector);
      form.append("companyType", companyType);
      form.append("companyName", companyInfo.companyName.trim());
      form.append("companyCountry", REGISTRATION_COMPANY_COUNTRY);
      form.append("companyDistrict", companyInfo.companyDistrict);
      form.append("companyAddress", companyInfo.companyAddress.trim());
      form.append("companyEmail", companyInfo.companyEmail.trim());
      form.append(
        "companyLocation",
        formatRegisteredCompanyLocation(
          companyInfo.companyDistrict,
          companyInfo.companyAddress
        )
      );
      form.append("contactRole", "Company Admin / Signatory");
      for (const id of requiredDocumentIds(sector)) {
        const file = documents[id];
        if (file) form.append(`${REGISTRATION_DOCUMENT_FORM_PREFIX}${id}`, file);
      }
    }

    // Attach selected pricing plan fields so the backend stores them in registrationDocuments.
    if (selectedPricingPlan) {
      form.append("selectedPlanId", String(selectedPricingPlan.id));
      if (!isFreePlanPrice(selectedPricingPlan.price)) {
        form.append("payMonths", String(selectedPayMonths));
      }
    }
    if (!isFreeSelectedPlan && paymentMethod) {
      form.append("paymentMethod", paymentMethod);
      if (paymentMethod === "mastercard" || paymentMethod === "visa") {
        const safe = toMastercardSafePayload(
          mastercardForm,
          paymentMethod === "visa" ? "visa" : "mastercard"
        );
        if (safe) {
          form.append("cardHolder", safe.cardHolder);
          form.append("cardLast4", safe.cardLast4);
          form.append("cardExpiry", safe.cardExpiry);
        }
      }
      if (paymentMethod === "evc" && evcPaid) {
        form.append("evcTransactionId", evcPaid.transactionId);
        form.append("evcReferenceId", evcPaid.referenceId);
        form.append("evcAccountNo", evcPaid.accountNo);
        form.append("evcAmount", String(evcPaid.amount));
        form.append("evcReceiptToken", evcPaid.receiptToken);
        form.append("evcPhone", evcPaid.phone);
      }
    }

    const started = performance.now();
    const res = await fetch("/api/auth/register", { method: "POST", body: form });
    const data = await res.json();
    const remaining = REGISTER_SUBMIT_LOADING_MS - (performance.now() - started);
    if (remaining > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remaining));
    }
    setLoading(false);

    if (!res.ok) {
      setError(resolveRegisterApiError(data, lang));
      return;
    }

    setSuccess(data.message ?? copy.registrationSubmitted[lang]);
  }

  const documentErrors = useMemo(() => {
    const out: Partial<Record<RegistrationDocumentId, string>> = {};
    for (const id of [
      "business_license",
      "id_passport",
      "personal_photo",
      "payment_receipt",
    ] as RegistrationDocumentId[]) {
      const key = docFieldKey(id);
      if (key && fieldErrors[key]) out[id] = msg(fieldErrors[key]!);
    }
    return out;
  }, [fieldErrors, lang]);

  const detailsPathLabel =
    step === 2
      ? kind === "broker" && livestockSections.length
        ? livestockOptions
          .filter((o) => livestockSections.includes(o.id))
          .map((o) => o.title[lang])
          .join(" · ") || copy.allLivestockTypes[lang]
        : kind === "company" && companyType
          ? companyTypeOptions.find((o) => o.id === companyType)?.title[lang]
          : undefined
      : undefined;

  /** Details step: no redundant "Account details" H1 — path eyebrow + helper copy. */
  const formTitle =
    step === 0
      ? copy.registrationForm[lang]
      : step === 1
        ? kind === "broker"
          ? copy.livestockMarketSection[lang]
          : copy.companyTypeForm[lang]
        : undefined;

  const formSubtitle =
    step === 0
      ? copy.selectSection[lang]
      : step === 1
        ? kind === "broker"
          ? copy.selectLivestockSection[lang]
          : copy.selectCompanyType[lang]
        : copy.completeDetails[lang];

  /* Full-viewport centered result — not the register split/hero layout */
  if (loading || success) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col">
        <RegisterSubmissionScreen
          loading={loading}
          successMessage={success}
          email={email}
        />
      </div>
    );
  }

  return (
    <RegisterMarketLayout
      tall
      registerStep={step}
      companySector={companySector}
      documents={documents}
      companyInfo={
        kind === "company"
          ? { ...companyInfo, companyType: companyType ?? "" }
          : companyInfo
      }
    >
      <AuthFormCard
        embedded
        registerPanel
        eyebrow={detailsPathLabel}
        title={formTitle}
        subtitle={formSubtitle}
      >
        <form onSubmit={handleNext} className="space-y-4" noValidate>
          <RegisterStepper current={step} />

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {step === 0 ? (
            <RegisterSelectionCards
              options={sectionOptions}
              value={null}
              showCheck={false}
              onChange={(id) => {
                setKind(id as RegistrationKind);
                setCompanyType(null);
                setLivestockSections([]);
                setLivestockMarketIds([]);
                setIsCompanyLivestockBroker(false);
                setDocuments({});
                setFieldErrors({});
                setError("");
                setStep(1);
              }}
            />
          ) : null}

          {step === 1 && kind === "company" ? (
            <RegisterSelectionCards
              options={companyTypeOptions}
              value={companyType}
              onChange={(id) => {
                if (isUtilityCompanyType(id)) {
                  setCompanyType(id);
                  setCompanyInfo((prev) => ({ ...prev, companyType: id }));
                  setDocuments({});
                  setFieldErrors({});
                  setError("");
                  setStep(2);
                }
              }}
            />
          ) : null}

          {step === 1 && kind === "broker" ? (
            <div className="space-y-4">
              <RegisterSelectionCards
                options={livestockOptions}
                values={livestockSections}
                columns={3}
                onChange={(id) => {
                  if (!livestockOptions.some((o) => o.id === id)) return;
                  setLivestockSections((prev) => {
                    if (prev.includes(id)) return prev.filter((x) => x !== id);
                    if (maxTypesAllowed != null && prev.length >= maxTypesAllowed) {
                      setError(
                        lang === "so"
                          ? `Qidmadan waxay oggol tahay ugu badnaan ${maxTypesAllowed} nooc xoolo.`
                          : `This plan allows up to ${maxTypesAllowed} livestock type(s).`
                      );
                      return prev;
                    }
                    setError("");
                    return [...prev, id];
                  });
                  setIsCompanyLivestockBroker(false);
                  setDocuments({});
                  setFieldErrors({});
                }}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    const ids = livestockOptions.map((o) => o.id);
                    if (maxTypesAllowed != null) {
                      setLivestockSections(ids.slice(0, maxTypesAllowed));
                      setError(
                        lang === "so"
                          ? `Qidmadan waxay oggol tahay ugu badnaan ${maxTypesAllowed} nooc xoolo.`
                          : `This plan allows up to ${maxTypesAllowed} livestock type(s).`
                      );
                      return;
                    }
                    const allOn =
                      ids.length > 0 && ids.every((id) => livestockSections.includes(id));
                    setLivestockSections(allOn ? [] : ids);
                    setError("");
                  }}
                  className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                >
                  {maxTypesAllowed != null
                    ? lang === "so"
                      ? `Dooro ${maxTypesAllowed}`
                      : `Select up to ${maxTypesAllowed}`
                    : copy.selectAllLivestockTypes[lang]}
                </button>
                <button
                  type="button"
                  disabled={!livestockSections.length}
                  onClick={() => {
                    if (!livestockSections.length) {
                      setError(copy.selectLivestockSection[lang]);
                      return;
                    }
                    setStep(2);
                  }}
                  className="flex-1 rounded-xl border-0 bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-600/70 disabled:text-white"
                >
                  {copy.continue[lang]}
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <FormSection title={copy.personalInfo[lang]}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    id="register-first-name"
                    label={copy.firstName[lang]}
                    icon={User}
                    iconClassName="text-emerald-600"
                    error={fieldMsg("firstName")}
                  >
                    <input
                      id="register-first-name"
                      autoComplete="given-name"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={copy.firstName[lang]}
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        clearFieldError("firstName");
                      }}
                      onBlur={() => blurPersonName("first")}
                      aria-invalid={fieldErrors.firstName ? true : undefined}
                      className={cn(
                        marketInputClass,
                        fieldErrors.firstName && inputErrorClass
                      )}
                    />
                  </Field>
                  <Field
                    id="register-last-name"
                    label={copy.lastName[lang]}
                    icon={User}
                    iconClassName="text-teal-600"
                    error={fieldMsg("lastName")}
                  >
                    <input
                      id="register-last-name"
                      autoComplete="family-name"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={copy.lastName[lang]}
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        clearFieldError("lastName");
                      }}
                      onBlur={() => blurPersonName("last")}
                      aria-invalid={fieldErrors.lastName ? true : undefined}
                      className={cn(
                        marketInputClass,
                        fieldErrors.lastName && inputErrorClass
                      )}
                    />
                  </Field>
                </div>

                <Field
                  id="register-email"
                  label={copy.email[lang]}
                  icon={Mail}
                  iconClassName="text-emerald-600"
                  error={fieldMsg("email")}
                >
                  <input
                    id="register-email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => {
                      const next = e.target.value;
                      setEmail(next);
                      if (fieldErrors.email) {
                        const code = validateEmailField(next);
                        setFieldErrors((prev) => {
                          const updated = { ...prev };
                          if (code) updated.email = code;
                          else delete updated.email;
                          return updated;
                        });
                      }
                    }}
                    onBlur={blurEmail}
                    aria-invalid={fieldErrors.email ? true : undefined}
                    aria-describedby={
                      fieldErrors.email ? "register-email-error" : undefined
                    }
                    className={cn(
                      marketInputClass,
                      fieldErrors.email && inputErrorClass
                    )}
                  />
                </Field>

                <Field
                  id="register-phone"
                  label={copy.phone[lang]}
                  icon={Phone}
                  iconClassName="text-emerald-600"
                  error={fieldMsg("phone")}
                >
                  <input
                    id="register-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={copy.phonePlaceholder[lang]}
                    value={phone}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const next = sanitizePhoneInput(raw);
                      setPhone(next);
                      setFieldErrors((prev) => {
                        const updated = { ...prev };
                        if (phoneDigitCount(raw) > PHONE_MAX_DIGITS) {
                          updated.phone = "phoneTooLong";
                        } else if (
                          updated.phone === "phoneTooLong" ||
                          updated.phone === "phoneInvalid"
                        ) {
                          delete updated.phone;
                        }
                        return updated;
                      });
                    }}
                    onBlur={() => {
                      const code = validatePhoneField(phone);
                      setFieldErrors((prev) => {
                        const updated = { ...prev };
                        if (code) updated.phone = code;
                        else delete updated.phone;
                        return updated;
                      });
                    }}
                    aria-invalid={fieldErrors.phone ? true : undefined}
                    aria-describedby={
                      fieldErrors.phone ? "register-phone-error" : undefined
                    }
                    className={cn(
                      marketInputClass,
                      fieldErrors.phone && inputErrorClass
                    )}
                  />
                </Field>

                <div data-register-field="password">
                  <AuthPasswordField
                    id="register-password"
                    label={copy.password[lang]}
                    icon={Lock}
                    iconClassName="text-amber-600"
                    toggleClassName="text-amber-600 hover:text-amber-800"
                    placeholder={copy.enterPassword[lang]}
                    value={password}
                    onChange={(v) => {
                      setPassword(v);
                      clearFieldError("password");
                      if (fieldErrors.confirmPassword) {
                        clearFieldError("confirmPassword");
                      }
                    }}
                    onBlur={blurPassword}
                    error={fieldMsg("password")}
                    minLength={REGISTER_PASSWORD_MIN_LENGTH}
                    autoComplete="new-password"
                    inputClassName={marketInputClass}
                  />
                </div>

                <div data-register-field="confirmPassword">
                  <AuthPasswordField
                    id="register-confirm-password"
                    label={copy.confirmPassword[lang]}
                    icon={Lock}
                    iconClassName="text-amber-600"
                    toggleClassName="text-amber-600 hover:text-amber-800"
                    placeholder={copy.retypePassword[lang]}
                    value={confirmPassword}
                    onChange={(v) => {
                      setConfirmPassword(v);
                      clearFieldError("confirmPassword");
                    }}
                    onBlur={blurConfirmPassword}
                    error={fieldMsg("confirmPassword")}
                    minLength={REGISTER_PASSWORD_MIN_LENGTH}
                    autoComplete="new-password"
                    disablePaste
                    inputClassName={marketInputClass}
                  />
                </div>
              </FormSection>

              <FormSection
                title={
                  kind === "company" ? copy.companyLogo[lang] : copy.profilePhoto[lang]
                }
              >
                <RegisterUploadZone
                  zoneId="register-photo"
                  label={
                    kind === "company"
                      ? copy.uploadCompanyLogo[lang]
                      : copy.uploadPhoto[lang]
                  }
                  description={
                    kind === "company"
                      ? copy.companyLogoOptionalHint[lang]
                      : copy.profilePhotoOptionalHint[lang]
                  }
                  hint={copy.fileHintImage[lang]}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  file={photo}
                  previewUrl={photoPreviewUrl}
                  onChange={handlePhotoChange}
                  required={false}
                  imageOnly
                  accent="teal"
                  error={fieldMsg("photo")}
                />
              </FormSection>

              {kind === "broker" ? (
                <label
                  htmlFor="register-company-livestock-broker"
                  className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/40 px-4 py-3 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/70"
                >
                  <input
                    id="register-company-livestock-broker"
                    type="checkbox"
                    checked={isCompanyLivestockBroker}
                    onChange={(e) => toggleCompanyLivestockBroker(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-emerald-900">
                      {copy.companyLivestockBroker[lang]}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-emerald-800/80">
                      {copy.companyLivestockBrokerHint[lang]}
                    </span>
                  </span>
                </label>
              ) : null}

              {kind === "company" ? (
                <FormSection title={copy.companyInfo[lang]}>
                  <RegisterCompanyInfoCard
                    values={{
                      ...companyInfo,
                      companyType: companyType ?? "",
                    }}
                    onChange={setCompanyField}
                    onBlurField={blurCompanyField}
                    fieldErrors={{
                      companyName: fieldMsg("companyName"),
                      companyType: fieldMsg("companyType"),
                      companyDistrict: fieldMsg("companyDistrict"),
                      companyEmail: fieldMsg("companyEmail"),
                      companyAddress: fieldMsg("companyAddress"),
                    }}
                    hideCompanyType
                  />
                </FormSection>
              ) : null}

              {kind === "company" && companyType ? (
                <RegistrationDocumentsStep
                  sector={utilityTypeToSector(companyType)}
                  documents={documents}
                  onDocumentChange={setDocument}
                  companyLogoUploaded={Boolean(photo)}
                  documentErrors={documentErrors}
                />
              ) : null}

              {kind === "broker" && isCompanyLivestockBroker ? (
                <RegistrationDocumentsStep
                  sector="livestock"
                  documents={documents}
                  onDocumentChange={setDocument}
                  companyLogoUploaded={Boolean(photo)}
                  documentErrors={documentErrors}
                  documentsRequired
                  personalPhotoOptional
                />
              ) : null}

              {kind === "broker" ? (
                <div data-register-field="livestockMarketId">
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    {copy.livestockMarket[lang]}
                  </label>
                  {maxMarketsAllowed != null ? (
                    <p className="mb-2 text-xs font-medium text-emerald-800">
                      {lang === "so"
                        ? `Qidmadaadu waxay oggol yahay ugu badnaan ${maxMarketsAllowed} suuq.`
                        : `Your plan allows up to ${maxMarketsAllowed} market(s).`}
                    </p>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {livestockMarketOptions.map((opt) => {
                      const checked = livestockMarketIds.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setLivestockMarketIds((prev) => {
                              if (prev.includes(opt.value)) {
                                return prev.filter((x) => x !== opt.value);
                              }
                              if (
                                maxMarketsAllowed != null &&
                                prev.length >= maxMarketsAllowed
                              ) {
                                setError(
                                  lang === "so"
                                    ? `Qidmadan waxay oggol tahay ugu badnaan ${maxMarketsAllowed} suuq.`
                                    : `This plan allows up to ${maxMarketsAllowed} market(s).`
                                );
                                return prev;
                              }
                              setError("");
                              return [...prev, opt.value];
                            });
                            clearFieldError("livestockMarketId");
                          }}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition",
                            checked
                              ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500"
                              : "border-slate-200 bg-white text-slate-800 hover:border-emerald-300"
                          )}
                        >
                          <MapPin className="h-4 w-4 shrink-0 text-teal-600" />
                          <span className="min-w-0 truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {fieldMsg("livestockMarketId") ? (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">
                      {fieldMsg("livestockMarketId")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {kind === "broker" ? (
                <p className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-2.5 text-[12px] font-medium leading-5 text-emerald-800">
                  {lang === "so"
                    ? "Codsigaaga waxaa eegaya admin. Marka la oggolaado, magacaaga, suuqa, iyo nooca xoolaha ayaa ka muuqan doona bogga Dulaalayaasha Xoolaha."
                    : "Admin reviews your application. Once approved, your name, selected market, and livestock type are listed on the Livestock Brokers page."}
                </p>
              ) : null}

              <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white p-4 sm:p-5 shadow-sm space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{lang === "so" ? "Qidmada & Lacag-bixinta" : "Subscription Plan & Payment"}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      {lang === "so"
                        ? "Dooro qidmada, kadib dooro EVC (u dir lacag) ama MasterCard (geli kaarkaaga). Screenshot lama baahna."
                        : "Choose a plan, then EVC (send money) or MasterCard (enter your card). No screenshot needed."}
                    </p>
                  </div>
                </div>

                {/* Duration Picker Pills */}
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    {lang === "so" ? "Dooro qidmada" : "Select a subscription plan"}
                  </label>
                  {plansLoading ? (
                    <p className="text-xs font-semibold text-slate-500">
                      {lang === "so" ? "Qidmada waa la soo rarayaa…" : "Loading plans…"}
                    </p>
                  ) : availablePlans.length === 0 ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                      {lang === "so"
                        ? "Super Admin weli qidmad firfircoon kuma darin Qidmada."
                        : "Super Admin has not added an active plan in Subscriptions yet."}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {availablePlans.map((plan, planIndex) => {
                        const tone = [
                          {
                            idle: "border-emerald-200 bg-emerald-50 hover:border-emerald-400",
                            on: "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-200 shadow-lg shadow-emerald-200/70",
                            badge: "bg-emerald-600",
                            price: "text-emerald-800",
                            plus: "bg-emerald-600 hover:bg-emerald-700",
                            due: "text-emerald-800",
                          },
                          {
                            idle: "border-teal-200 bg-teal-50 hover:border-teal-400",
                            on: "border-teal-500 bg-teal-50 ring-4 ring-teal-200 shadow-lg shadow-teal-200/70",
                            badge: "bg-teal-600",
                            price: "text-teal-800",
                            plus: "bg-teal-600 hover:bg-teal-700",
                            due: "text-teal-800",
                          },
                          {
                            idle: "border-sky-200 bg-sky-50 hover:border-sky-400",
                            on: "border-sky-500 bg-sky-50 ring-4 ring-sky-200 shadow-lg shadow-sky-200/70",
                            badge: "bg-sky-600",
                            price: "text-sky-800",
                            plus: "bg-sky-600 hover:bg-sky-700",
                            due: "text-sky-800",
                          },
                          {
                            idle: "border-violet-200 bg-violet-50 hover:border-violet-400",
                            on: "border-violet-500 bg-violet-50 ring-4 ring-violet-200 shadow-lg shadow-violet-200/70",
                            badge: "bg-violet-600",
                            price: "text-violet-800",
                            plus: "bg-violet-600 hover:bg-violet-700",
                            due: "text-violet-800",
                          },
                        ][planIndex % 4];
                        const isSelected = selectedPricingPlan?.id === plan.id;
                        const scopeLines =
                          kind === "broker"
                            ? livestockScopeLabels(plan, lang)
                            : companySector === "electricity"
                              ? electricityFeatureLabels(plan, lang)
                              : companySector === "water"
                                ? waterFeatureLabels(plan, lang)
                                : [adsIncludedLabel(plan.durationDays, lang)];
                        const maxMonths = planMonthSpan(plan.durationDays);
                        const months = Math.min(maxMonths, Math.max(1, payMonthsByPlan[plan.id] || 1));
                        const due = planInstallmentAmount(
                          Number(plan.price),
                          plan.durationDays,
                          months
                        );
                        const free = isFreePlanPrice(plan.price);
                        return (
                          <div
                            key={plan.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedPlanId(plan.id);
                              setError("");
                              if (isFreePlanPrice(plan.price)) {
                                setPaymentMethod(null);
                              }
                              if (plan.maxLivestockTypes != null) {
                                setLivestockSections((prev) =>
                                  prev.slice(0, plan.maxLivestockTypes!)
                                );
                              }
                              if (plan.maxMarkets != null) {
                                setLivestockMarketIds((prev) =>
                                  prev.slice(0, plan.maxMarkets!)
                                );
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                (e.currentTarget as HTMLDivElement).click();
                              }
                            }}
                            className={cn(
                              "flex flex-col items-start rounded-xl border p-3 text-left transition-all duration-200",
                              isSelected ? tone.on : tone.idle
                            )}
                          >
                            {isSelected ? (
                              <span className={cn("mb-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white", tone.badge)}>
                                {lang === "so" ? "La doortay" : "Selected"}
                              </span>
                            ) : null}
                            <span
                              className={cn(
                                "text-xs font-bold",
                                free
                                  ? isSelected
                                    ? "text-emerald-900"
                                    : "text-slate-700"
                                  : plan.durationDays <= 95
                                    ? "text-[#C6A15B]"
                                    : plan.durationDays <= 190
                                      ? "text-[#8E96A3]"
                                      : "text-[#7C5CBF]"
                              )}
                            >
                              {planColorName(plan.price, plan.durationDays, lang)}
                            </span>
                            <span className={cn("mt-0.5 text-sm font-extrabold", tone.price)}>
                              {isFreePlanPrice(plan.price)
                                ? lang === "so"
                                  ? "Bilaash"
                                  : "Free"
                                : planMonthlyRateLabel(Number(plan.price), plan.durationDays, lang)}
                            </span>
                            {free ? (
                              <span className="text-[10px] text-slate-500">
                                {planDurationChoiceLabel(plan.durationDays, lang, true)}
                              </span>
                            ) : null}
                            {scopeLines.map((line) => (
                              <span
                                key={line}
                                className="mt-0.5 text-[11px] font-bold text-emerald-800"
                              >
                                {line}
                              </span>
                            ))}
                            {free ? null : (
                              <span className="mt-2 flex w-full items-center gap-2">
                                <button
                                  type="button"
                                  aria-label={lang === "so" ? "Ka jar bil" : "Remove a month"}
                                  disabled={months <= 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPlanId(plan.id);
                                    setPayMonthsByPlan((prev) => ({
                                      ...prev,
                                      [plan.id]: Math.max(1, months - 1),
                                    }));
                                    setEvcPaid(null);
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="text-[11px] font-bold text-slate-700">
                                  {months} {lang === "so" ? "bil" : months === 1 ? "month" : "months"}
                                </span>
                                <button
                                  type="button"
                                  aria-label={lang === "so" ? "Kudar bil" : "Add a month"}
                                  disabled={months >= maxMonths}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPlanId(plan.id);
                                    setPayMonthsByPlan((prev) => ({
                                      ...prev,
                                      [plan.id]: Math.min(maxMonths, months + 1),
                                    }));
                                    setEvcPaid(null);
                                  }}
                                  className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm disabled:opacity-40", tone.plus)}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                                <span className={cn("ml-auto text-xs font-extrabold", tone.due)}>
                                  ${due}
                                </span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Payment method + instructions */}
                {selectedPricingPlan && !isFreeSelectedPlan ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        {lang === "so" ? "Habka lacag-bixinta" : "Payment method"}
                      </label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {PAYMENT_METHOD_OPTIONS.map((opt) => {
                          const on = paymentMethod === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setPaymentMethod(opt.id);
                                setError("");
                                setMastercardError("");
                                if (opt.id !== "evc") setEvcPaid(null);
                              }}
                              className={cn(
                                "flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition",
                                on
                                  ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                                  : "border-slate-200 bg-white hover:border-amber-300"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-9 w-9 items-center justify-center rounded-lg text-white",
                                  opt.id === "evc"
                                    ? "bg-emerald-600"
                                    : opt.id === "visa"
                                      ? "bg-[#1434CB]"
                                      : "bg-slate-800"
                                )}
                              >
                                {opt.id === "evc" ? (
                                  <Smartphone className="h-4 w-4" />
                                ) : (
                                  <CreditCard className="h-4 w-4" />
                                )}
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                {lang === "so" ? opt.labelSo : opt.labelEn}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {paymentMethod === "evc" ? (
                      <EvcChargeForm
                        lang={lang}
                        amount={selectedDue}
                        description={`MMPS ${publicPlanName(selectedPricingPlan.name, "en")}`}
                        planId={selectedPricingPlan.id}
                        merchantHintPhone={PAYMENT_PHONE_NUMBER}
                        paid={evcPaid}
                        onPaid={(result) => {
                          setEvcPaid(result);
                          setError("");
                        }}
                        onClear={() => setEvcPaid(null)}
                      />
                    ) : null}

                    {paymentMethod === "mastercard" || paymentMethod === "visa" ? (
                      <MastercardPaymentForm
                        lang={lang}
                        brand={paymentMethod === "visa" ? "visa" : "mastercard"}
                        amount={selectedDue}
                        values={mastercardForm}
                        error={mastercardError}
                        onChange={(next) => {
                          setMastercardForm(next);
                          setMastercardError("");
                          setError("");
                        }}
                      />
                    ) : null}

                    {!paymentMethod ? (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                        {lang === "so"
                          ? "Dooro EVC (u dir lacag), MasterCard, ama Visa."
                          : "Select EVC (send money), MasterCard, or Visa."}
                      </p>
                    ) : null}
                  </div>
                ) : selectedPricingPlan && isFreeSelectedPlan ? (
                  <div className="rounded-xl border border-emerald-300/80 bg-emerald-50/80 p-3.5 text-xs font-semibold text-emerald-950">
                    {lang === "so"
                      ? "Qorshe bilaash ah — lacag-bixin lama baahna. Kaliya dooro 1 suuq iyo 1 nooc xoolo."
                      : "Free plan — no payment needed. Select only 1 market and 1 livestock type."}
                  </div>
                ) : null}

                {/* Confirmation Checkbox */}
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-emerald-200 bg-white/95 p-3 transition hover:bg-emerald-50/40">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-emerald-400 text-emerald-700 focus:ring-emerald-500"
                    checked={acceptSubscription}
                    onChange={(e) => {
                      setAcceptSubscription(e.target.checked);
                      if (e.target.checked) setError("");
                    }}
                  />
                  <span className="text-xs font-semibold leading-relaxed text-slate-800">
                    {selectedPricingPlan
                      ? isFreeSelectedPlan
                        ? lang === "so"
                          ? kind === "broker"
                            ? `Waan xaqiijinayaa inaan qidmada bilaash ah ${publicPlanName(selectedPricingPlan.name, lang)} doortay (1 suuq · 1 nooc xoolo).`
                            : `Waan xaqiijinayaa inaan qidmada bilaash ah ${publicPlanName(selectedPricingPlan.name, lang)} doortay.`
                          : kind === "broker"
                            ? `I confirm selecting the free ${selectedPricingPlan.name} plan (1 market · 1 livestock type).`
                            : `I confirm selecting the free ${selectedPricingPlan.name} plan.`
                        : lang === "so"
                          ? paymentMethod === "mastercard"
                            ? `Waan xaqiijinayaa inaan qidmada ${publicPlanName(selectedPricingPlan.name, lang)} ($${selectedDue} · ${selectedPayMonths} ${lang === "so" ? "bil" : selectedPayMonths === 1 ? "month" : "months"}) doortay, lacagtana ku bixinayo MasterCard-kayga.`
                            : paymentMethod === "visa"
                              ? `Waan xaqiijinayaa inaan qidmada ${publicPlanName(selectedPricingPlan.name, lang)} ($${selectedDue} · ${selectedPayMonths} ${lang === "so" ? "bil" : selectedPayMonths === 1 ? "month" : "months"}) doortay, lacagtana ku bixinayo Visa-gayga.`
                            : paymentMethod === "evc"
                              ? evcPaid
                                ? `Waan xaqiijinayaa inaan qidmada ${publicPlanName(selectedPricingPlan.name, lang)} ($${selectedDue} · ${selectedPayMonths} ${lang === "so" ? "bil" : selectedPayMonths === 1 ? "month" : "months"}) doortay, lacagtana EVC ayaan ku bixiyey.`
                                : `Waan xaqiijinayaa inaan qidmada ${publicPlanName(selectedPricingPlan.name, lang)} doortay — marka hore ku bixi EVC.`
                              : `Waan xaqiijinayaa inaan qidmada ${publicPlanName(selectedPricingPlan.name, lang)} doortay — dooro EVC, MasterCard, ama Visa.`
                          : paymentMethod === "mastercard"
                            ? `I confirm selecting the ${selectedPricingPlan.name} plan ($${selectedDue} · ${selectedPayMonths} ${selectedPayMonths === 1 ? "month" : "months"}) and paying with my MasterCard.`
                            : paymentMethod === "visa"
                              ? `I confirm selecting the ${selectedPricingPlan.name} plan ($${selectedDue} · ${selectedPayMonths} ${selectedPayMonths === 1 ? "month" : "months"}) and paying with my Visa.`
                            : paymentMethod === "evc"
                              ? evcPaid
                                ? `I confirm selecting the ${selectedPricingPlan.name} plan ($${selectedDue} · ${selectedPayMonths} ${selectedPayMonths === 1 ? "month" : "months"}) and that EVC payment was completed.`
                                : `I confirm selecting the ${selectedPricingPlan.name} plan — complete EVC payment first.`
                              : `I confirm selecting the ${selectedPricingPlan.name} plan — choose EVC, MasterCard, or Visa.`
                      : lang === "so"
                        ? "Marka hore dooro qidmad, kadibna EVC, MasterCard, ama Visa."
                        : "Choose a plan first, then EVC or MasterCard."}
                  </span>
                </label>
              </div>

              {/* End of details: natural flow below fields / uploads / progress — not sticky */}
              <div className="-mx-6 mt-2 flex flex-col gap-3 px-6 pt-4">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setFieldErrors({});
                      setStep((s) => s - 1);
                    }}
                    className={cn(
                      "flex-1 rounded-xl py-3 text-sm font-bold transition",
                      registerStepNavButtonClass(step, "back")
                    )}
                  >
                    <StablePair pair={copy.back} lang={lang} align="center" />
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !selectedPricingPlan ||
                      !acceptSubscription
                    }
                    className={cn(
                      primaryBtnBaseClass,
                      registerStepNavButtonClass(step, "primary"),
                      "flex-1"
                    )}
                  >
                    {loading ? (
                      <StablePair pair={copy.creatingAccountShort} lang={lang} />
                    ) : (
                      <>
                        <UserPlus
                          className="h-4 w-4 shrink-0 text-amber-200"
                          strokeWidth={2.5}
                        />
                        <StablePair pair={copy.registerButton} lang={lang} />
                      </>
                    )}
                  </button>
                </div>
                <Link
                  href="/"
                  className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 text-center text-sm font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800"
                >
                  {copy.subscriptionDecline[lang]}
                </Link>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="-mx-6 mt-2 flex gap-3 px-6 pt-4">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setFieldErrors({});
                  setStep((s) => s - 1);
                }}
                className={cn(
                  "flex-1 rounded-xl py-3 text-sm font-bold transition",
                  registerStepNavButtonClass(step, "back")
                )}
              >
                <StablePair pair={copy.back} lang={lang} align="center" />
              </button>
            </div>
          ) : null}

          {step === 0 ? (
            <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 pt-2 text-center text-sm text-slate-600">
              <StablePair
                pair={copy.alreadyHaveAccount}
                lang={lang}
                className="text-slate-500"
              />{" "}
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                <User className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
                <StablePair pair={copy.signIn} lang={lang} />
              </Link>
            </p>
          ) : null}
        </form>
      </AuthFormCard>
    </RegisterMarketLayout>
  );
} 
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading registration…</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
