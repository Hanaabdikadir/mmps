"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  SYSTEM_NAME,
  SYSTEM_NAME_SOMALI,
  SYSTEM_SHORT,
} from "@/lib/home-content";
import { parseLang, type Lang } from "@/lib/lang";
import { isKnownTerminology, localizeContent } from "@/lib/content-i18n";

export type { Lang };
export { parseLang };

const LANG_STORAGE_KEY = "mmps-lang";
const LEGACY_LANG_STORAGE_KEY = "smmps-lang";
const LANG_COOKIE = "mmps-lang";
const LANG_CHANGE_EVENT = "mmps-lang-change";

function readCookieLang(): Lang | null {
  try {
    const hit = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${LANG_COOKIE}=`));
    if (!hit) return null;
    return parseLang(decodeURIComponent(hit.slice(LANG_COOKIE.length + 1)));
  } catch {
    return null;
  }
}

function readStoredLang(): Lang {
  try {
    const stored =
      localStorage.getItem(LANG_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_LANG_STORAGE_KEY);
    if (stored === "so" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  return readCookieLang() ?? "en";
}

function persistLang(next: Lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, next);
    localStorage.setItem(LEGACY_LANG_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  document.cookie = `${LANG_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
  document.documentElement.lang = next === "so" ? "so" : "en";
  window.dispatchEvent(new Event(LANG_CHANGE_EVENT));
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (en: string, so: string) => string;
  /** Localize user/catalog content (Awr↔Male Camel, 2jir↔2 years, …). */
  lc: (
    value: string | null | undefined,
    options?: { protect?: string[] }
  ) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => { },
  t: (en) => en,
  lc: (value) => String(value || ""),
});

export function LanguageProvider({
  children,
  initialLang = "en",
  forceLang,
}: {
  children: ReactNode;
  initialLang?: Lang;
  /** Admin / broker consoles stay English without changing the public site language. */
  forceLang?: Lang;
}) {
  const router = useRouter();
  // First paint must match the server (cookie). localStorage is applied after mount.
  const [lang, setLangState] = useState<Lang>(forceLang ?? initialLang);
  const skipPersist = useRef(true);

  useEffect(() => {
    if (forceLang) {
      document.documentElement.lang = "en";
      return () => {
        const restore = readStoredLang();
        document.documentElement.lang = restore === "so" ? "so" : "en";
      };
    }
    const stored = readStoredLang();
    if (stored !== lang) setLangState(stored);
    document.documentElement.lang = stored === "so" ? "so" : "en";
  }, [forceLang]);

  useEffect(() => {
    if (forceLang) return;
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
      localStorage.setItem(LEGACY_LANG_STORAGE_KEY, lang);
      document.cookie = `${LANG_COOKIE}=${lang};path=/;max-age=31536000;samesite=lax`;
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang === "so" ? "so" : "en";
  }, [lang, forceLang]);

  useEffect(() => {
    if (forceLang) return;
    const onChange = () => setLangState(readStoredLang());
    window.addEventListener("storage", onChange);
    window.addEventListener(LANG_CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(LANG_CHANGE_EVENT, onChange);
    };
  }, [forceLang]);

  const setLang = useCallback(
    (l: Lang) => {
      if (forceLang) return;
      persistLang(l);
      router.refresh();
    },
    [forceLang, router]
  );

  const t = useCallback((en: string, so: string): string => {
    return lang === "so" ? so : en;
  }, [lang]);

  // Live translations for free-text content (EN ↔ SO via /api/i18n/translate).
  const [txVersion, setTxVersion] = useState(0);
  const txCache = useRef<Map<string, string>>(new Map());
  const txPending = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Drop pending when language changes; keep cache keys scoped by lang.
    txPending.current.clear();
  }, [lang]);

  const lc = useCallback(
    (value: string | null | undefined, options?: { protect?: string[] }): string => {
      const text = String(value || "").trim();
      if (!text) return "";

      // MMPS dictionary (instant)
      if (isKnownTerminology(text)) {
        return localizeContent(text, lang);
      }

      const protect = (options?.protect || [])
        .map((p) => String(p || "").trim())
        .filter(Boolean)
        .slice(0, 12);
      const cacheKey = `${lang}::${text}::${protect.join("|")}`;
      const cached = txCache.current.get(cacheKey);
      if (cached) return cached;

      // Kick off API translation once; re-render when ready
      if (typeof window !== "undefined" && !txPending.current.has(cacheKey)) {
        txPending.current.add(cacheKey);
        void fetch("/api/i18n/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, targetLang: lang, protect }),
        })
          .then((res) => res.json())
          .then((data: { translated?: string }) => {
            const translated = String(data?.translated || text).trim() || text;
            txCache.current.set(cacheKey, translated);
            txPending.current.delete(cacheKey);
            setTxVersion((v) => v + 1);
          })
          .catch(() => {
            txCache.current.set(cacheKey, text);
            txPending.current.delete(cacheKey);
          });
      }

      return localizeContent(text, lang) || text;
    },
    // txVersion forces lc identity refresh after cache fills
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, txVersion]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, lc }),
    [lang, setLang, t, lc]
  );

  return (
    <LangContext.Provider value={value}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

// ─── All UI text translations ────────────────────────────────────────────────
export const TRANSLATIONS = {
  nav: {
    home: { en: "Home", so: "Bogga Hore" },
    livestock: { en: "Livestock", so: "Xoolaha" },
    water: { en: "Water", so: "Biyaha" },
    electricity: { en: "Electricity", so: "Korontada" },
  },
  auth: {
    register: { en: "Register", so: "Isdiiwaangeli" },
    signIn: { en: "Sign In", so: "Soo gal" },
    signOut: { en: "Sign out", so: "Ka Bax" },
    joinRegisterNow: {
      en: "Register",
      so: "Isdiiwaangeli",
    },
  },
  register: {
    registrationForm: { en: "Register", so: "Isdiiwaangeli" },
    selectSection: {
      en: "Please select your account type",
      so: "Fadlan, dooro nooca akoonkaaga",
    },
    signUpIntroHint: {
      en: "Create your MMPS account in a few steps",
      so: "Samee akoonkaaga MMPS dhawr tallaabo gudahood",
    },
    signUpCta: { en: "Register", so: "Isdiiwaangeli" },
    signUpCtaHint: {
      en: "Continue to choose Company or Livestock Market Broker",
      so: "Sii wad si aad u doorato Shirkad ama Dulaaley Suuqa Xoolaha",
    },
    registerAsCompany: { en: "Company", so: "Shirkad" },
    registerAsCompanyHint: {
      en: "Water or electricity supply providers",
      so: "Bixiyeyaasha biyaha ama korontada",
    },
    registerAsBroker: {
      en: "Livestock Market Broker",
      so: "Dulaaleyda Suuqa Xoolaha",
    },
    registerAsBrokerHint: {
      en: "Choose your market and livestock types (one, two, or all).",
      so: "Dooro suuqaaga iyo noocyada xoolaha (hal, laba, ama dhammaan).",
    },
    companyTypeForm: { en: "Company type form", so: "Foomka nooca shirkadda" },
    selectCompanyType: {
      en: "Please, select your preferred company type",
      so: "Fadlan, dooro nooca shirkadda aad doorbidaysid",
    },
    waterSupplyCompany: {
      en: "Water Supply Company",
      so: "Shirkadda Biyaha",
    },
    electricitySupplyCompany: {
      en: "Electricity Supply Company",
      so: "Shirkadda Korontada",
    },
    livestockMarketSection: {
      en: "Livestock Type",
      so: "Nooca Xoolaha",
    },
    selectLivestockSection: {
      en: "Select one, two, or all livestock types admin added to the market",
      so: "Dooro hal, laba, ama dhammaan noocyada xoolaha admin ku daray suuqa",
    },
    selectAllLivestockTypes: {
      en: "Select all types",
      so: "Dooro dhammaan noocyada",
    },
    allLivestockTypes: {
      en: "All livestock types",
      so: "Dhammaan noocyada xoolaha",
    },
    camelMarketSection: { en: "Camels", so: "Geel" },
    cattleMarketSection: { en: "Cattle", so: "Lo'da" },
    goatMarketSection: { en: "Sheep & Goats", so: "Ari & Ido" },
    livestockMarket: {
      en: "Livestock Market",
      so: "Suuqa Xoolaha",
    },
    selectLivestockMarket: {
      en: "Select your livestock market",
      so: "Dooro suuqa xoolahaaga",
    },
    brokerMarketInfo: {
      en: "Market assignment",
      so: "U qoondeynta suuqa",
    },
    accountDetails: { en: "Account details", so: "Faahfaahinta akoonka" },
    completeDetails: {
      en: "Enter your details to finish registration",
      so: "Geli macluumaadkaaga si aad u dhammaystirto isdiiwaangelinta",
    },
    personalInfo: {
      en: "Personal information",
      so: "Macluumaadka shakhsiyeed",
    },
    profilePhoto: {
      en: "Profile photo",
      so: "Sawirka astaanta",
    },
    companyLogo: {
      en: "Company logo",
      so: "Astaanta shirkadda",
    },
    firstName: { en: "First name", so: "Magaca koowaad" },
    lastName: { en: "Last name", so: "Magaca dambe" },
    email: { en: "Email", so: "Iimayl" },
    phone: { en: "Phone number", so: "Lambarka telefoonka" },
    phonePlaceholder: {
      en: "+252 61 xxx xxxx",
      so: "+252 61 xxx xxxx",
    },
    password: { en: "Password", so: "Furaha sirta" },
    confirmPassword: {
      en: "Confirm password",
      so: "Xaqiiji furaha sirta",
    },
    enterPassword: {
      en: "Enter your password",
      so: "Geli furaha sirta",
    },
    retypePassword: {
      en: "Re-type your password",
      so: "Ku celi furaha sirta",
    },
    forgotPassword: {
      en: "Forgot password?",
      so: "Ma illowday furaha sirta?",
    },
    upload: { en: "Upload", so: "Soo geli" },
    replace: { en: "Replace", so: "Beddel" },
    uploadPhoto: { en: "Upload photo", so: "Soo geli sawir" },
    uploadPhotoHint: {
      en: "Clear photo of yourself",
      so: "Sawir cad oo adiga ah",
    },
    uploadCompanyLogo: {
      en: "Upload company logo",
      so: "Soo geli astaanta shirkadda",
    },
    uploadCompanyLogoHint: {
      en: "Optional now. After admin accepts you, upload the logo when you sign in.",
      so: "Hadda waa ikhtiyaari. Marka admin ku aqbalo, soo geli astaanta markaad gasho.",
    },
    companyLogoOptionalHint: {
      en: "Optional. You can upload the company logo after your account is accepted.",
      so: "Ikhtiyaari. Astaanta shirkadda waad soo gelin kartaa ka dib marka akoonkaaga la aqbalo.",
    },
    profilePhotoOptionalHint: {
      en: "Optional. You can add a profile photo now or later from your broker profile.",
      so: "Ikhtiyaari. Sawirka profile-ka hadda waad soo gelin kartaa, ama mar dambe profile-kaaga.",
    },
    companyInfo: { en: "Company information", so: "Macluumaadka shirkadda" },
    companyName: { en: "Company name", so: "Magaca shirkadda" },
    companyNamePlaceholder: {
      en: "Legal name as on business license",
      so: "Magaca sharciga ah sida ku qoran shatiyaha ganacsiga",
    },
    companyType: { en: "Company type", so: "Nooca shirkadda" },
    companyTypeHint: {
      en: "Water supply, electricity supply, or livestock market company",
      so: "Shirkadda biyaha, korontada, ama suuqa xoolaha",
    },
    selectCompanyTypePanel: {
      en: "Select Company Type",
      so: "Dooro Nooca Shirkadda",
    },
    livestockMarketCompany: {
      en: "Livestock Market Company",
      so: "Shirkadda Suuqa Xoolaha",
    },
    districtBanadir: { en: "District (Banadir)", so: "Degmada (Banaadir)" },
    districtBanadirRegion: {
      en: "District (Banadir Region)",
      so: "Degmada (Gobolka Banaadir)",
    },
    districtHint: {
      en: "Select your district within Banadir Region",
      so: "Dooro degmadaada ee Gobolka Banaadir",
    },
    selectDistrict: { en: "Select district", so: "Dooro degmada" },
    companyEmail: { en: "Company email", so: "Iimaylka shirkadda" },
    companyEmailHint: {
      en: "Official company contact email for MMPS",
      so: "Iimaylka xiriirka rasmiga ah ee shirkadda ee MMPS",
    },
    companyAddress: { en: "Company address", so: "Cinwaanka shirkadda" },
    companyAddressPlaceholder: {
      en: "Street, building, market, or landmark",
      so: "Waddada, dhismaha, suuqa, ama calaamada",
    },
    companyAddressHint: {
      en: "Street, building, market, or landmark in your district",
      so: "Waddada, dhismaha, suuqa, ama calaamada ee degmadaada",
    },
    uploadDocs: { en: "Required documents", so: "Dukumentiyada loo baahan yahay" },
    companyLivestockBroker: {
      en: "Company livestock broker (optional documents)",
      so: "Dulaale shirkadeed (dukumentiyo ikhtiyaari ah)",
    },
    companyLivestockBrokerHint: {
      en: "Turn this on only if you represent a livestock company. Extra business documents will appear below. Individual brokers can skip this.",
      so: "Shid kaliya haddii aad matasho shirkad xoolo. Dukumentiyada shirkadda ayaa hoos ka soo muuqanaya. Dulaalaha shakhsiga ah wuu ka boodi karaa.",
    },
    uploadDocsAccess: {
      en: "Upload required documents to get access to MMPS",
      so: "Soo geli dukumentiyada loo baahan yahay si aad u hesho gelitaanka MMPS",
    },
    uploadDocsForSector: {
      en: "Upload all required documents",
      so: "Soo geli dhammaan dukumentiyada loo baahan yahay",
    },
    registrationWord: { en: "registration", so: "isdiiwaangelinta" },
    companyRegRequirements: {
      en: "Company registration requirements",
      so: "Shuruudaha isdiiwaangelinta shirkadda",
    },
    requiredUploads: {
      en: "Required uploads:",
      so: "Soo gelinta loo baahan yahay:",
    },
    uploadMatchingDocs: {
      en: "Upload matching documents on the next step. Admin will verify your company before dashboard access is granted.",
      so: "Soo geli dukumentiyada iswaafaqsan tallaabada xigta. admin ayaa xaqiijin doona shirkaddaada ka hor inta aan la siinin gelitaanka dashboard-ka.",
    },
    pickSectorHint: {
      en: "Pick a sector using the cards above",
      so: "Dooro qayb adigoo isticmaalaya kaararka kore",
    },
    uploadIdentification: {
      en: "Identification",
      so: "Aqoonsiga",
    },
    uploadIdentificationHint: {
      en: "National ID or passport (optional)",
      so: "Aqoonsiga qaran ama baasaboor (ikhtiyaari)",
    },
    fileHintImage: {
      en: "JPG, PNG or WEBP · max 5 MB",
      so: "JPG, PNG ama WEBP · ugu badnaan 5 MB",
    },
    fileHintDocs: {
      en: "PDF, JPG, PNG, WEBP · max 5 MB",
      so: "PDF, JPG, PNG, WEBP · ugu badnaan 5 MB",
    },
    fileHintDocsOr: {
      en: "PNG, JPG, WEBP or PDF · max 5 MB",
      so: "PNG, JPG, WEBP ama PDF · ugu badnaan 5 MB",
    },
    clearCompanyLogoHint: {
      en: "Clear company logo (JPG, PNG or WEBP, max 5 MB)",
      so: "Astaanta shirkadda oo cad (JPG, PNG ama WEBP, ugu badnaan 5 MB)",
    },
    companyLogoUploadHint: {
      en: "Upload a clear company logo for your MMPS provider profile after approval.",
      so: "Soo geli astaanta shirkadda oo cad oo loogu talagalay profile-ka bixiyaha MMPS ka dib ansixinta.",
    },
    optional: { en: "optional", so: "ikhtiyaari" },
    remove: { en: "Remove", so: "Ka saar" },
    removeFile: { en: "Remove file", so: "Ka saar faylka" },
    applicationProgress: {
      en: "Application progress",
      so: "Horumarka codsiga",
    },
    of: { en: "of", so: "ka mid ah" },
    documentsUploaded: {
      en: "documents uploaded",
      so: "dukumenti la soo geliyay",
    },
    requiredUpload: {
      en: "required upload",
      so: "soo gelin loo baahan yahay",
    },
    complete: { en: "Complete", so: "Dhammaystiran" },
    companyDetails: { en: "Company details", so: "Faahfaahinta shirkadda" },
    completeFiveFields: {
      en: "Complete all five fields on the form",
      so: "Buuxi dhammaan shanta goobood ee foomka",
    },
    forWord: { en: "for", so: "ee" },
    tip: { en: "Tip:", so: "Talo:" },
    companyTypeTip: {
      en: "Company type sets your MMPS sector (Xoolaha, Korontada, or Biyaha). Use the same legal name as on your documents.",
      so: "Nooca shirkadda ayaa go'aamiya qaybtaada MMPS (Xoolaha, Korontada, ama Biyaha). Isticmaal isla magaca sharciga ah ee dukumentiyadaada.",
    },
    detailsProgress: { en: "Details progress", so: "Horumarka faahfaahinta" },
    fieldsCompleted: {
      en: "fields completed",
      so: "goobood oo la buuxiyay",
    },
    companyDetailsSummary: {
      en: "Company details (summary)",
      so: "Faahfaahinta shirkadda (kooban)",
    },
    registerButton: { en: "Register", so: "Isdiiwaangeli" },
    continue: { en: "Continue", so: "Sii wad" },
    back: { en: "Back", so: "Dib u noqo" },
    alreadyHaveAccount: { en: "Already have an account?", so: "Horey ma u leedahay akoon?" },
    signIn: { en: "Sign In to Your Account", so: "Soo gal akoonkaaga" },
    stepSection: { en: "Account", so: "Akoon" },
    stepType: { en: "Type", so: "Nooc" },
    stepDetails: { en: "Details", so: "Faahfaahin" },
    waitingApproval: { en: "Waiting for approval", so: "Sugaya ansixinta" },
    accountSection: { en: "Account", so: "Akoonka" },
    statusLabel: { en: "Status", so: "Xaaladda" },
    requestFeedback: { en: "Request feedback", so: "Codso jawaab celin" },
    pendingBlurb: {
      en: "Awaiting admin review. After approval you will get an MMPS subscription to enter live prices.",
      so: "Waxaa la sugayaa dib-u-eegista admin. Marka la ansixiyo waxaad heli doontaa qidmad MMPS si aad u geliso qiimaha.",
    },
    reviewDays: {
      en: "Usually 1–3 business days",
      so: "Caadi ahaan 1–3 maalmood oo shaqo",
    },
    goToHome: { en: "Home", so: "Bogga hore" },
    registeredAs: { en: "Registered email", so: "Emailka diiwaangelinta" },
    approvedStatus: { en: "Approved", so: "La ansixiyay" },
    rejectedStatus: { en: "Rejected", so: "La diiday" },
    underReviewStatus: { en: "Under review", so: "Dib-u-eegis ku jira" },
    approvedHeadline: { en: "Account approved", so: "Akoonka waa la ansixiyay" },
    rejectedHeadline: { en: "Request rejected", so: "Codsiga waa la diiday" },
    approvedBlurb: {
      en: "You can sign in now",
      so: "Hadda waad soo geli kartaa",
    },
    rejectedBlurb: {
      en: "",
      so: "",
    },
    approvedNext: {
      en: "",
      so: "",
    },
    rejectedNext: {
      en: "",
      so: "",
    },
    signInManageAccount: {
      en: "Sign in",
      so: "Soo gal",
    },
    signInTrackProgress: {
      en: "Sign in to track",
      so: "Soo gal oo eeg",
    },
    reapplyRegister: { en: "Re-apply", so: "Dib u isdiiwaangeli" },
    viewAccountStatus: {
      en: "View account status",
      so: "Eeg xaaladda akoonka",
    },
    whatHappensNext: { en: "What happens next?", so: "Maxaa xiga" },
    whatHappensNextPending: {
      en: "MMPS admin reviews your company details and documents, then approves or rejects your request",
      so: "Admin MMPS ayaa dib u eega faahfaahinta iyo dukumentiyada shirkaddaada ka dibna ansixiya ama diidaa codsigaaga",
    },
    checkRequestStatus: {
      en: "Check your request status",
      so: "Hubi xaaladda codsigaaga",
    },
    statusCheckBlurb: {
      en: "Enter your registration email to see status",
      so: "Geli iimaylka diiwaangelinta si aad xaaladda u aragto",
    },
    statusEmailLabel: { en: "Registration email", so: "Iimaylka diiwaangelinta" },
    statusEmailPlaceholder: {
      en: "name@gmail.com",
      so: "name@gmail.com",
    },
    statusEmailRequired: {
      en: "Enter your registration email",
      so: "Geli iimaylkaaga diiwaangelinta",
    },
    statusNotFound: {
      en: "No registration found for that email",
      so: "Lama helin diiwaangelin iimaylkaas",
    },
    statusLookupFailed: {
      en: "Could not check status Please try again",
      so: "Lama hubin karin xaaladda Fadlan isku day mar kale",
    },
    checkStatusButton: { en: "Check status", so: "Hubi xaaladda" },
    checkingStatus: { en: "Checking", so: "Waa la hubinayaa" },
    checkAnotherEmail: {
      en: "Check another email",
      so: "Hubi iimayl kale",
    },
    loginPendingRedirect: {
      en: "Waiting for admin approval",
      so: "Waxaa la sugayaa ansixinta admin",
    },
    loginRejectedRedirect: {
      en: "Registration was rejected",
      so: "Diiwaangelinta waa la diiday",
    },
    creatingAccount: {
      en: "Creating your account",
      so: "Waxaan diyaarinaynaa akoonkaaga",
    },
    creatingAccountShort: {
      en: "Creating account",
      so: "Waxaan diyaarinaynaa akoonka",
    },
    securingAccount: {
      en: "Securing your account",
      so: "Waxaan xaqiijinaynaa akoonkaaga",
    },
    uploadingDocuments: {
      en: "Uploading documents",
      so: "Waxaan soo gelinaynaa dukumentiyada",
    },
    submittingToMmps: {
      en: "Submitting to MMPS",
      so: "Codsigaaga ayaa loo gudbinayaa MMPS",
    },
    keepPageOpen: {
      en: "Please keep this page open until submission finishes",
      so: "Fadlan ha xirin boggan illaa gudbintu dhammaato",
    },
    progress: { en: "Progress", so: "Horumar" },
    registrationOptions: {
      en: "Registration options",
      so: "Doorashooyinka diiwaangelinta",
    },
    primarySector: { en: "Primary sector", so: "Qaybta koowaad" },
    selectOptionError: {
      en: "Please select an option to continue.",
      so: "Fadlan dooro doorasho si aad u sii wadato.",
    },
    nameRequired: {
      en: "First name and last name are required.",
      so: "Magaca koowaad iyo magaca dambe waa lagama maarmaan.",
    },
    emailInvalid: {
      en: "Use a Gmail address like name@gmail.com. Numbers are allowed. Do not skip @gmail.com.",
      so: "Isticmaal Gmail sida name@gmail.com. Nambar waa lagu dari karaa. @gmail.com lama dhaafi karo.",
    },
    passwordShort: {
      en: "Password must be at least 8 characters.",
      so: "Furaha sirta waa inuu ahaadaa ugu yaraan 8 xaraf.",
    },
    passwordWeak: {
      en: "Password must include at least one letter and one number.",
      so: "Furaha sirta waa inuu ka kooban yahay ugu yaraan hal xaraf iyo hal nambar.",
    },
    firstNameRequired: {
      en: "First name is required.",
      so: "Magaca koowaad waa lagama maarmaan.",
    },
    firstNameTooShort: {
      en: "First name must be at least 2 characters.",
      so: "Magaca koowaad waa inuu ahaadaa ugu yaraan 2 xaraf.",
    },
    firstNameInvalid: {
      en: "First name may only contain letters, spaces, hyphens, or apostrophes.",
      so: "Magaca koowaad wuxuu ka koobnaan karaa xarfaha, meelaha bannaan, xariijinta, ama apostrophe.",
    },
    lastNameRequired: {
      en: "Last name is required.",
      so: "Magaca dambe waa lagama maarmaan.",
    },
    lastNameTooShort: {
      en: "Last name must be at least 2 characters.",
      so: "Magaca dambe waa inuu ahaadaa ugu yaraan 2 xaraf.",
    },
    lastNameInvalid: {
      en: "Last name may only contain letters, spaces, hyphens, or apostrophes.",
      so: "Magaca dambe wuxuu ka koobnaan karaa xarfaha, meelaha bannaan, xariijinta, ama apostrophe.",
    },
    emailRequired: {
      en: "Email is required.",
      so: "Iimaylka waa lagama maarmaan.",
    },
    passwordRequired: {
      en: "Password is required.",
      so: "Furaha sirta waa lagama maarmaan.",
    },
    fileTooLarge: {
      en: "File must be 5 MB or smaller.",
      so: "Faylka waa inuu ahaadaa 5 MB ama ka yar.",
    },
    fileTypeImage: {
      en: "File must be JPG, PNG, or WEBP.",
      so: "Faylka waa inuu ahaadaa JPG, PNG, ama WEBP.",
    },
    fileTypeDocument: {
      en: "File must be PDF, JPG, PNG, or WEBP.",
      so: "Faylka waa inuu ahaadaa PDF, JPG, PNG, ama WEBP.",
    },
    companyNameTooShort: {
      en: "Company name must be at least 2 characters.",
      so: "Magaca shirkadda waa inuu ahaadaa ugu yaraan 2 xaraf.",
    },
    companyAddressTooShort: {
      en: "Company address must be at least 5 characters.",
      so: "Cinwaanka shirkadda waa inuu ahaadaa ugu yaraan 5 xaraf.",
    },
    docBusinessLicenseRequired: {
      en: "Business registration certificate is required.",
      so: "Shahaadada diiwaangelinta ganacsiga waa lagama maarmaan.",
    },
    docIdPassportRequired: {
      en: "ID / passport is required.",
      so: "Aqoonsiga / baasaboorka waa lagama maarmaan.",
    },
    docPersonalPhotoRequired: {
      en: "Personal photo is required.",
      so: "Sawirka shakhsiyeed waa lagama maarmaan.",
    },
    fixHighlightedFields: {
      en: "Please fix the highlighted fields.",
      so: "Fadlan sax goobaha la calaamadeeyay.",
    },
    photoRequired: {
      en: "Please upload a photo.",
      so: "Fadlan soo geli sawir.",
    },
    companyLogoRequired: {
      en: "Please upload a company logo.",
      so: "Fadlan soo geli astaanta shirkadda.",
    },
    docsRequired: {
      en: "Upload all required documents.",
      so: "Soo geli dhammaan dukumentiyada loo baahan yahay.",
    },
    companyNameRequired: {
      en: "Company name is required.",
      so: "Magaca shirkadda waa lagama maarmaan.",
    },
    companyTypeRequired: {
      en: "Please select a company type.",
      so: "Fadlan dooro nooca shirkadda.",
    },
    districtRequired: {
      en: "Please select a Banadir district.",
      so: "Fadlan dooro degmo ka mid ah Banaadir.",
    },
    companyAddressRequired: {
      en: "Company address is required.",
      so: "Cinwaanka shirkadda waa lagama maarmaan.",
    },
    companyEmailRequired: {
      en: "Company email address is required.",
      so: "Iimaylka shirkadda waa lagama maarmaan.",
    },
    companyEmailInvalid: {
      en: "Enter a valid company email like name@gmail.com",
      so: "Geli iimayl shirkadeed sax ah sida name@gmail.com",
    },
    companyEmailGmail: {
      en: "Company email cannot use @gmail.com — use your company domain.",
      so: "Iimaylka shirkadda ma isticmaali karo @gmail.com — isticmaal domain-ka shirkadda.",
    },
    registrationFailed: {
      en: "Registration failed",
      so: "Diiwaangelintu waa fashilantay",
    },
    registrationSubmitted: {
      en: "Registration submitted. An administrator must approve your account before you can sign in.",
      so: "Diiwaangelinta waa la gudbiyay. Maamule ayaa ansixinaya akoonkaaga ka hor intaadan soo geli karin.",
    },
    reviewAccount: { en: "Account", so: "Akoonka" },
    reviewCompany: { en: "Company", so: "Shirkadda" },
    reviewName: { en: "Name", so: "Magaca" },
    reviewPhone: { en: "Phone", so: "Telefoon" },
    reviewType: { en: "Type", so: "Nooc" },
    reviewDistrict: { en: "District", so: "Degmo" },
    reviewAddress: { en: "Address", so: "Cinwaan" },
    reviewSector: { en: "Sector", so: "Qayb" },
    reviewLogo: { en: "Logo", so: "Astaanta" },
    reviewAndSubmit: { en: "Review & submit", so: "Dib u eeg & gudbi" },
    beforeYouSubmit: {
      en: "Before you submit:",
      so: "Ka hor intaad gudbiso:",
    },
    beforeYouSubmitBlurb: {
      en: "Check your details below. If everything looks correct, submit your application for admin approval.",
      so: "Hubi faahfaahintaada hoose. Haddii wax walba sax yihiin, gudbi codsigaaga si admin uu u ansixiyo.",
    },
    subscriptionNoticeTitle: {
      en: "Subscription plan",
      so: "Qidmada",
    },
    subscriptionNoticeCompany: {
      en: "After admin approval, your company account receives this MMPS subscription. An active subscription is required to enter and update live market prices.",
      so: "Marka admin ansixiyo, akoonka shirkaddaadu wuxuu heli doonaa qidmadan MMPS. Qidmad firfircoon ayaa loo baahan yahay si aad u geliso oo u cusboonaysiiso qiimaha suuqa.",
    },
    subscriptionNoticeBroker: {
      en: "After admin approval, your broker account receives this MMPS subscription. An active subscription is required to enter and update livestock prices.",
      so: "Marka admin ansixiyo, akoonka dulaalahaagu wuxuu heli doonaa qidmadan MMPS. Qidmad firfircoon ayaa loo baahan yahay si aad u geliso oo u cusboonaysiiso qiimaha xoolaha.",
    },
    subscriptionPlanName: { en: "Plan", so: "Qidmad" },
    subscriptionPlanPrice: { en: "Price", so: "Qiimo" },
    subscriptionPlanDuration: { en: "Duration", so: "Muddo" },
    subscriptionPlanDays: { en: "days", so: "maalmood" },
    subscriptionAccept: {
      en: "I accept this subscription plan and want to continue registration.",
      so: "Waan aqbalayaa qidmadan oo waxaan rabaa inaan isdiiwaangeliyo.",
    },
    subscriptionMustAccept: {
      en: "Accept the subscription plan to register, or decline to cancel.",
      so: "Aqbal qidmada si aad u isdiiwaangeliso, ama diid si aad u joojiso.",
    },
    subscriptionDecline: {
      en: "Decline & cancel",
      so: "Diid & jooji",
    },
    subscriptionNoPlan: {
      en: "No active subscription plan is available. Contact the administrator before registering.",
      so: "Qidmad firfircoon ma jirto. La xidhiidh maamulaha ka hor intaadan isdiiwaangelin.",
    },
    reviewDocuments: { en: "Documents", so: "Dukumentiyada" },
    notProvided: { en: "Not provided", so: "Lama bixin" },
    notUploaded: { en: "Not uploaded", so: "Lama soo gelin" },
    missing: { en: "Missing", so: "Maqan" },
    sectorWaterLabel: { en: "Water", so: "Biyaha" },
    sectorElectricityLabel: { en: "Electricity", so: "Korontada" },
    sectorLivestockLabel: { en: "Livestock", so: "Xoolaha" },
    sectorWaterSubtitle: {
      en: "Water Utilities · Live Mogadishu Prices",
      so: "Adeegyada Biyaha · Qiimaha Muqdisho Tooska ah",
    },
    sectorElectricitySubtitle: {
      en: "Electricity Utilities · Live Mogadishu Prices",
      so: "Adeegyada Korontada · Qiimaha Muqdisho Tooska ah",
    },
    sectorLivestockSubtitle: {
      en: "Livestock Markets · Live Mogadishu Prices",
      so: "Suuqyada Xoolaha · Qiimaha Muqdisho Tooska ah",
    },
  },
  home: {
    tagline: { en: "Live Mogadishu Market Prices", so: "Qiimaha Suuqa Muqdisho Tooska ah" },
    mission: {
      en: "Provides information about utility prices (water and electricity) and livestock prices in Mogadishu, Somalia.",
      so: "Wuxuu bixiyaa xog ku saabsan qiimaha adeegyada (biyaha iyo korontada) iyo qiimaha xoolaha ee Muqdisho, Soomaaliya.",
    },
    location: { en: "Mogadishu, Banadir, Somalia", so: "Muqdisho, Banaadir, Soomaaliya" },
    livestock: { en: "Livestock", so: "Xoolaha" },
    water: { en: "Water", so: "Biyaha" },
    electricity: { en: "Electricity", so: "Korontada" },
  },
  listing: {
    broker: { en: "Broker", so: "Dulaal" },
    unknownBroker: { en: "Unknown broker", so: "Dulaal lama cayimin" },
    unknownMarket: { en: "Livestock Market", so: "Suuqa Xoolaha" },
    noPhone: { en: "No phone", so: "Lambarka lama gelin" },
    noEmail: { en: "No email", so: "Gmail lama gelin" },
    markets: { en: "markets", so: "suuq" },
    viewPhoto: { en: "View photo", so: "Daawo sawirka" },
    photo: { en: "Photo", so: "Sawirka" },
    close: { en: "Close", so: "Xir" },
  },
  footer: {
    blurb: {
      en: `${SYSTEM_SHORT} — ${SYSTEM_NAME}. Live market prices for livestock, water supply, and electricity across Banadir.`,
      so: `${SYSTEM_NAME_SOMALI} (${SYSTEM_SHORT}). Qiimaha tooska ah ee suuqa xoolaha, biyaha, iyo korontada gobolka Banaadir.`,
    },
  },
  sections: {
    livestock: { en: "Livestock Prices", so: "Sicirka Xoolaha" },
    water: { en: "Water Providers", so: "Shirkadaha Biyaha" },
    electricity: { en: "Electricity Providers", so: "Shirkadaha Korontada" },
    viewAll: { en: "View All", so: "Dhammaan Arag" },
    currentPrice: { en: "Current Price", so: "Qiimaha Hadda" },
    updated: { en: "Updated", so: "La Cusboonaysiiyay" },
    perUnit: { en: "per unit", so: "hal mid" },
  },
  reports: {
    title: { en: "Compare Market Prices", so: "Is barbardhig sicirka suuqa" },
  },
  water: {
    title: { en: "Water Supply", so: "Adeegga Biyaha" },
    rate: { en: "Rate", so: "Qiimaha" },
    change: { en: "Change", so: "Isbeddel" },
    year: { en: "Year", so: "Sanad" },
    priceHistory: { en: "Price History", so: "Taariikhda Qiimaha" },
    currentRate: { en: "Current Rate", so: "Qiimaha Hadda" },
    fiveYearChange: { en: "Rate Change", so: "Isbeddelka Qiimaha" },
    totalIncrease: { en: "Total Increase", so: "Kororka Guud" },
    avgAnnual: { en: "Avg Annual Increase", so: "Celceliska Kororka Sanadlaha" },
    perYear: { en: "Per Year", so: "Sanad kasta" },
    overFiveYears: { en: "Across rate history", so: "Guud ahaan taariikhda qiimaha" },
    selectYear: { en: "Select Tariff Year:", so: "Dooro Sanadka Tarifka:" },
    ratesHistory: { en: "Rates History", so: "Taariikhda Qiimayaasha" },
    quickVolume: { en: "QUICK VOLUME (M³)", so: "MUGGA DEGDEGGA (M³)" },
    totalBill: { en: "TOTAL BILL (USD)", so: "LACAGTA GUUD (USD)" },
    currentTariffYear: { en: "Current tariff year", so: "Sanadka tarifka hadda" },
    lastFourYearsTariff: { en: "The Last Four Years", so: "Afartii Sano ee u Dambeeyay" },
    priceUsdPerM3: { en: "Price USD · /m³", so: "Qiimaha USD · /m³" },
    tariffRatesByYear: { en: "Tariff Rates by Year", so: "Qiimaha Tarifka Sanadlaha" },
    officialTariff: { en: "Official tariff", so: "Tarifka rasmiga ah" },
  },
  electricity: {
    title: { en: "Electricity", so: "Korontada" },
    rate: { en: "Rate", so: "Qiimaha" },
    change: { en: "Change", so: "Isbeddel" },
    year: { en: "Year", so: "Sanad" },
    priceHistory: { en: "Price History", so: "Taariikhda Qiimaha" },
    currentRate: { en: "Current Price", so: "Qiimaha Hadda" },
    fiveYearChange: { en: "Rate Change", so: "Isbeddelka Qiimaha" },
    totalIncrease: { en: "Total Increase", so: "Kororka Guud" },
    avgAnnual: { en: "Avg Annual Increase", so: "Celceliska Kororka Sanadlaha" },
    perYear: { en: "Per Year", so: "Sanad kasta" },
    overFiveYears: { en: "Across rate history", so: "Guud ahaan taariikhda qiimaha" },
    selectYear: { en: "Select Tariff Year:", so: "Dooro Sanadka Tarifka:" },
    ratesHistory: { en: "Rates History", so: "Taariikhda Qiimayaasha" },
    quickUsage: { en: "QUICK USAGE (KWH)", so: "ISTICMAALKA DEGDEGGA (KWH)" },
    totalBill: { en: "TOTAL BILL (USD)", so: "LACAGTA GUUD (USD)" },
    currentTariffYear: { en: "Current tariff year", so: "Sanadka tarifka hadda" },
    lastFourYearsTariff: { en: "The Last Four Years", so: "Afartii Sano ee u Dambeeyay" },
    priceUsdPerKwh: { en: "Rates USD · /kWh", so: "Qiimaha USD · /kWh" },
    tariffRatesByTier: {
      en: "Tariff Rates by Usage Tier",
      so: "Qiimaha Tarifka ee Heerarka Isticmaalka",
    },
    officialTariff: { en: "Official tariff", so: "Tarifka rasmiga ah" },
  },
  filters: {
    search: { en: "Search", so: "Raadi" },
    from: { en: "From", so: "Laga bilaabo" },
    to: { en: "To", so: "Ilaa" },
    fromDate: { en: "From date", so: "Taariikhda bilowga" },
    toDate: { en: "To date", so: "Taariikhda dhammaadka" },
    allStatuses: { en: "All statuses", so: "Dhammaan xaaladaha" },
    pending: { en: "Pending", so: "Sugaya" },
    approved: { en: "Approved", so: "La ansixiyay" },
    rejected: { en: "Rejected", so: "La diiday" },
    allMarkets: { en: "All markets", so: "Dhammaan suuqyada" },
    allBrokers: { en: "All brokers", so: "Dhammaan dulaalayaasha" },
  },
  brokerPortal: {
    overview: { en: "Overview", so: "Dulmar" },
    dashboard: { en: "Dashboard", so: "Sahanka" },
    sector: { en: "Sector", so: "Qaybta" },
    market: { en: "Market", so: "Suuqa" },
    overviewHint: {
      en: "Enter First Class and Second Class livestock prices. Once approved, the price will appear on the public page.",
      so: "Geli qiimaha xoolaha Birimo iyo Sugunto. Marka la aqbalo, qiimaha wuxuu kasoo muuqan doonaa bogga dadweynaha",
    },
    brokerProfile: { en: "Broker Profile", so: "Profileka Dulaalka" },
    changePassword: { en: "Change Password", so: "Beddel erayga sirta" },
    subscription: { en: "Subscription", so: "Qidmad" },
    updatePrice: { en: "First Class and Second Class", so: "Birimo / Sugunto" },
    notifications: { en: "Notifications", so: "Ogeysiisyo" },
    priceHistory: { en: "Price History", so: "Taariikhda Qiimaha" },
    myReports: { en: "My Reports", so: "Warbahinadayda" },
    sectorDashboard: { en: "Sector Dashboard", so: "Sahanka Qaybta" },
    brokers: { en: "Brokers", so: "Dulaalayaasha" },
    markets: { en: "Markets", so: "Suuqyada" },
    animalTypes: { en: "Animal Types", so: "Noocyada Xoolaha" },
    allPriceReports: { en: "All Price Reports", so: "Warbixinnada Qiimaha" },
    welcomeBack: { en: "Welcome back", so: "Ku soo dhawoow" },
    logout: { en: "Logout", so: "Ka bax" },
    livestockBroker: { en: "Livestock Broker", so: "Dulaal Xoolaha" },
    open: { en: "Open", so: "Fur" },
    yourAccount: { en: "Your account", so: "Akoonkaaga" },
    profileHint: {
      en: "Name, photo, and contact",
      so: "Magaca, sawirka, iyo xiriirka",
    },
    updateHint: {
      en: "Enter First Class and Second Class prices",
      so: "Geli qiimaha Birimo iyo Sugunto",
    },
    pendingHint: { en: "pending — enter a new price", so: "sugaya — geli qiimo cusub" },
    approvedPrices: { en: "Approved prices", so: "Qiimaha la aqbalay" },
    liveAll: { en: "live · all", so: "toos · dhammaan" },
    publicPage: { en: "Public page", so: "Bogga dadweynaha" },
    publicHint: {
      en: "The public market page",
      so: "Bogga dadweynaha ee suuqa",
    },
    priceHistoryHint: {
      en: "Your live prices. Edit + Save: the new price goes Pending until an admin accepts it.",
      so: "Qiimahaaga tooska ah. Edit + Save: qiimaha cusub wuxuu aadaa Pending ilaa admin aqbalo.",
    },
    loading: { en: "Loading...", so: "Waa la soo dejinayaa..." },
    noLivePrices: {
      en: "No live prices yet. When an admin accepts them, they appear in Price History.",
      so: "Weli qiimo toos ah ma jiro. Marka admin aqbalo, Taariikhda Qiimaha ayay ka soo baxaan.",
    },
    chatHint: {
      en: "Tap Chat to send a message to admin. Only you will see the reply.",
      so: "Taabo Wada hadal si aad admin ugu dirto fariin. Jawaabta adiga keliya ayaa arki doona.",
    },
    chat: { en: "Chat", so: "Wada hadal" },
    close: { en: "Close", so: "Xidh" },
    unread: { en: "unread", so: "aan la akhriyin" },
    markAllRead: { en: "Mark all read", so: "Akhri dhammaan" },
    clearAll: { en: "Clear all", so: "Tirtir dhammaan" },
    noNotifications: { en: "No notifications.", so: "Ogeysiis ma jiro." },
    fixAndResubmit: { en: "Fix and resubmit", so: "Sax oo dib u gudbi" },
  },
} as const;
