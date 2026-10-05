import { redirect } from "next/navigation";

/** Compare Prices was removed from the public site. */
export default function ComparePricesRemovedPage() {
  redirect("/");
}
