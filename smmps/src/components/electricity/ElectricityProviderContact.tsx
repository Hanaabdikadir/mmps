"use client";

import { Globe, Headphones, Mail, MapPin, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ElectricityProviderMeta } from "@/lib/electricity-data";
import { ELECTRICITY_PROVIDER_CARD_THEMES } from "@/lib/electricity-data";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";
import { localizeProviderLabel } from "@/lib/home-content";

const ICON_STYLES = {
  location: "bg-red-50 text-red-600 ring-1 ring-red-100",
  email: "bg-sky-50 text-sky-600 ring-1 ring-sky-100",
  altEmail: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
  phone: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  altPhone: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  telephone: "bg-amber-50 text-blue-600 ring-1 ring-amber-100",
  callCenter: "bg-orange-50 text-orange-600 ring-1 ring-orange-100",
  web: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100",
} as const;

type ContactItem = {
  key: string;
  icon: LucideIcon;
  iconStyle: string;
  labelEn: string;
  labelSo: string;
  value: string;
  valueSo?: string;
  href?: string;
};

const LABEL = {
  address: { en: "Address", so: "Cinwaanka" },
  headOffice: { en: "Head Office", so: "Xafiiska Guud" },
  callCenter: { en: "Call Center", so: "Xarunta Wicitaanka" },
  phone: { en: "Phone", so: "Telefoonka" },
  altPhone: { en: "Alt Phone", so: "Telefoon Kale" },
  email: { en: "Email", so: "Emailka" },
  website: { en: "Website", so: "Website-ka" },
} as const;

function buildContactItems(
  provider: Omit<ElectricityProviderMeta, "icon">
): ContactItem[] {
  const rawAddress = provider.addressLabel ?? "Address";
  const items: ContactItem[] = [
    {
      key: "hq",
      icon: MapPin,
      iconStyle: ICON_STYLES.location,
      labelEn:
        rawAddress === "Head Office"
          ? LABEL.headOffice.en
          : rawAddress === "Address"
            ? LABEL.address.en
            : rawAddress,
      labelSo:
        rawAddress === "Head Office"
          ? LABEL.headOffice.so
          : rawAddress === "Address"
            ? LABEL.address.so
            : rawAddress,
      value: provider.address,
      valueSo: provider.addressSo,
    },
  ];

  if (provider.callCenter) {
    items.push({
      key: "call-center",
      icon: Headphones,
      iconStyle: ICON_STYLES.callCenter,
      labelEn: LABEL.callCenter.en,
      labelSo: LABEL.callCenter.so,
      value: provider.callCenter,
      href: `tel:${provider.callCenter.replace(/[^\d+]/g, "")}`,
    });
  }

  const phoneLines = [provider.telephone, provider.phone].filter(
    Boolean
  ) as string[];

  if (phoneLines.length > 0) {
    const hint = provider.phoneHint?.trim();
    items.push({
      key: "phone",
      icon: Phone,
      iconStyle: ICON_STYLES.phone,
      labelEn:
        hint && phoneLines.length === 1
          ? hint
          : LABEL.phone.en,
      labelSo:
        hint && phoneLines.length === 1
          ? localizeProviderLabel(hint, "so")
          : LABEL.phone.so,
      value: phoneLines.join(" · "),
      href: provider.phone
        ? `tel:${provider.phone.replace(/[^\d+]/g, "")}`
        : provider.telephone
          ? `tel:${provider.telephone.replace(/[^\d+]/g, "")}`
          : undefined,
    });
  }

  if (provider.alternatePhone?.trim()) {
    items.push({
      key: "alt-phone",
      icon: Phone,
      iconStyle: ICON_STYLES.altPhone,
      labelEn: LABEL.altPhone.en,
      labelSo: LABEL.altPhone.so,
      value: provider.alternatePhone.trim(),
      href: `tel:${provider.alternatePhone.replace(/[^\d+]/g, "")}`,
    });
  }

  const emailLines = [provider.email, provider.alternateEmail].filter(Boolean) as string[];

  if (emailLines.length > 0) {
    items.push({
      key: "email",
      icon: Mail,
      iconStyle: ICON_STYLES.email,
      labelEn: LABEL.email.en,
      labelSo: LABEL.email.so,
      value: emailLines.join(" · "),
      href: provider.email ? `mailto:${provider.email}` : undefined,
    });
  }

  if (provider.website) {
    items.push({
      key: "website",
      icon: Globe,
      iconStyle: ICON_STYLES.web,
      labelEn: LABEL.website.en,
      labelSo: LABEL.website.so,
      value: provider.website.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      href: provider.website,
    });
  }

  return items;
}

export function ElectricityProviderContact({
  provider,
}: {
  provider: Omit<ElectricityProviderMeta, "icon">;
}) {
  const { lang } = useLang();
  const items = buildContactItems(provider);

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white shadow-md",
        ELECTRICITY_PROVIDER_CARD_THEMES.contact.border
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-2",
          ELECTRICITY_PROVIDER_CARD_THEMES.contact.headerBg
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/95 shadow-sm ring-1 ring-white/50">
          <MapPin className="h-4 w-4 text-rose-600" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black leading-tight text-white">
            <StableBilingual
              en="Contact Info"
              so="Macluumaadka Xiriirka"
              lang={lang}
            />
          </h2>
          <p className="text-[10px] text-white/80">
            <StableBilingual en="Contact" so="Xiriirka" lang={lang} /> ·{" "}
            {provider.acronym ?? provider.somali}
          </p>
        </div>
      </div>
      <ul className="grid min-h-0 flex-1 content-start grid-cols-1 gap-2.5 p-3 sm:grid-cols-2">
        {items.map(({ key, icon: Icon, iconStyle, labelEn, labelSo, value, valueSo, href }) => {
          const displayValue =
            key === "supply"
              ? localizeProviderLabel(value, lang)
              : lang === "so" && valueSo
                ? valueSo
                : value;

          return (
          <li
            key={key}
            className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5 transition-colors hover:border-gray-200 hover:bg-gray-50"
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-xs",
                iconStyle
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight text-gray-900">
                <StableBilingual en={labelEn} so={labelSo} lang={lang} />
              </p>
              {href ? (
                <a
                  href={href}
                  className="mt-0.5 block break-words text-xs font-medium leading-snug text-blue-700 hover:underline"
                >
                  {displayValue}
                </a>
              ) : (
                <p className="mt-0.5 break-words text-xs font-medium leading-snug text-gray-600">
                  {displayValue}
                </p>
              )}
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
