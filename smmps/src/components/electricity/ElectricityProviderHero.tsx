"use client";

import { MapPin, Zap } from "lucide-react";
import {
  getElectricityProviderBySlug,
  type ElectricityProviderMeta,
} from "@/lib/electricity-data";
import { HeroLogoBadge } from "@/components/HeroLogoBadge";
import { StableBilingual } from "@/components/ui/StableBilingual";
import { resolveDescriptionSource } from "@/lib/content-i18n";
import { useLang } from "@/lib/language-context";

interface ElectricityProviderHeroProps {
  /** Serializable DTO — Lucide `icon` must be resolved on the client */
  provider: Omit<ElectricityProviderMeta, "icon">;
  recordCount: number;
}

export function ElectricityProviderHero({
  provider,
  recordCount,
}: ElectricityProviderHeroProps) {
  void recordCount;
  const { lang, t, lc } = useLang();
  const Icon =
    getElectricityProviderBySlug(provider.slug)?.icon ?? Zap;
  const descriptionSource = resolveDescriptionSource(
    provider.description,
    provider.descriptionSo
  );
  const protect = [
    provider.name,
    provider.cardTitle,
    provider.acronym,
    provider.somali,
  ].filter(Boolean) as string[];
  const description =
    descriptionSource.mode === "pair"
      ? lang === "so"
        ? descriptionSource.so
        : descriptionSource.en
      : lc(descriptionSource.text, { protect });

  return (
    <section className="relative h-[550px] overflow-hidden home-hero-pattern">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-10 -top-20 h-[32rem] w-[32rem] rounded-full bg-amber-300/18 blur-[90px]" />
        <div className="absolute -bottom-32 -left-20 h-[30rem] w-[30rem] rounded-full bg-teal-300/16 blur-[100px]" />
        <div className="absolute left-[42%] top-[28%] h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='72' height='72' viewBox='0 0 72 72' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.15' fill='%23ffffff' fill-opacity='0.55'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,20,18,0.62)_0%,rgba(1,20,18,0.28)_48%,transparent_78%)]" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#011916]/70 to-transparent" />
      </div>

      <div className="relative mx-auto flex h-[550px] max-w-7xl items-center px-3 min-[360px]:px-4 sm:px-6">
        <div className="max-w-3xl -translate-y-8 animate-fade-in-up">
          <div className="mb-4 flex items-center gap-4">
            <HeroLogoBadge
              image={provider.image}
              imageAlt={provider.name}
              imageBg={provider.imageBg}
              imageBlendMultiply={provider.imageBlendMultiply}
              className={provider.heroLogoClassName}
              icon={Icon}
              gradient="from-amber-500 to-yellow-500"
              shadowClass="shadow-emerald-900/30"
              priority
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-amber-300/90">
                {t("Electricity Provider", "Bixiyaha Korontada")}
                {provider.acronym && ` · ${provider.acronym}`}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                <span className="shimmer-text">{provider.cardTitle}</span>
              </h1>
            </div>
          </div>

          <p className="font-hero text-base font-medium leading-relaxed tracking-wide text-white sm:text-lg">
            {description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium tracking-wide text-white">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-red-500" strokeWidth={2.5} />
              <StableBilingual
                en={provider.address}
                so={provider.addressSo ?? provider.address}
                lang={lang}
              />
            </span>
          </div>
        </div>
      </div>

      <div className="section-divider mx-auto max-w-7xl" />
    </section>
  );
}
