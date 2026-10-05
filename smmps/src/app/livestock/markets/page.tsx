import { redirect } from "next/navigation";

/** Old unused hub — livestock types live at /livestock/types */
export default function LivestockMarketsRedirectPage() {
  redirect("/livestock/types");
}
