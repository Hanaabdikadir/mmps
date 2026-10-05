import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BrokerPricesPanel } from "@/components/broker/BrokerPricesPanel";
import { animalTypeFromLivestockSection } from "@/lib/promote-broker";

export const dynamic = "force-dynamic";

export default async function BrokerPricesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const broker = user.brokerId
    ? await prisma.livestockBroker.findUnique({
        where: { id: user.brokerId },
        select: { livestockFocus: true, name: true },
      })
    : null;

  const lockedType =
    animalTypeFromLivestockSection(broker?.livestockFocus) ||
    animalTypeFromLivestockSection(broker?.name) ||
    animalTypeFromLivestockSection(user.companyType) ||
    null;

  const allowedTypes =
    lockedType === "GOAT"
      ? ["GOAT", "SHEEP"]
      : lockedType
        ? [lockedType]
        : ["CAMEL", "CATTLE", "GOAT", "SHEEP"];

  return (
    <BrokerPricesPanel
      allowedTypes={allowedTypes}
      defaultType={lockedType || "CAMEL"}
    />
  );
}
