/**
 * Client-safe MasterCard helpers.
 * Never persist full PAN or CVV — only last4 + expiry for admin reference.
 */

export type MastercardFormValues = {
  cardHolder: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  billingAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

export const EMPTY_MASTERCARD_FORM: MastercardFormValues = {
  cardHolder: "",
  cardNumber: "",
  expiry: "",
  cvv: "",
  billingAddress: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
};

export type MastercardSafePayload = {
  cardHolder: string;
  cardLast4: string;
  cardExpiry: string;
  cardBrand: "mastercard" | "visa";
  billingAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

function digitsOnly(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

/** Format as #### #### #### #### while typing. */
export function formatCardNumberInput(raw: string): string {
  const d = digitsOnly(raw).slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** Format MM/YY while typing. */
export function formatCardExpiryInput(raw: string): string {
  const d = digitsOnly(raw).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export type CardBrand = "mastercard" | "visa";

export function isVisaNumber(raw: string): boolean {
  const d = digitsOnly(raw);
  return d.length >= 13 && d.length <= 19 && d.startsWith("4");
}

export function isMastercardNumber(raw: string): boolean {
  const d = digitsOnly(raw);
  // MasterCard: 51–55, or 2221–2720 (2-series)
  if (d.length < 16 || d.length > 19) return false;
  const first2 = Number(d.slice(0, 2));
  const first4 = Number(d.slice(0, 4));
  if (first2 >= 51 && first2 <= 55) return true;
  if (first4 >= 2221 && first4 <= 2720) return true;
  return false;
}

function luhnOk(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i -= 1) {
    let n = Number(num[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function validateMastercardForm(
  values: MastercardFormValues,
  lang: "en" | "so" = "en",
  brand: CardBrand = "mastercard"
): string | null {
  const holder = values.cardHolder.trim();
  if (holder.length < 2) {
    return lang === "so"
      ? "Geli magaca ku qoran kaarka."
      : "Enter the name on the card.";
  }

  const number = digitsOnly(values.cardNumber);
  const numberOk =
    brand === "visa" ? isVisaNumber(number) : isMastercardNumber(number);
  if (!numberOk || !luhnOk(number)) {
    return brand === "visa"
      ? lang === "so"
        ? "Lambarka Visa sax ma aha."
        : "Enter a valid Visa number."
      : lang === "so"
        ? "Lambarka MasterCard sax ma aha."
        : "Enter a valid MasterCard number.";
  }

  const exp = digitsOnly(values.expiry);
  if (exp.length !== 4) {
    return lang === "so"
      ? "Geli taariikhda dhicitaanka (MM/YY)."
      : "Enter expiry as MM/YY.";
  }
  const month = Number(exp.slice(0, 2));
  const year = Number(exp.slice(2));
  if (month < 1 || month > 12) {
    return lang === "so" ? "Bisha dhicitaanka sax ma aha." : "Invalid expiry month.";
  }
  const now = new Date();
  const expDate = new Date(2000 + year, month); // first day of next month
  if (expDate <= now) {
    return lang === "so"
      ? "Kaarku waa dhacay — isticmaal kaar cusub."
      : "This card has expired.";
  }

  const cvv = digitsOnly(values.cvv);
  if (cvv.length < 3 || cvv.length > 4) {
    return lang === "so" ? "Geli CVV (3 ama 4 digit)." : "Enter a valid CVV.";
  }

  if (values.billingAddress.trim().length < 5) {
    return lang === "so"
      ? "Geli cinwaanka biilka oo buuxa."
      : "Enter the full billing address.";
  }
  if (values.city.trim().length < 2) {
    return lang === "so" ? "Geli magaalada." : "Enter the city.";
  }
  if (values.state.trim().length < 2) {
    return lang === "so" ? "Geli gobolka / state-ka." : "Enter the state or region.";
  }
  const zip = values.zipCode.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9\s-]{2,11}$/.test(zip)) {
    return lang === "so"
      ? "Geli ZIP code sax ah."
      : "Enter a valid ZIP or postal code.";
  }
  if (values.country.trim().length < 2) {
    return lang === "so" ? "Geli dalka." : "Enter the country.";
  }

  return null;
}

/** Safe fields only — never include full number or CVV. */
export function toMastercardSafePayload(
  values: MastercardFormValues,
  brand: CardBrand = "mastercard"
): MastercardSafePayload | null {
  if (validateMastercardForm(values, "en", brand)) return null;
  const number = digitsOnly(values.cardNumber);
  const exp = digitsOnly(values.expiry);
  return {
    cardHolder: values.cardHolder.trim().slice(0, 80),
    cardLast4: number.slice(-4),
    cardExpiry: `${exp.slice(0, 2)}/${exp.slice(2)}`,
    cardBrand: brand,
    billingAddress: values.billingAddress.trim().slice(0, 120),
    city: values.city.trim().slice(0, 60),
    state: values.state.trim().slice(0, 60),
    zipCode: values.zipCode.trim().slice(0, 12),
    country: values.country.trim().slice(0, 60),
  };
}
