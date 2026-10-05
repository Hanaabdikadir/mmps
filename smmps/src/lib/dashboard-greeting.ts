import { formatMmpsDate, mogadishuHour } from "@/lib/mogadishu-time";

export function formatSystemDate(d: Date) {
  return formatMmpsDate(d);
}

export function greetingForHour(h: number): { en: string; so: string } {
  if (h >= 5 && h < 12) return { en: "Good morning", so: "Subax wanaagsan" };
  if (h === 12) return { en: "Good noon", so: "Duhr wanaagsan" };
  if (h > 12 && h < 17) return { en: "Good afternoon", so: "Galab wanaagsan" };
  if (h >= 17 && h < 21) return { en: "Good evening", so: "Fiid wanaagsan" };
  return { en: "Good night", so: "Habeen wanaagsan" };
}

export function greetingNow() {
  return greetingForHour(mogadishuHour());
}
