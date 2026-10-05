import type { Metadata } from "next";
import { PricingPlansView } from "@/components/pricing/PricingPlansModal";

export const metadata: Metadata = {
  title: "Subscription plans",
  description:
    "Active MMPS subscription plans added by Super Admin. Pay by EVC, then register.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#f5faf7]">
      <PricingPlansView />
    </div>
  );
}
