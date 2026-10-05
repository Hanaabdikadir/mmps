import { normalizeBanadirDistrict } from "@/lib/banadir-districts";
import {
  isCompanyRegistrationType,
} from "@/lib/company-registration";
import {
  emailFormatIssue,
  isBlockedCompanyEmailDomain,
  isGmailAddress,
  isValidRegisterEmail,
} from "@/lib/email";
import type { RegistrationKind } from "@/lib/register-flow";
import {
  requiredDocumentIds,
  type CompanyRegistrationSector,
  type RegistrationDocumentId,
} from "@/lib/registration-requirements";

/** Avoid importing client `language-context` from server routes. */
export type RegisterLang = "en" | "so";

/** Max upload size for registration files (logo, photo, documents). */
export const REGISTER_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const REGISTER_PASSWORD_MIN_LENGTH = 8;

/** Company address minimum after trim. */
export const REGISTER_COMPANY_ADDRESS_MIN = 5;

/** Person / company name minimum after trim. */
export const REGISTER_NAME_MIN = 2;

/** Latin letters (incl. Somali Latin) + spaces / hyphens / apostrophes. */
const PERSON_NAME_RE =
  /^(?=.{2,80}$)[\p{L}](?:[\p{L}\s'.’-]*[\p{L}])?$/u;

export { isValidRegisterEmail } from "@/lib/email";

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const DOC_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const DOC_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

export type RegisterFieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "password"
  | "confirmPassword"
  | "photo"
  | "companyName"
  | "companyType"
  | "companyDistrict"
  | "companyEmail"
  | "companyAddress"
  | "livestockMarketId"
  | "doc_business_license"
  | "doc_id_passport"
  | "doc_personal_photo"
  | "doc_payment_receipt";

export type RegisterErrorCode =
  | "firstNameRequired"
  | "firstNameTooShort"
  | "firstNameInvalid"
  | "lastNameRequired"
  | "lastNameTooShort"
  | "lastNameInvalid"
  | "emailRequired"
  | "emailInvalid"
  | "emailMissingAt"
  | "emailMissingDomain"
  | "emailTrailingJunk"
  | "emailMustBeGmail"
  | "phoneRequired"
  | "phoneInvalid"
  | "phoneTooLong"
  | "passwordRequired"
  | "passwordShort"
  | "passwordWeak"
  | "confirmPasswordRequired"
  | "passwordMismatch"
  | "photoRequired"
  | "companyLogoRequired"
  | "fileTooLarge"
  | "fileTypeImage"
  | "fileTypeDocument"
  | "companyNameRequired"
  | "companyNameTooShort"
  | "companyTypeRequired"
  | "districtRequired"
  | "companyAddressRequired"
  | "companyAddressTooShort"
  | "companyEmailRequired"
  | "companyEmailInvalid"
  | "companyEmailGmail"
  | "livestockMarketRequired"
  | "docsRequired"
  | "docBusinessLicenseRequired"
  | "docIdPassportRequired"
  | "docPersonalPhotoRequired"
  | "docPaymentReceiptRequired"
  | "selectOptionError"
  | "fullNameRequired"
  | "emailAlreadyRegistered"
  | "registrationFailed";

export type BilingualMessage = { en: string; so: string };

export const REGISTER_ERROR_MESSAGES: Record<RegisterErrorCode, BilingualMessage> =
{
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
  emailInvalid: {
    en: "Enter a valid email like name@gmail.com",
    so: "Geli iimayl sax ah sida name@gmail.com",
  },
  emailMissingAt: {
    en: "Email must include @, for example name@gmail.com",
    so: "Iimaylku waa inuu lahaadaa @, tusaale name@gmail.com",
  },
  emailMissingDomain: {
    en: "Email must include a domain like @gmail.com — do not skip it",
    so: "Iimaylku waa inuu lahaadaa @gmail.com — lama dhaafi karo",
  },
  emailTrailingJunk: {
    en: "Do not add numbers after .com — use name@gmail.com",
    so: "Ha ku darin nambar .com ka dib — isticmaal name@gmail.com",
  },
  emailMustBeGmail: {
    en: "Use a Gmail address like name@gmail.com. Numbers are allowed (name123@gmail.com). Do not skip @gmail.com.",
    so: "Isticmaal Gmail sida name@gmail.com. Nambar waa lagu dari karaa (name123@gmail.com). @gmail.com lama dhaafi karo.",
  },
  phoneRequired: {
    en: "Phone number is required.",
    so: "Lambarka telefoonka waa lagama maarmaan.",
  },
  phoneInvalid: {
    en: "Phone numbers cannot include letters. Use digits only.",
    so: "Lambarka telefoonka xaraf ma yeelan karo. Kaliya nambar geli.",
  },
  phoneTooLong: {
    en: "Phone number cannot be more than 12 digits.",
    so: "Lambarka kama badnaan karo 12 tiro.",
  },
  passwordRequired: {
    en: "Password is required.",
    so: "Furaha sirta waa lagama maarmaan.",
  },
  passwordShort: {
    en: "Password must be at least 8 characters.",
    so: "Furaha sirta waa inuu ahaadaa ugu yaraan 8 xaraf.",
  },
  passwordWeak: {
    en: "Password must include at least one letter and one number.",
    so: "Furaha sirta waa inuu ka kooban yahay ugu yaraan hal xaraf iyo hal nambar.",
  },
  confirmPasswordRequired: {
    en: "Please re-type your password.",
    so: "Fadlan ku celi furaha sirta.",
  },
  passwordMismatch: {
    en: "Passwords do not match.",
    so: "Furaha sirta isma waafaqaan.",
  },
  photoRequired: {
    en: "Please upload a photo.",
    so: "Fadlan soo geli sawir.",
  },
  companyLogoRequired: {
    en: "Please upload a company logo.",
    so: "Fadlan soo geli astaanta shirkadda.",
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
  companyNameRequired: {
    en: "Company name is required.",
    so: "Magaca shirkadda waa lagama maarmaan.",
  },
  companyNameTooShort: {
    en: "Company name must be at least 2 characters.",
    so: "Magaca shirkadda waa inuu ahaadaa ugu yaraan 2 xaraf.",
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
  companyAddressTooShort: {
    en: "Company address must be at least 5 characters.",
    so: "Cinwaanka shirkadda waa inuu ahaadaa ugu yaraan 5 xaraf.",
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
  livestockMarketRequired: {
    en: "Please select a livestock market.",
    so: "Fadlan dooro suuqa xoolaha.",
  },
  docsRequired: {
    en: "Upload all required documents.",
    so: "Soo geli dhammaan dukumentiyada loo baahan yahay.",
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
  docPaymentReceiptRequired: {
    en: "Payment receipt screenshot is required (EVC 0619643334).",
    so: "Sawirka risiidka lacag-bixinta waa lagama maarmaan (EVC 0619643334).",
  },
  selectOptionError: {
    en: "Please select an option to continue.",
    so: "Fadlan dooro doorasho si aad u sii wadato.",
  },
  fullNameRequired: {
    en: "Full name, email, and password are required.",
    so: "Magaca buuxa, iimaylka, iyo furaha sirta waa lagama maarmaan.",
  },
  emailAlreadyRegistered: {
    en: "Email already registered.",
    so: "Iimaylkan horey ayaa loo diiwaangeliyay.",
  },
  registrationFailed: {
    en: "Registration failed.",
    so: "Isdiiwaangelintu waa fashilantay.",
  },
};

export function registerErrorMessage(
  code: RegisterErrorCode,
  lang: RegisterLang = "en"
): string {
  return REGISTER_ERROR_MESSAGES[code][lang];
}

/** Resolve API `{ code }` or English `error` to the active language. */
export function resolveRegisterApiError(
  data: { error?: string; code?: string },
  lang: RegisterLang
): string {
  const code = data.code as RegisterErrorCode | undefined;
  if (code && code in REGISTER_ERROR_MESSAGES) {
    return registerErrorMessage(code, lang);
  }
  return data.error?.trim() || registerErrorMessage("registrationFailed", lang);
}

export function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function mimeOrExtAllowed(
  file: File,
  mimeSet: Set<string>,
  extSet: Set<string>
): boolean {
  const mime = (file.type || "").toLowerCase();
  if (mime && mimeSet.has(mime)) return true;
  return extSet.has(fileExtension(file.name));
}

export function validatePersonName(
  value: string,
  which: "first" | "last"
): RegisterErrorCode | null {
  const trimmed = value.trim();
  const required = which === "first" ? "firstNameRequired" : "lastNameRequired";
  const tooShort = which === "first" ? "firstNameTooShort" : "lastNameTooShort";
  const invalid = which === "first" ? "firstNameInvalid" : "lastNameInvalid";

  if (!trimmed) return required;
  if (trimmed.length < REGISTER_NAME_MIN) return tooShort;
  if (!PERSON_NAME_RE.test(trimmed)) return invalid;
  return null;
}

export function validateEmailField(value: string): RegisterErrorCode | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "emailRequired";
  const issue = emailFormatIssue(trimmed);
  if (issue === "missing_at") return "emailMissingAt";
  if (issue === "missing_local" || issue === "missing_domain") {
    return "emailMissingDomain";
  }
  if (issue === "trailing_junk") return "emailTrailingJunk";
  if (issue) return "emailInvalid";
  if (!isGmailAddress(trimmed)) return "emailMustBeGmail";
  return null;
}

export const PHONE_MAX_DIGITS = 12;

export function phoneDigitCount(raw: string): number {
  return String(raw || "").replace(/\D/g, "").length;
}

export function sanitizePhoneInput(raw: string): string {
  let digits = 0;
  let out = "";
  for (const ch of String(raw || "")) {
    if (/\d/.test(ch)) {
      if (digits >= PHONE_MAX_DIGITS) continue;
      digits += 1;
      out += ch;
      continue;
    }
    if ("+ ()-".includes(ch)) out += ch;
  }
  return out;
}

export function validatePhoneField(value: string): RegisterErrorCode | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "phoneRequired";
  if (/[A-Za-z\u00C0-\u024F]/u.test(trimmed)) return "phoneInvalid";
  const digits = phoneDigitCount(trimmed);
  if (digits > PHONE_MAX_DIGITS) return "phoneTooLong";
  if (digits < 9) return "phoneInvalid";
  return null;
}

/** Empty is allowed (profile / edit). Filled values use the same rules. */
export function validateOptionalPhoneField(value: string): RegisterErrorCode | null {
  if (!(value ?? "").trim()) return null;
  return validatePhoneField(value);
}

export function phoneWriteError(
  value: string,
  required = false
): string | null {
  const code = required
    ? validatePhoneField(value)
    : validateOptionalPhoneField(value);
  return code ? registerErrorMessage(code, "en") : null;
}

export function validatePasswordField(value: string): RegisterErrorCode | null {
  if (!value) return "passwordRequired";
  if (value.length < REGISTER_PASSWORD_MIN_LENGTH) return "passwordShort";
  if (!/[A-Za-z\p{L}]/u.test(value) || !/\d/.test(value)) return "passwordWeak";
  return null;
}

export function validateConfirmPasswordField(
  password: string,
  confirmPassword: string
): RegisterErrorCode | null {
  if (!confirmPassword) return "confirmPasswordRequired";
  if (confirmPassword !== password) return "passwordMismatch";
  return null;
}

export function validateImageFile(file: File | null): RegisterErrorCode | null {
  if (!file || file.size === 0) return null;
  if (file.size > REGISTER_MAX_FILE_BYTES) return "fileTooLarge";
  if (!mimeOrExtAllowed(file, IMAGE_MIME, IMAGE_EXT)) return "fileTypeImage";
  return null;
}

export function validateDocumentFile(file: File | null): RegisterErrorCode | null {
  if (!file || file.size === 0) return null;
  if (file.size > REGISTER_MAX_FILE_BYTES) return "fileTooLarge";
  if (!mimeOrExtAllowed(file, DOC_MIME, DOC_EXT)) return "fileTypeDocument";
  return null;
}

export function validateCompanyNameField(value: string): RegisterErrorCode | null {
  const trimmed = value.trim();
  if (!trimmed) return "companyNameRequired";
  if (trimmed.length < REGISTER_NAME_MIN) return "companyNameTooShort";
  return null;
}

export function validateCompanyAddressField(
  value: string
): RegisterErrorCode | null {
  const trimmed = value.trim();
  if (!trimmed) return "companyAddressRequired";
  if (trimmed.length < REGISTER_COMPANY_ADDRESS_MIN) {
    return "companyAddressTooShort";
  }
  return null;
}

export function validateCompanyEmailField(
  value: string
): RegisterErrorCode | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "companyEmailRequired";
  if (!isValidRegisterEmail(trimmed)) return "companyEmailInvalid";
  if (isBlockedCompanyEmailDomain(trimmed)) return "companyEmailGmail";
  return null;
}

export function validateCompanyDistrictField(
  value: string
): RegisterErrorCode | null {
  const trimmed = value.trim();
  if (!trimmed || !normalizeBanadirDistrict(trimmed)) return "districtRequired";
  return null;
}

export function docFieldKey(
  id: RegistrationDocumentId
): RegisterFieldKey | null {
  if (id === "business_license") return "doc_business_license";
  if (id === "id_passport") return "doc_id_passport";
  if (id === "personal_photo") return "doc_personal_photo";
  if (id === "payment_receipt") return "doc_payment_receipt";
  return null;
}

export function docMissingCode(
  id: RegistrationDocumentId
): RegisterErrorCode | null {
  if (id === "business_license") return "docBusinessLicenseRequired";
  if (id === "id_passport") return "docIdPassportRequired";
  if (id === "personal_photo") return "docPersonalPhotoRequired";
  if (id === "payment_receipt") return "docPaymentReceiptRequired";
  return null;
}

export type RegisterDetailsInput = {
  kind: RegistrationKind | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  photo: File | null;
  companyType?: string;
  companyName?: string;
  companyDistrict?: string;
  companyEmail?: string;
  companyAddress?: string;
  livestockMarketId?: string;
  sector?: CompanyRegistrationSector | null;
  documents?: Partial<Record<RegistrationDocumentId, File | null>>;
  /** Livestock market broker only — when true, business docs are required. */
  isCompanyLivestockBroker?: boolean;
  /** Free subscription plans do not require a payment receipt. */
  skipPaymentReceipt?: boolean;
};

export type RegisterFieldErrors = Partial<
  Record<RegisterFieldKey, RegisterErrorCode>
>;

/**
 * Collects every field error for the details step (show-all-on-submit).
 * Returns null when valid.
 */
export function validateRegisterDetails(
  input: RegisterDetailsInput
): RegisterFieldErrors | null {
  const errors: RegisterFieldErrors = {};

  const first = validatePersonName(input.firstName, "first");
  if (first) errors.firstName = first;

  const last = validatePersonName(input.lastName, "last");
  if (last) errors.lastName = last;

  const email = validateEmailField(input.email);
  if (email) errors.email = email;

  const phone = validatePhoneField(input.phone ?? "");
  if (phone) errors.phone = phone;

  const password = validatePasswordField(input.password);
  if (password) errors.password = password;

  const confirmPassword = validateConfirmPasswordField(
    input.password,
    input.confirmPassword
  );
  if (confirmPassword) errors.confirmPassword = confirmPassword;

  if (input.photo && input.photo.size > 0) {
    const photoErr = validateImageFile(input.photo);
    if (photoErr) errors.photo = photoErr;
  }

  if (input.kind === "company") {
    if (!input.companyType?.trim() || !isCompanyRegistrationType(input.companyType)) {
      errors.companyType = "companyTypeRequired";
    }

    const nameErr = validateCompanyNameField(input.companyName ?? "");
    if (nameErr) errors.companyName = nameErr;

    const districtErr = validateCompanyDistrictField(input.companyDistrict ?? "");
    if (districtErr) errors.companyDistrict = districtErr;

    const companyEmailErr = validateCompanyEmailField(input.companyEmail ?? "");
    if (companyEmailErr) errors.companyEmail = companyEmailErr;

    const addressErr = validateCompanyAddressField(input.companyAddress ?? "");
    if (addressErr) errors.companyAddress = addressErr;
  }

  if (input.kind === "broker") {
    const marketId = Number(input.livestockMarketId ?? "");
    if (!Number.isFinite(marketId) || marketId <= 0) {
      errors.livestockMarketId = "livestockMarketRequired";
    }
  }

  // Shared 3 docs for utility companies; livestock brokers only when registering as a company broker
  const requiresDocuments =
    input.kind === "company" ||
    (input.kind === "broker" && Boolean(input.isCompanyLivestockBroker));

  if (requiresDocuments) {
    const sector =
      input.sector ??
      (input.kind === "broker" ? "livestock" : null);
    if (sector) {
      for (const id of requiredDocumentIds(sector)) {
        if (input.skipPaymentReceipt && id === "payment_receipt") continue;
        const key = docFieldKey(id);
        if (!key) continue;
        const file = input.documents?.[id] ?? null;
        const photoOptional = input.kind === "broker" && id === "personal_photo";
        if (!file || file.size === 0) {
          if (photoOptional) continue;
          const missing = docMissingCode(id);
          if (missing) errors[key] = missing;
          continue;
        }
        const fileErr = validateDocumentFile(file);
        if (fileErr) errors[key] = fileErr;
      }
    }
  } else if (input.kind === "broker") {
    // Paid plans: payment method is chosen on the plan step (no screenshot).
    for (const id of requiredDocumentIds("livestock")) {
      if (id === "payment_receipt") continue;
      const key = docFieldKey(id);
      if (!key) continue;
      const file = input.documents?.[id] ?? null;
      if (!file || file.size === 0) continue;
      const fileErr = validateDocumentFile(file);
      if (fileErr) errors[key] = fileErr;
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/** First field key in visual form order (for scroll-into-view). */
export const REGISTER_FIELD_ORDER: RegisterFieldKey[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "password",
  "confirmPassword",
  "photo",
  "companyName",
  "companyType",
  "companyDistrict",
  "companyEmail",
  "companyAddress",
  "livestockMarketId",
  "doc_business_license",
  "doc_id_passport",
  "doc_personal_photo",
  "doc_payment_receipt",
];

export function firstRegisterErrorField(
  errors: RegisterFieldErrors
): RegisterFieldKey | null {
  for (const key of REGISTER_FIELD_ORDER) {
    if (errors[key]) return key;
  }
  return null;
}

/** Stable DOM ids for scroll-into-view (do not use value-based keys on inputs). */
export function registerFieldDomId(key: RegisterFieldKey): string {
  switch (key) {
    case "firstName":
      return "register-first-name";
    case "lastName":
      return "register-last-name";
    case "email":
      return "register-email";
    case "phone":
      return "register-phone";
    case "password":
      return "register-password";
    case "confirmPassword":
      return "register-confirm-password";
    case "photo":
      return "register-photo";
    case "companyName":
      return "company-name";
    case "companyType":
      return "company-type";
    case "companyDistrict":
      return "company-district";
    case "companyEmail":
      return "company-email";
    case "companyAddress":
      return "company-address";
    case "livestockMarketId":
      return "register-livestock-market";
    case "doc_business_license":
      return "register-doc-business_license";
    case "doc_id_passport":
      return "register-doc-id_passport";
    case "doc_personal_photo":
      return "register-doc-personal_photo";
    case "doc_payment_receipt":
      return "register-doc-payment_receipt";
  }
}

/** Re-validate a single field after blur / change-after-error. */
export function validateRegisterField(
  key: RegisterFieldKey,
  input: RegisterDetailsInput
): RegisterErrorCode | null {
  switch (key) {
    case "firstName":
      return validatePersonName(input.firstName, "first");
    case "lastName":
      return validatePersonName(input.lastName, "last");
    case "email":
      return validateEmailField(input.email);
    case "phone":
      return validatePhoneField(input.phone);
    case "password":
      return validatePasswordField(input.password);
    case "confirmPassword":
      return validateConfirmPasswordField(
        input.password,
        input.confirmPassword
      );
    case "photo": {
      if (!input.photo || input.photo.size === 0) return null;
      return validateImageFile(input.photo);
    }
    case "companyName":
      return validateCompanyNameField(input.companyName ?? "");
    case "companyType":
      if (!input.companyType?.trim() || !isCompanyRegistrationType(input.companyType)) {
        return "companyTypeRequired";
      }
      return null;
    case "companyDistrict":
      return validateCompanyDistrictField(input.companyDistrict ?? "");
    case "companyEmail":
      return validateCompanyEmailField(input.companyEmail ?? "");
    case "companyAddress":
      return validateCompanyAddressField(input.companyAddress ?? "");
    case "livestockMarketId": {
      const marketId = Number(input.livestockMarketId ?? "");
      if (!Number.isFinite(marketId) || marketId <= 0) {
        return "livestockMarketRequired";
      }
      return null;
    }
    case "doc_business_license": {
      if (
        input.kind === "broker" &&
        !input.isCompanyLivestockBroker
      ) {
        const file = input.documents?.business_license ?? null;
        if (!file || file.size === 0) return null;
        return validateDocumentFile(file);
      }
      const file = input.documents?.business_license ?? null;
      if (!file || file.size === 0) return "docBusinessLicenseRequired";
      return validateDocumentFile(file);
    }
    case "doc_id_passport": {
      if (
        input.kind === "broker" &&
        !input.isCompanyLivestockBroker
      ) {
        const file = input.documents?.id_passport ?? null;
        if (!file || file.size === 0) return null;
        return validateDocumentFile(file);
      }
      const file = input.documents?.id_passport ?? null;
      if (!file || file.size === 0) return "docIdPassportRequired";
      return validateDocumentFile(file);
    }
    case "doc_personal_photo": {
      const file = input.documents?.personal_photo ?? null;
      if (!file || file.size === 0) {
        return input.kind === "broker" ? null : "docPersonalPhotoRequired";
      }
      return validateDocumentFile(file);
    }
    case "doc_payment_receipt": {
      const file = input.documents?.payment_receipt ?? null;
      if (!file || file.size === 0) return "docPaymentReceiptRequired";
      return validateDocumentFile(file);
    }
    default:
      return null;
  }
}

/** Server-side checks for account strings (full name is first + last joined). */
export function validateRegisterAccountStrings(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword?: string;
}): RegisterErrorCode | null {
  const parts = input.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return "fullNameRequired";
  for (const part of parts) {
    if (part.length < REGISTER_NAME_MIN || !PERSON_NAME_RE.test(part)) {
      return "firstNameInvalid";
    }
  }

  const emailErr = validateEmailField(input.email);
  if (emailErr) return emailErr;

  const phoneErr = validatePhoneField(input.phone);
  if (phoneErr) return phoneErr;

  const passwordErr = validatePasswordField(input.password);
  if (passwordErr) return passwordErr;

  if (input.confirmPassword !== undefined) {
    const confirmErr = validateConfirmPasswordField(
      input.password,
      input.confirmPassword
    );
    if (confirmErr) return confirmErr;
  }

  return null;
}
