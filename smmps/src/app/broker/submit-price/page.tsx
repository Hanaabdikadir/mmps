import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BrokerSubmitPricePage() {
  redirect("/broker/update-price");
}
