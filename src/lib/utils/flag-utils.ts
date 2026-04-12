/**
 * Maps FIAT currency codes to their respective country flag emojis.
 */
export const FIAT_FLAGS: Record<string, string> = {
  RWF: "🇷🇼",
  KES: "🇰🇪",
  UGX: "🇺🇬",
  TZS: "🇹🇿",
  ETB: "🇪🇹",
  NGN: "🇳🇬",
  GHS: "🇬🇭",
  ZAR: "🇿🇦",
  EUR: "🇪🇺",
  USD: "🇺🇸",
  GBP: "🇬🇧",
  CAD: "🇨🇦",
  XAF: "🇨🇲", // Central African CFA
  XOF: "🇸🇳", // West African CFA (Senegal as representative)
};

export function getFlag(fiat: string): string {
  return FIAT_FLAGS[fiat] || "🌐";
}
