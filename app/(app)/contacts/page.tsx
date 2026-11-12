"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Search, X } from "lucide-react";
import { useApi, useAuth } from "@/lib/auth-context";
import { cap, dateOnly, fullName, moneyTotals, SOURCE_LABEL, STAGE_LABEL } from "@/lib/format";
import { Empty, ErrorNote, Loading, PageHeader, Pager, Pill, StageBadge } from "@/components/ui";

type ContactRow = {
  id: number;
  primary_email: string | null;
  primary_mobile: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  stage: string;
  lead_source: string;
  first_page_seen: string | null;
  utm_campaign: string | null;
  email_consent: number | null;
  unsubscribed: number;
  is_internal: number;
  purchase_count: number;
  paid_purchase_count: number;
  paid_inr: string | number;
  paid_usd: string | number;
  last_purchase_at: string | null;
  products: string | null;
};
type ListResponse = { data: ContactRow[]; total: number; page: number; pageSize: number };
type Options = {
  stages: string[];
  focuses: string[];
  formats: string[];
  sources: string[];
  products: { product_code: string; name: string | null }[];
  campaigns: string[];
  countries: string[];
  currencies: string[];
};

const FILTER_KEYS = [
  "q", "stage", "buyer", "focus", "format", "product", "currency", "source", "country",
  "campaign", "consent", "unsubscribed", "has_mobile", "internal", "sort",
];

export default function ContactsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Contacts />
    </Suspense>
  );
}

function Contacts() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { apiFetch } = useAuth();
  const [search, setSearch] = useState(params.get("q") || "");
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    for (const k of FILTER_KEYS) {
      const v = params.get(k);
      if (v) f[k] = v;
    }
    return f;
  }, [params]);
  const page = Number(params.get("page") || 1);
  const qs = new URLSearchParams({ ...filters, page: String(page), pageSize: "25" }).toString();

  const { data, error, loading } = useApi<ListResponse>(`/contacts?${qs}`);
  const { data: options } = useApi<Options>("/contacts/filter-options");

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  }

  async function download(type: "all" | "paid" | "buyers" | "exclusion") {
    setExporting(type);
    setExportError(null);
    try {
      const res = await apiFetch(`/contacts/export.csv?${new URLSearchParams({ ...filters, type }).toString()}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Export failed");
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || `wishtune-${type}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  const activeCount = Object.keys(filters).filter((k) => k !== "sort").length;

  const select = (key: string, label: string, opts: [string, string][], allLabel: string | null = "All") => (
    <div>
      <label className="label" htmlFor={`f-${key}`}>
        {label}
      </label>
      <select id={`f-${key}`} className="input-field" value={filters[key] || ""} onChange={(e) => setParam(key, e.target.value)}>
        {allLabel !== null && <option value="">{allLabel}</option>}
        {opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  const exportBtn = (type: "all" | "paid" | "buyers" | "exclusion", label: string, title: string, primary = false) => (
    <button className={primary ? "btn-primary" : "btn-secondary"} onClick={() => download(type)} disabled={Boolean(exporting)} title={title}>
      <Download size={15} /> {exporting === type ? "Exporting…" : label}
    </button>
  );

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="One record per email. Test contacts are hidden unless you choose to show them."
        actions={
          <>
            {exportBtn("all", "Filtered CSV", "Exactly the contacts this list shows")}
            {exportBtn("paid", "Meta: paying customers", "Paid at least once, not unsubscribed, not test — upload to Meta as a custom audience", true)}
            {exportBtn("buyers", "All buyers", "Every buyer incl. 100%-off orders, not unsubscribed, not test")}
            {exportBtn("exclusion", "Buyer exclusion list", "Every buyer (incl. free and unsubscribed) — exclude from prospecting ads")}
          </>
        }
      />
      <ErrorNote message={exportError} />

      <div className="card mb-6 p-4">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", search.trim());
          }}
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="input-field pl-9"
            placeholder="Search email, name or mobile — press Enter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {select("stage", "Stage", (options?.stages || []).map((s) => [s, STAGE_LABEL[s]]))}
          {select("buyer", "Buyer", [
            ["paid", "Paying customers"],
            ["free_only", "Free (100% off) only"],
            ["any", "Any buyer"],
            ["non_buyer", "Non-buyers"],
          ])}
          {select("focus", "Focus", (options?.focuses || []).map((s) => [s, cap(s)]))}
          {select("format", "Format", (options?.formats || []).map((s) => [s, cap(s)]))}
          {select(
            "product",
            "Product",
            (options?.products || []).map((p) => [p.product_code, p.name ? `${p.product_code} · ${p.name}` : p.product_code]),
          )}
          {select("currency", "Paid in", (options?.currencies || []).map((c) => [c, c]))}
          {select("source", "Lead source", (options?.sources || []).map((s) => [s, SOURCE_LABEL[s] || s]))}
          {select("country", "Country", (options?.countries || []).map((c) => [c, c]))}
          {select("campaign", "Campaign", (options?.campaigns || []).map((c) => [c, c]))}
          {select("consent", "Email consent", [
            ["yes", "Yes"],
            ["no", "No"],
            ["unknown", "Not asked"],
          ])}
          {select("unsubscribed", "Unsubscribed", [
            ["0", "Subscribed"],
            ["1", "Unsubscribed"],
          ])}
          {select("has_mobile", "Mobile", [
            ["1", "Has mobile"],
            ["0", "No mobile"],
          ])}
          {select(
            "internal",
            "Test contacts",
            [
              ["", "Hide"],
              ["include", "Show too"],
              ["only", "Only test"],
            ],
            null,
          )}
          {select(
            "sort",
            "Sort by",
            [
              ["", "Latest activity"],
              ["newest", "Newest contact"],
              ["last_purchase", "Last purchase"],
              ["purchases", "Most purchases"],
              ["email", "Email A–Z"],
            ],
            null,
          )}
          <div className="flex items-end">
            {activeCount > 0 && (
              <button
                className="btn-ghost w-full"
                onClick={() => {
                  setSearch("");
                  router.replace(pathname);
                }}
              >
                <X size={15} /> Clear {activeCount}
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Focus matches buyers of that focus and sign-ups from that page. Format, product and currency match buyers only.
        </p>
      </div>

      <div className="card overflow-hidden">
        {error ? (
          <div className="p-4">
            <ErrorNote message={error} />
          </div>
        ) : loading && !data ? (
          <Loading />
        ) : !data?.data.length ? (
          <Empty>No contacts match these filters.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-line bg-canvas/60">
                <tr>
                  <th className="th">Contact</th>
                  <th className="th">Stage</th>
                  <th className="th">Products</th>
                  <th className="th">Orders · paid</th>
                  <th className="th">Last purchase</th>
                  <th className="th">Source · page · campaign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((c) => {
                  const name = fullName(c);
                  return (
                    <tr key={c.id} className="hover:bg-canvas/60">
                      <td className="td">
                        <Link href={`/contacts/${c.id}`} className="font-medium text-ink hover:text-brand">
                          {c.primary_email || c.primary_mobile || `#${c.id}`}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-ink-muted">
                          {name && <span>{name}</span>}
                          {c.primary_mobile && <span>· {c.primary_mobile}</span>}
                          {c.country && <span>· {c.country}</span>}
                          {Number(c.is_internal) === 1 && <Pill>test</Pill>}
                          {Number(c.unsubscribed) === 1 && <Pill tone="danger">unsubscribed</Pill>}
                        </div>
                      </td>
                      <td className="td">
                        <StageBadge stage={c.stage} />
                      </td>
                      <td className="td max-w-[220px] text-ink-soft">{c.products || "—"}</td>
                      <td className="td text-ink-soft">
                        {c.purchase_count > 0 ? (
                          <>
                            <span className="font-mono">{c.purchase_count}</span>
                            <span className="text-ink-muted"> · </span>
                            {Number(c.paid_purchase_count) === 0 ? (
                              <span className="text-xs text-ink-muted">free</span>
                            ) : (
                              <span className="font-mono">{moneyTotals({ INR: c.paid_inr, USD: c.paid_usd })}</span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="td text-ink-soft">{dateOnly(c.last_purchase_at)}</td>
                      <td className="td text-xs text-ink-soft">
                        {SOURCE_LABEL[c.lead_source] || c.lead_source}
                        {c.first_page_seen ? ` · ${c.first_page_seen}` : ""}
                        {c.utm_campaign ? ` · ${c.utm_campaign}` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > 0 && (
          <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => setParam("page", String(p))} />
        )}
      </div>
    </>
  );
}
