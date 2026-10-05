import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Public livestock banners are edited by Super Admin only. */
export default function BrokerPageHeroPage() {
  redirect("/broker");
}
