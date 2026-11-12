// Display helpers. All timestamps from the API are UTC; shown in IST.

export const STAGES = ["contact", "subscriber", "customer", "repeat_buyer"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<string, string> = {
  contact: "Contact",
  subscriber: "Subscriber",
  customer: "Customer",
  repeat_buyer: "Repeat buyer",
};

export const SOURCE_LABEL: Record<string, string> = {
  buyer: "Buyer (Payhip)",
  signup: "Sign-up form",
  contact_message: "Contact message",
  payhip: "Payhip",
  import: "Payhip import",
  contact_form: "Contact form",
  admin: "Admin",
  bot: "Bot",
  system: "System",
};

export const FOCUSES = ["love", "beauty", "health", "wealth", "everything"];
export const FORMATS = ["shower", "party", "sleep"];

export const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "");

export function dateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateOnly(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Amount in its own currency: money(1999) → ₹1,999 · money(24, "USD") → $24 */
export function money(amount?: number | string | null, currency = "INR") {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${n.toLocaleString(currency === "INR" ? "en-IN" : "en-US", { maximumFractionDigits: 2 })}`;
}

/** "₹1,999 + $24" from per-currency totals, INR first; "—" when nothing was paid. */
export function moneyTotals(totals: Record<string, number | string | null | undefined>) {
  const parts = Object.entries(totals)
    .filter(([, v]) => Number(v) > 0)
    .sort(([a], [b]) => (a === "INR" ? -1 : b === "INR" ? 1 : a.localeCompare(b)))
    .map(([c, v]) => money(v, c));
  return parts.length ? parts.join(" + ") : "—";
}

export function fullName(c: { first_name?: string | null; last_name?: string | null }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

export function relative(value?: string | null) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : dateOnly(value);
}
