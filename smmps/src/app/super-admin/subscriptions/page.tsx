import { Suspense } from "react";
import { SubscriptionsManager } from "@/components/super-admin/SubscriptionsManager";

export const dynamic = "force-dynamic";

export default function SubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[40vh] place-items-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
        </div>
      }
    >
      <SubscriptionsManager />
    </Suspense>
  );
}
