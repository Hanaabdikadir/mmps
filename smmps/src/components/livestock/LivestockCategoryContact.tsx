"use client";

import { Beef, Mail, MapPin, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  LIVESTOCK_CATEGORY_PAGES,
  type LivestockCategorySlug,
} from "@/lib/livestock-data";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/language-context";

type ContactItem = {
  key: string;
  icon: LucideIcon;
  iconStyle: string;
  labelEn: string;
  labelSo: string;
  value: string;
  href?: string;
};

export function LivestockCategoryContact({
  category,
  location,
  email,
  phone,
  brokerName,
  livestockFocus,
}: {
  category: LivestockCategorySlug;
  location: string;
  email: string | null;
  phone: string | null;
  brokerName: string | null;
  livestockFocus: string | null;
}) {
  const { lang } = useLang();
  const meta = LIVESTOCK_CATEGORY_PAGES[category];
  const items: ContactItem[] = [
    {
      key: "address",
      icon: MapPin,
      iconStyle: "bg-red-50 text-red-600 ring-1 ring-red-100",
      labelEn: "Address",
      labelSo: "Cinwaanka",
      value: location,
    },
    {
      key: "company",
      icon: Beef,
      iconStyle: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
      labelEn: "Market section",
      labelSo: "Qaybta suuqa",
      value: brokerName || livestockFocus || meta.english,
    },
  ];
  if (email) {
    items.push({
      key: "email",
      icon: Mail,
      iconStyle: "bg-sky-50 text-sky-600 ring-1 ring-sky-100",
      labelEn: "Email",
      labelSo: "Emailka",
      value: email,
      href: `mailto:${email}`,
    });
  }
  if (phone) {
    items.push({
      key: "phone",
      icon: Phone,
      iconStyle: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
      labelEn: "Phone",
      labelSo: "Telefoonka",
      value: phone,
      href: `tel:${phone}`,
    });
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-rose-200/80 bg-white shadow-md">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-gradient-to-br from-rose-600 via-orange-500 to-amber-400 px-5 py-2">
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
            {meta.somali}
          </p>
        </div>
      </div>
      <ul className="grid min-h-0 flex-1 content-start grid-cols-1 gap-2.5 p-3 sm:grid-cols-2">
        {items.map(({ key, icon: Icon, iconStyle, labelEn, labelSo, value, href }) => (
          <li
            key={key}
            className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5"
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
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
                  className="mt-0.5 block break-words text-xs font-medium leading-snug text-blue-600 hover:underline"
                >
                  {value}
                </a>
              ) : (
                <p className="mt-0.5 break-words text-xs font-medium leading-snug text-gray-600">
                  {value}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
