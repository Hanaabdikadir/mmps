export type PricingDurationId = "1_month" | "3_months" | "6_months" | "1_year";
export type PricingSectorId = "livestock" | "electricity" | "water";

export interface PricingPlanDurationMeta {
  id: PricingDurationId;
  durationDays: number;
  labelEn: string;
  labelSo: string;
  badgeEn?: string;
  badgeSo?: string;
  discountPercent: number;
  popular?: boolean;
}

export const PAYMENT_PHONE_NUMBER = "0619643334";
export const PAYMENT_ACCOUNT_NAME = "MMPS Subscription Services";
export type PaymentMethodId = "evc" | "mastercard" | "visa";

export const PAYMENT_METHOD_OPTIONS: {
  id: PaymentMethodId;
  labelEn: string;
  labelSo: string;
}[] = [
  { id: "evc", labelEn: "EVC Plus", labelSo: "EVC Plus" },
  { id: "mastercard", labelEn: "MasterCard", labelSo: "MasterCard" },
  { id: "visa", labelEn: "Visa", labelSo: "Visa" },
];

/** Stored on renewal proof when no screenshot is uploaded. */
export function paymentMethodToken(method: PaymentMethodId): string {
  return `method:${method}`;
}

export function parsePaymentMethodToken(
  raw?: string | null
): PaymentMethodId | null {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "method:evc" || v === "evc" || v.startsWith("method:evc|")) return "evc";
  if (
    v === "method:mastercard" ||
    v === "mastercard" ||
    v.startsWith("method:mastercard|")
  ) {
    return "mastercard";
  }
  if (v === "method:visa" || v === "visa" || v.startsWith("method:visa|")) {
    return "visa";
  }
  return null;
}

export function isPaymentMethodToken(raw?: string | null): boolean {
  return parsePaymentMethodToken(raw) != null;
}

/** Append chosen renewal plan id onto a payment proof token. */
export function withRequestedPlanId(receiptFile: string, planId: number): string {
  const base = String(receiptFile || "").replace(/\|planId:\d+/gi, "").trim();
  return `${base}|planId:${planId}`;
}

export function parseRequestedPlanId(raw?: string | null): number | null {
  const m = String(raw || "").match(/\|planId:(\d+)/i);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function withPaidMonths(receiptFile: string, months: number): string {
  const base = String(receiptFile || "").replace(/\|months:\d+/gi, "").trim();
  const n = Math.max(1, Math.round(Number(months) || 1));
  return `${base}|months:${n}`;
}

export function parsePaidMonths(raw?: string | null): number | null {
  const m = String(raw || "").match(/\|months:(\d+)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function paymentMethodLabel(
  method: PaymentMethodId | null | undefined,
  lang: "en" | "so"
): string {
  if (method === "mastercard") return "MasterCard";
  if (method === "visa") return "Visa";
  if (method === "evc") return "EVC Plus";
  return lang === "so" ? "Lacag-bixin" : "Payment";
}

/** @deprecated Use PAYMENT_METHOD_OPTIONS — kept for older copy. */
export const PAYMENT_METHODS = "EVC / MasterCard";

export const PRICING_DURATIONS: PricingPlanDurationMeta[] = [
  {
    id: "1_month",
    durationDays: 30,
    labelEn: "1 Month",
    labelSo: "1 Bil",
    discountPercent: 0,
  },
  {
    id: "3_months",
    durationDays: 90,
    labelEn: "3 Months",
    labelSo: "3 Bilood",
    badgeEn: "Save ~11%",
    badgeSo: "Badbaadi ~11%",
    discountPercent: 11,
  },
  {
    id: "6_months",
    durationDays: 180,
    labelEn: "6 Months",
    labelSo: "6 Bilood",
    badgeEn: "Save ~17%",
    badgeSo: "Badbaadi ~17%",
    discountPercent: 17,
  },
  {
    id: "1_year",
    durationDays: 365,
    labelEn: "1 Year",
    labelSo: "1 Sano",
    badgeEn: "Most Popular · Save ~25%",
    badgeSo: "Ugu Caansan · Badbaadi ~25%",
    discountPercent: 25,
    popular: true,
  },
];

export interface PricingPlan {
  id: string; // e.g. "livestock_3_months"
  durationId: PricingDurationId;
  sector: PricingSectorId;
  titleEn: string;
  titleSo: string;
  priceUsd: number;
  durationDays: number;
  discountPercent: number;
  popular?: boolean;
  featuresEn: string[];
  featuresSo: string[];
}

export const SECTOR_PRICING_INFO: Record<
  PricingSectorId,
  {
    nameEn: string;
    nameSo: string;
    badgeEn: string;
    badgeSo: string;
    descriptionEn: string;
    descriptionSo: string;
    gradient: string;
    borderClass: string;
    accentClass: string;
  }
> = {
  livestock: {
    nameEn: "Livestock (Xoolaha)",
    nameSo: "Xoolaha",
    badgeEn: "Livestock Markets & Brokers",
    badgeSo: "Suuqyada & Dilaaliinta Xoolaha",
    descriptionEn: "Live Mogadishu livestock market prices, broker verification, and trader listing.",
    descriptionSo: "Qiimaha tooska ah ee suuqyada xoolaha Muqdisho, xaqiijinta dilaalka, iyo daabacaadda ganacsatada.",
    gradient: "from-emerald-600 to-green-600",
    borderClass: "border-emerald-300",
    accentClass: "text-emerald-700 dark:text-emerald-300",
  },
  electricity: {
    nameEn: "Electricity (Korontada)",
    nameSo: "Korontada",
    badgeEn: "Electric Utility Providers",
    badgeSo: "Shirkadaha Korontada",
    descriptionEn: "Live per-kWh rates, Mogadishu grid coverage profiles, and public verified tariffs.",
    descriptionSo: "Qiimaha halbeega kWh, xogta goobaha adeegga Muqdisho, iyo qiimayaal rasmi ah.",
    gradient: "from-amber-600 to-orange-600",
    borderClass: "border-amber-300",
    accentClass: "text-amber-700 dark:text-amber-300",
  },
  water: {
    nameEn: "Water Supply (Biyaha)",
    nameSo: "Biyaha",
    badgeEn: "Water Companies & Tankers",
    badgeSo: "Shirkadaha Biyaha & Booyadaha",
    descriptionEn: "Verified household and tanker water tariffs across Banadir districts.",
    descriptionSo: "Qiimaha biyaha booyadaha iyo tubada ee degmooyinka gobolka Banaadir.",
    gradient: "from-sky-600 to-blue-600",
    borderClass: "border-sky-300",
    accentClass: "text-sky-700 dark:text-sky-300",
  },
};

const COMMON_PRICES: Record<PricingDurationId, number> = {
  "1_month": 15,
  "3_months": 40,
  "6_months": 75,
  "1_year": 135,
};

const SECTOR_FEATURES: Record<
  PricingSectorId,
  { featuresEn: string[]; featuresSo: string[] }
> = {
  livestock: {
    featuresEn: [
      "Official Verified Broker / Market Trader status badge",
      "Unlimited daily livestock price submissions for review",
      "Direct display on live Mogadishu market index",
      "Priority Super Admin approvals queue",
      "Full analytics on price history & trading market trends",
      "Direct technical and account support via WhatsApp/Phone",
    ],
    featuresSo: [
      "Calaamadda rasmiga ah ee Dilaal / Ganacsade la xaqiijiyey",
      "Gelisashada qiimaha xoolaha ee maalinlaha ah si loo ansixiyo",
      "Daabacaad toos ah oo ku taal tusmada suuqa Muqdisho",
      "Mudnaan gaar ah oo ku saabsan dib-u-eegista Super Admin-ka",
      "Warbixinnada xogta suuqa iyo isbeddelka qiimaha xoolaha",
      "Taageero toos ah oo joogto ah (WhatsApp & Taleefan)",
    ],
  },
  electricity: {
    featuresEn: [
      "Verified Electricity Provider official profile badge",
      "Publish live residential, commercial, & unit kWh tariffs",
      "Listing across Mogadishu district coverage maps",
      "Customer price calculator inclusion",
      "Dedicated company admin portal with staff accounts",
      "Priority Super Admin review & 24/7 platform uptime",
    ],
    featuresSo: [
      "Calaamadda Shirkad Koronto oo rasmi ah oo la hubiyey",
      "Daabacaadda qiimaha kWh ee guryaha, ganacsiga & warshadaha",
      "Ka muuqashada khariidadda degmooyinka Muqdisho ee adeegga",
      "Ku dhex-jirka xisaabiyaha qiimaha ee dadweynaha",
      "Dashboard gaar ah oo leh maaraynta shaqaalaha shirkadda",
      "Ansixin degdeg ah oo Super Admin iyo taageero joogto ah",
    ],
  },
  water: {
    featuresEn: [
      "Verified Water Utility / Tanker Provider official badge",
      "Publish tanker, household tap, & commercial water rates",
      "Public listing with hotline and coverage areas in Banadir",
      "Customer volume price calculator integration",
      "Company administration portal with multiple user logins",
      "Expedited Super Admin rate approvals and audit trail",
    ],
    featuresSo: [
      "Calaamadda Shirkad Biyo / Booyad oo rasmi ah oo la hubiyey",
      "Daabacaadda qiimaha booyadaha, tuubada guriga & ganacsiga",
      "Liis garaynta lambarka degdegga iyo deegaannada Banaadir",
      "Isku-xirka xisaabiyaha cabbirka foostada / litirka biyaha",
      "Dashboard gaar ah oo shirkaddu ku maamusho isticmaalayaasha",
      "Ansixin degdeg ah oo Super Admin iyo xog-kaydin sugan",
    ],
  },
};

export const ALL_PRICING_PLANS: PricingPlan[] = (
  ["livestock", "electricity", "water"] as PricingSectorId[]
).flatMap((sector) => {
  const info = SECTOR_PRICING_INFO[sector];
  const features = SECTOR_FEATURES[sector];

  return PRICING_DURATIONS.map((dur) => {
    return {
      id: `${sector}_${dur.id}`,
      durationId: dur.id,
      sector,
      titleEn: `${info.nameEn.split(" ")[0]} · ${dur.labelEn}`,
      titleSo: `${info.nameSo} · ${dur.labelSo}`,
      priceUsd: COMMON_PRICES[dur.id],
      durationDays: dur.durationDays,
      discountPercent: dur.discountPercent,
      popular: dur.popular,
      featuresEn: features.featuresEn,
      featuresSo: features.featuresSo,
    };
  });
});

/** Ads included by plan length. The longest plan is unlimited. */
export function adsIncluded(durationDays: number): number | null {
  if (durationDays <= 31) return 10;
  if (durationDays <= 95) return 35;
  if (durationDays <= 190) return 80;
  return null;
}

/** null = unlimited. Used for livestock broker market / type caps. */
export function parsePlanLimit(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return null;
  return Math.floor(n);
}

export function isLivestockAccountType(accountType: string): boolean {
  const type = accountType.trim().toUpperCase();
  return type === "LIVESTOCK" || type === "BROKER";
}

export function isFreePlanPrice(
  price: number | string | { toNumber?: () => number; toString?: () => string } | null | undefined
): boolean {
  if (price == null) return true;
  if (typeof price === "number") return price <= 0;
  if (typeof price === "string") return Number(price) <= 0;
  if (typeof price.toNumber === "function") return price.toNumber() <= 0;
  return Number(price) <= 0;
}

/** Short plan line shown above the price. */
export function planIntroLabel(
  durationDays: number,
  lang: "en" | "so",
  price?: number | null
): string {
  if (isFreePlanPrice(price)) {
    return lang === "so"
      ? "Qorshe bilaash ah — ku bilow 1 suuq iyo 1 nooc xoolo."
      : "Free plan — start with 1 market and 1 livestock type.";
  }
  const monthlyRate = Number(price) / planBaseMonthSpan(durationDays);
  const rate = Number.isFinite(monthlyRate) ? `$${monthlyRate.toFixed(2)}` : "";
  return lang === "so"
    ? `Qiimaha bishii waa ${rate}.`
    : `Monthly rate: ${rate}.`;
}

/** Paid plans allow a chosen term; free plans retain their listed duration. */
export function planDurationChoiceLabel(
  _durationDays: number,
  lang: "en" | "so",
  isFree = false
): string {
  if (!isFree) return "";
  return lang === "so" ? "1 Bil" : "1 Month";
}

/** e.g. "$3 / bil" under the total price for paid livestock plans. */
export function planMonthlyRateLabel(
  price: number,
  durationDays: number,
  lang: "en" | "so"
): string | null {
  if (isFreePlanPrice(price) || durationDays <= 0) return null;
  const months = planBaseMonthSpan(durationDays);
  const perMonth = price / months;
  const rounded = (Math.round(perMonth * 100) / 100).toFixed(2);
  return lang === "so" ? `$${rounded} / bil` : `$${rounded} / month`;
}

/** Public plan title. Somali color names, English when EN is selected. */
export function planColorName(
  price: number | string,
  durationDays: number,
  lang: "en" | "so"
): string {
  if (isFreePlanPrice(price)) return lang === "so" ? "Bilaash" : "Free";
  if (durationDays <= 95) return lang === "so" ? "Dahab" : "Gold";
  if (durationDays <= 190) return lang === "so" ? "Qalin" : "Silver";
  return lang === "so" ? "Luul" : "Diamond";
}

/** Card order: Free, Gold, Silver, Pearl. */
export function planCardOrder(plan: {
  price: number | string;
  durationDays: number;
}): number {
  if (isFreePlanPrice(plan.price)) return 0;
  if (plan.durationDays <= 95) return 1;
  if (plan.durationDays <= 190) return 2;
  return 3;
}

/** Original tier term used to derive its existing monthly rate. */
export function planBaseMonthSpan(durationDays: number): number {
  const days = Number(durationDays) || 0;
  if (days <= 31) return 1;
  if (days <= 95) return 3;
  if (days <= 190) return 6;
  return 12;
}

/** Paid plans allow selection of any term from 1 to 12 months. */
export function planMonthSpan(_durationDays: number): number {
  return 12;
}

/** Amount due for the selected term, using the plan's existing monthly rate. */
export function planInstallmentAmount(
  price: number,
  durationDays: number,
  months: number
): number {
  const span = planMonthSpan(durationDays);
  const n = Math.min(span, Math.max(1, Math.round(Number(months) || 1)));
  const per = Number(price) / planBaseMonthSpan(durationDays);
  if (!Number.isFinite(per)) return 0;
  return Math.round(per * n * 100) / 100;
}

/** Amount paid for the active subscription term shown by its start and expiry dates. */
export function subscriptionPlanPaidAmount(
  price: number,
  durationDays: number,
  startDate: Date | string,
  expiryDate: Date | string
): number {
  if (isFreePlanPrice(price)) return 0;
  const start = new Date(startDate).getTime();
  const expiry = new Date(expiryDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(expiry) || expiry <= start) {
    return 0;
  }
  const months = Math.min(
    12,
    Math.max(1, Math.round((expiry - start) / (30 * 24 * 60 * 60 * 1000)))
  );
  return planInstallmentAmount(price, durationDays, months);
}

export function adsIncludedLabel(durationDays: number, lang: "en" | "so"): string {
  const count = adsIncluded(durationDays);
  if (count == null) {
    return lang === "so" ? "Xayeysiis aan xad lahayn" : "Unlimited advertisements";
  }
  return lang === "so" ? `Waxaa ku jira ${count} xayeysiis` : `Includes ${count} advertisements`;
}

function countLabel(
  count: number | null | undefined,
  singularEn: string,
  pluralEn: string,
  singularSo: string,
  pluralSo: string,
  allEn: string,
  allSo: string,
  lang: "en" | "so"
): string {
  if (count == null || count <= 0) {
    return lang === "so" ? allSo : allEn;
  }
  if (lang === "so") {
    return count === 1 ? `1 ${singularSo}` : `${count} ${pluralSo}`;
  }
  return count === 1 ? `1 ${singularEn}` : `${count} ${pluralEn}`;
}

/** Livestock plan limits shown on pricing cards (markets + livestock types). */
export function livestockScopeLabels(
  plan: {
    maxMarkets?: number | null;
    maxLivestockTypes?: number | null;
  },
  lang: "en" | "so"
): string[] {
  const markets = countLabel(
    plan.maxMarkets,
    "market",
    "markets",
    "suuq",
    "suuq",
    "All markets",
    "Dhammaan suuqyada",
    lang
  );
  const types = countLabel(
    plan.maxLivestockTypes,
    "livestock type",
    "livestock types",
    "nooc xoolo",
    "nooc xoolo",
    "All livestock types",
    "Dhammaan noocyada xoolaha",
    lang
  );
  if (lang === "so") {
    return [`Waxaa ku jira ${markets}`, `Waxaa ku jira ${types}`];
  }
  return [`Includes ${markets}`, `Includes ${types}`];
}

/** Feature lines for electricity plans (tiered by duration / free). */
export function electricityFeatureLabels(
  plan: { price: number | string; durationDays: number },
  lang: "en" | "so"
): string[] {
  if (isFreePlanPrice(plan.price) || plan.durationDays <= 31) {
    return lang === "so"
      ? ["Xisaabiyaha qiimaha (Price Calculator)", "Qiimaha Hadda"]
      : ["Price Calculator", "Current Price"];
  }
  if (plan.durationDays <= 95) {
    return lang === "so"
      ? [
          "Xisaabiyaha qiimaha (Price Calculator)",
          "Qiimaha Hadda",
          "3 sano oo taariikh ah",
        ]
      : ["Price Calculator", "Current Price", "3 years of price history"];
  }
  if (plan.durationDays <= 190) {
    return lang === "so"
      ? [
          "Xisaabiyaha qiimaha (Price Calculator)",
          "Qiimaha Hadda",
          "Taariikhda qiimaha",
          "Isbeddellada qiimaha",
        ]
      : ["Price Calculator", "Current Price", "Price History", "Rate Changes"];
  }
  return lang === "so"
    ? [
        "Dhammaan features-ka",
        "Taariikhda qiimaha oo buuxa",
        "Warbixino faahfaahsan",
      ]
    : ["All features", "Full Price History", "Detailed Reports"];
}

/** Feature lines for water plans (tiered by duration / free). */
export function waterFeatureLabels(
  plan: { price: number | string; durationDays: number },
  lang: "en" | "so"
): string[] {
  if (isFreePlanPrice(plan.price) || plan.durationDays <= 31) {
    return lang === "so"
      ? ["Xisaabiyaha qiimaha (Price Calculator)", "Qiimaha biyaha ee hadda"]
      : ["Price Calculator", "Current Water Rate"];
  }
  if (plan.durationDays <= 95) {
    return lang === "so"
      ? [
          "Xisaabiyaha qiimaha (Price Calculator)",
          "Qiimaha hadda",
          "3 sano oo taariikh ah",
        ]
      : ["Price Calculator", "Current Rate", "3 years of price history"];
  }
  if (plan.durationDays <= 190) {
    return lang === "so"
      ? [
          "Xisaabiyaha qiimaha (Price Calculator)",
          "Qiimaha hadda",
          "Taariikhda qiimaha",
          "Isbeddellada qiimaha",
        ]
      : ["Price Calculator", "Current Rate", "Price History", "Rate Changes"];
  }
  return lang === "so"
    ? [
        "Dhammaan features-ka",
        "Taariikhda qiimaha oo buuxa",
        "Warbixino faahfaahsan",
      ]
    : ["All features", "Full Price History", "Detailed Reports"];
}

/** Feature lines for a public plan card, by sector tab. */
export function publicPlanFeatureLabels(
  plan: PublicSubscriptionPlan,
  tab: PricingSectorId,
  lang: "en" | "so"
): string[] {
  if (tab === "livestock" || isLivestockAccountType(plan.accountType)) {
    return livestockScopeLabels(plan, lang);
  }
  if (tab === "electricity" || plan.accountType.trim().toUpperCase() === "ELECTRICITY") {
    return electricityFeatureLabels(plan, lang);
  }
  if (tab === "water" || plan.accountType.trim().toUpperCase() === "WATER") {
    return waterFeatureLabels(plan, lang);
  }
  return [adsIncludedLabel(plan.durationDays, lang)];
}

export function getPricingPlansForSector(sector: PricingSectorId): PricingPlan[] {
  return ALL_PRICING_PLANS.filter((p) => p.sector === sector);
}

export function findPricingPlan(
  sector?: string | null,
  durationId?: string | null
): PricingPlan | undefined {
  if (!sector) return undefined;
  const s = sector.toLowerCase().trim() as PricingSectorId;
  const d = durationId ? (durationId.trim() as PricingDurationId) : "1_month";
  return (
    ALL_PRICING_PLANS.find((p) => p.sector === s && p.durationId === d) ||
    ALL_PRICING_PLANS.find((p) => p.sector === s) ||
    ALL_PRICING_PLANS[0]
  );
}

export function findPricingPlanById(planId?: string | null): PricingPlan | undefined {
  if (!planId) return undefined;
  return ALL_PRICING_PLANS.find((p) => p.id === planId);
}

/** Active plan row created by Super Admin under Subscriptions. */
export type PublicSubscriptionPlan = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  accountType: string;
  /** null = unlimited / all markets */
  maxMarkets: number | null;
  /** null = unlimited / all livestock types (camel, goat, cattle, …) */
  maxLivestockTypes: number | null;
};

const PLAN_NAME_SO: Array<[RegExp, string]> = [
  [/\bLivestock\b/g, "Xoolaha"],
  [/\bElectricity\b/g, "Korontada"],
  [/\bWater\b/g, "Biyaha"],
  [/\bFree\b/g, "Bilaash"],
  [/\bGold\b/g, "Dahab"],
  [/\bSilver\b/g, "Qalin"],
  [/\bDiamond\b/g, "Luul"],
  [/\bPearl\b/g, "Luul"],
  [/\b1 Month\b/g, "1 Bil"],
  [/\b3 Months\b/g, "3 Bilood"],
  [/\b6 Months\b/g, "6 Bilood"],
  [/\b1 Year\b/g, "1 Sano"],
  [/\bMonths\b/g, "Bilood"],
  [/\bMonth\b/g, "Bil"],
  [/\bYear\b/g, "Sano"],
];

const PLAN_DESCRIPTION_SO: Record<string, string> = {
  "The price for 1 month.": "Qiimaha 1 bil.",
  "Save about 11% off 3 months at the monthly price ($45).":
    "Badbaadi qiyaastii 11% marka la qaato 3 bilood qiimaha bishii ($45).",
  "Save about 17% off 6 months at the monthly price ($90).":
    "Badbaadi qiyaastii 17% marka la qaato 6 bilood qiimaha bishii ($90).",
  "Save about 25% off 12 months at the monthly price ($180).":
    "Badbaadi qiyaastii 25% marka la qaato 12 bilood qiimaha bishii ($180).",
};

/** Plan name in the language selected on the public site. */
export function publicPlanName(name: string, lang: "en" | "so"): string {
  if (lang !== "so") return name.replace(/\bPearl\b/g, "Diamond");
  return PLAN_NAME_SO.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    name
  );
}

/** Plan description in the language selected on the public site. */
export function publicPlanDescription(
  description: string | null | undefined,
  lang: "en" | "so"
): string {
  const text = description?.trim() || "";
  if (!text || lang !== "so") return text;
  const exact = PLAN_DESCRIPTION_SO[text];
  if (exact) return exact;
  const save = text.match(
    /^Save about (\d+)% off (\d+) months at the monthly price \(\$(\d+)\)\.$/
  );
  if (save) {
    return `Badbaadi qiyaastii ${save[1]}% marka la qaato ${save[2]} bilood qiimaha bishii ($${save[3]}).`;
  }
  const priceFor = text.match(/^The price for (\d+) months?\.$/);
  if (priceFor) {
    return priceFor[1] === "1" ? "Qiimaha 1 bil." : `Qiimaha ${priceFor[1]} bilood.`;
  }
  return publicPlanName(text, "so");
}

/** Whether a Super Admin plan applies to this registration. */
export function subscriptionPlanMatches(
  accountType: string,
  sector: string,
  kind: "company" | "broker",
  _durationDays: number
): boolean {
  const type = accountType.trim().toUpperCase();
  const s = sector.toLowerCase();
  const matchesAccountType =
    type === "ALL" ||
    (type === "COMPANY" && kind === "company") ||
    (kind === "broker" && (type === "BROKER" || type === "LIVESTOCK")) ||
    (kind === "company" && s === "water" && type === "WATER") ||
    (kind === "company" && s === "electricity" && type === "ELECTRICITY") ||
    (kind === "company" &&
      s === "livestock" &&
      (type === "LIVESTOCK" || type === "BROKER"));

  return matchesAccountType;
}

/** Utility company plan tiers (matches pricing cards). */
export type CompanyPlanTier = "free" | "standard" | "premium";

export function companyPlanTierFromPlan(plan: {
  price: number | string;
  durationDays: number;
}): CompanyPlanTier {
  if (isFreePlanPrice(plan.price) || plan.durationDays <= 31) return "free";
  if (plan.durationDays <= 190) return "standard";
  return "premium";
}

/**
 * Company-admin dashboard tabs allowed by electricity/water plan cards:
 * - Free: Price Calculator + Current Price + Contact Info (+ Page Hero for utilities)
 * - 6 Months: + Price History / Rate Changes (+ Contact + Update Price)
 * - 1 Year: All features (hero, reports, …)
 */
export type CompanyAdminPlanTab =
  | "overview"
  | "prices"
  | "rates5y"
  | "reports"
  | "hero"
  | "contact"
  | "categories"
  | "types"
  | "snapshot"
  | "notifications"
  | "subscription"
  | "password";

const ALWAYS_ALLOWED_TABS: ReadonlySet<CompanyAdminPlanTab> = new Set([
  "overview",
  "prices",
  "contact",
  "notifications",
  "subscription",
  "password",
]);

/** Free utility plans: current-year rate only (no Price History). */
export function companyAdminCanEditPriceHistory(
  tier: CompanyPlanTier | null | undefined,
  opts?: { isLivestockCompany?: boolean }
): boolean {
  if (opts?.isLivestockCompany) return true;
  return tier === "standard" || tier === "premium";
}

export function companyAdminTabAllowedByPlan(
  tab: string,
  tier: CompanyPlanTier | null | undefined,
  opts?: { sector?: string | null; isLivestockCompany?: boolean }
): boolean {
  const key = tab as CompanyAdminPlanTab;
  // Essential account tabs always available when logged in.
  if (ALWAYS_ALLOWED_TABS.has(key)) return true;

  // Electricity & water: Page Hero on every plan (free / 6mo / 1yr).
  if (
    key === "hero" &&
    (opts?.sector === "electricity" || opts?.sector === "water")
  ) {
    return true;
  }

  // Livestock company portal: keep operational tabs; still gate reports by tier.
  if (opts?.isLivestockCompany) {
    if (key === "reports") return tier === "premium" || tier == null;
    return true;
  }

  // No active plan recorded → treat as free (safest).
  const t = tier ?? "free";

  if (t === "free") {
    return false;
  }
  if (t === "standard") {
    // Free/6mo shared: contact + prices (always). 6mo also: Price History.
    return key === "rates5y";
  }
  // premium — all features
  return true;
}

export function companyAdminFeatureDeniedMessage(
  tier: CompanyPlanTier,
  lang: "en" | "so" = "en"
): string {
  if (lang === "so") {
    if (tier === "free") {
      return "Qidmada bilaash ah waxay oggol tahay kaliya xisaabiyaha qiimaha iyo qiimaha hadda. Cusboonaysii qidmada si aad u hesho taariikhda / warbixinnada.";
    }
    if (tier === "standard") {
      return "Qidmadan ma oggola warbixinnada faahfaahsan. Dooro qidmada 1 sano si aad u hesho dhammaan features-ka.";
    }
  }
  if (tier === "free") {
    return "Your free plan only includes the Price Calculator and current price. Upgrade to unlock Price History and Reports.";
  }
  if (tier === "standard") {
    return "Detailed reports require the 1 Year plan. Upgrade to unlock all features.";
  }
  return "This feature is not included in your subscription plan.";
}
