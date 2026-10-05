"use client";

import {
  Building2,
  Calendar,
  DollarSign,
  Globe,
  Link2,
  Mail,
  MapPin,
  Phone,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WaterProviderMeta } from "@/lib/water-data";
import { WATER_PROVIDER_CARD_THEMES } from "@/lib/water-data";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";
import { localizeProviderLabel } from "@/lib/home-content";

const ICON_STYLES = {
  location: "bg-red-50 text-red-600 ring-1 ring-red-100",
  email: "bg-sky-50 text-sky-600 ring-1 ring-sky-100",
  phone: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  web: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100",
  facebook: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
  company: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
  areas: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  price: "bg-amber-50 text-blue-700 ring-1 ring-amber-100",
  updated: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
} as const;

type ContactItem = {
  key: string;
  icon: LucideIcon;
  iconStyle: string;
  labelEn: string;
  labelSo: string;
  hintEn?: string;
  hintSo?: string;
  value: string;
  valueSo?: string;
  href?: string;
};

const LABEL = {
  address: { en: "Address", so: "Cinwaanka" },
  hq: { en: "HQ", so: "Xarunta" },
  headquarters: { en: "Headquarters", so: "Xarunta Guud" },
  location: { en: "Location", so: "Goobta" },
  email: { en: "Email", so: "Emailka" },
  facebook: { en: "Facebook", so: "Facebook" },
  phone: { en: "Phone", so: "Telefoonka" },
  altPhone: { en: "Alternative Phone", so: "Telefoon Kale" },
  website: { en: "Website", so: "Website-ka" },
  businessHours: { en: "Business Hours", so: "Saacadaha Shaqada" },
  callCenter: { en: "Call Center", so: "Xarunta Wicitaanka" },
  companyName: { en: "Company Name", so: "Magaca Shirkadda" },
  serviceAreas: { en: "Service Areas", so: "Goobaha Adeegga" },
  currentPrice: { en: "Current Price", so: "Qiimaha Hadda" },
  lastUpdated: { en: "Last Updated", so: "La Cusboonaysiiyay" },
} as const;

function buildContactItems(
  provider: Omit<WaterProviderMeta, "icon">
): ContactItem[] {
  const addressLabel = provider.addressLabel ?? "Address";
  const isHq = addressLabel === "HQ";
  const items: ContactItem[] = [
    {
      key: "hq",
      icon: MapPin,
      iconStyle: ICON_STYLES.location,
      labelEn: isHq ? LABEL.hq.en : addressLabel === "Address" ? LABEL.address.en : addressLabel,
      labelSo: isHq ? LABEL.hq.so : addressLabel === "Address" ? LABEL.address.so : addressLabel,
      hintEn: isHq ? LABEL.headquarters.en : undefined,
      hintSo: isHq ? LABEL.headquarters.so : undefined,
      value: provider.address,
      valueSo: provider.addressSo,
    },
  ];

  if (provider.location) {
    items.push({
      key: "location",
      icon: Truck,
      iconStyle: ICON_STYLES.areas,
      labelEn: LABEL.location.en,
      labelSo: LABEL.location.so,
      value: provider.location,
      valueSo: provider.locationSo,
    });
  }

  if (provider.email) {
    items.push({
      key: "email",
      icon: Mail,
      iconStyle: ICON_STYLES.email,
      labelEn: LABEL.email.en,
      labelSo: LABEL.email.so,
      value: provider.email,
      href: `mailto:${provider.email}`,
    });
  }

  if (provider.facebook) {
    items.push({
      key: "facebook",
      icon: Link2,
      iconStyle: ICON_STYLES.facebook,
      labelEn: LABEL.facebook.en,
      labelSo: LABEL.facebook.so,
      value: provider.facebook.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      href: provider.facebook,
    });
  }

  if (provider.phone) {
    items.push({
      key: "phone",
      icon: Phone,
      iconStyle: ICON_STYLES.phone,
      labelEn: LABEL.phone.en,
      labelSo: LABEL.phone.so,
      hintEn: provider.phoneHint,
      hintSo: provider.phoneHint,
      value: provider.phone,
      href: `tel:${provider.phone.replace(/[^\d+]/g, "")}`,
    });
  }

  if (provider.altPhone) {
    items.push({
      key: "altPhone",
      icon: Phone,
      iconStyle: ICON_STYLES.phone,
      labelEn: LABEL.altPhone.en,
      labelSo: LABEL.altPhone.so,
      value: provider.altPhone,
      href: `tel:${provider.altPhone.replace(/[^\d+]/g, "")}`,
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
  } else if (provider.websiteNote) {
    items.push({
      key: "website",
      icon: Globe,
      iconStyle: ICON_STYLES.web,
      labelEn: LABEL.website.en,
      labelSo: LABEL.website.so,
      value: provider.websiteNote,
    });
  }

  if (provider.businessHours) {
    items.push({
      key: "hours",
      icon: Calendar,
      iconStyle: ICON_STYLES.updated,
      labelEn: LABEL.businessHours.en,
      labelSo: LABEL.businessHours.so,
      value: provider.businessHours,
    });
  }

  if (provider.callCenter || provider.telephone) {
    const call = (provider.callCenter || provider.telephone || "").trim();
    if (call) {
      items.push({
        key: "callCenter",
        icon: Phone,
        iconStyle: ICON_STYLES.phone,
        labelEn: LABEL.callCenter.en,
        labelSo: LABEL.callCenter.so,
        value: call,
        href: `tel:${call.replace(/[^\d+]/g, "")}`,
      });
    }
  }

  if (provider.companyName) {
    items.push({
      key: "company",
      icon: Building2,
      iconStyle: ICON_STYLES.company,
      labelEn: LABEL.companyName.en,
      labelSo: LABEL.companyName.so,
      value: provider.companyName,
    });
  }

  if (provider.serviceAreas) {
    items.push({
      key: "areas",
      icon: MapPin,
      iconStyle: ICON_STYLES.areas,
      labelEn: LABEL.serviceAreas.en,
      labelSo: LABEL.serviceAreas.so,
      value: provider.serviceAreas,
    });
  }

  if (provider.currentPrice) {
    items.push({
      key: "price",
      icon: DollarSign,
      iconStyle: ICON_STYLES.price,
      labelEn: LABEL.currentPrice.en,
      labelSo: LABEL.currentPrice.so,
      value: provider.currentPrice,
    });
  }

  if (provider.priceUpdated) {
    items.push({
      key: "updated",
      icon: Calendar,
      iconStyle: ICON_STYLES.updated,
      labelEn: LABEL.lastUpdated.en,
      labelSo: LABEL.lastUpdated.so,
      value: provider.priceUpdated,
    });
  }

  return items;
}

export function WaterProviderContact({
  provider,
}: {
  provider: Omit<WaterProviderMeta, "icon">;
}) {
  const { lang } = useLang();
  const items = buildContactItems(provider);

  return (
    <div className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white shadow-md",
      WATER_PROVIDER_CARD_THEMES.contact.border
    )}>
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-2",
          WATER_PROVIDER_CARD_THEMES.contact.headerBg
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
        {items.map(({ key, icon: Icon, iconStyle, labelEn, labelSo, hintEn, hintSo, value, valueSo, href }) => {
          const hint = lang === "so" ? hintSo : hintEn;
          const displayValue =
            key === "source" || key === "hours"
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
              {hint ? (
                <p className="text-[10px] font-medium text-gray-400">{hint}</p>
              ) : null}
              {href ? (
                <a
                  href={href}
                  target={key === "website" || key === "facebook" ? "_blank" : undefined}
                  rel={
                    key === "website" || key === "facebook"
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="mt-0.5 block break-words text-xs font-medium leading-snug text-blue-600 hover:underline"
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
