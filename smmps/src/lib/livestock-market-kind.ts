export function livestockMarketKind(input: {
  companyType?: string | null;
  companyName?: string | null;
  sector?: string | null;
}): "CAMEL" | "CATTLE" | "SHEEP" | null {
  const blob = `${input.companyType || ""} ${input.companyName || ""} ${input.sector || ""}`.toUpperCase();
  if (blob.includes("CAMEL") || blob.includes("GEEL")) return "CAMEL";
  if (blob.includes("CATTLE") || blob.includes("LODA") || blob.includes("LO'D")) {
    return "CATTLE";
  }
  if (
    blob.includes("SHEEP") ||
    blob.includes("GOAT") ||
    blob.includes("ARRI")
  ) {
    return "SHEEP";
  }
  return null;
}
