"use client";

import { FormEvent, Fragment, Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { useApi, useMutate } from "@/lib/auth-context";
import { cap, dateTime, FOCUSES, FORMATS, money, STAGES, STAGE_LABEL } from "@/lib/format";
import { ErrorNote, Loading, PageHeader, Pill } from "@/components/ui";

const TABS = [
  ["products", "Products"],
  ["test", "Test contacts"],
  ["imports", "Imports"],
  ["integrations", "Integrations"],
  ["bots", "Bots"],
  ["account", "Account"],
] as const;

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Settings />
    </Suspense>
  );
}

function Settings() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = params.get("tab") || "products";
  return (
    <>
      <PageHeader title="Settings" />
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => router.replace(`${pathname}?tab=${v}`)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm ${tab === v ? "border-brand font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "products" && <Products />}
      {tab === "test" && <TestContacts />}
      {tab === "imports" && <Imports />}
      {tab === "integrations" && <Integrations />}
      {tab === "bots" && <Bots />}
      {tab === "account" && <Account />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

type Product = {
  id: number;
  product_code: string;
  format: string;
  focus: string;
  name: string;
  payhip_product_key: string | null;
  payhip_product_id: string | null;
  payhip_permalink: string | null;
  prices: Record<string, number>;
  sales_count: number;
};
type Unmapped = {
  payhip_product_name: string | null;
  payhip_product_key: string | null;
  payhip_product_id: string | null;
  payhip_permalink: string | null;
  sales_count: number;
};
type Draft = {
  product_code: string;
  format: string;
  focus: string;
  name: string;
  inr: string;
  usd: string;
  payhip_product_key: string;
  payhip_product_id: string;
  payhip_permalink: string;
};

const toDraft = (p?: Partial<Product>): Draft => ({
  product_code: p?.product_code || "",
  format: p?.format || "",
  focus: p?.focus || "",
  name: p?.name || "",
  inr: p?.prices?.INR != null ? String(p.prices.INR) : "",
  usd: p?.prices?.USD != null ? String(p.prices.USD) : "",
  payhip_product_key: p?.payhip_product_key || "",
  payhip_product_id: p?.payhip_product_id || "",
  payhip_permalink: p?.payhip_permalink || "",
});

function Products() {
  const { data, error, loading, reload } = useApi<{ data: Product[] }>("/products");
  const { data: unmapped, reload: reloadUnmapped } = useApi<{ data: Unmapped[] }>("/products/unmapped");
  const mutate = useMutate();
  const [editId, setEditId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(toDraft());
  const [msg, setMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit(p: Product | "new", prefill?: Partial<Draft>) {
    setSaveError(null);
    setMsg(null);
    setEditId(p === "new" ? "new" : p.id);
    setDraft({ ...toDraft(p === "new" ? undefined : p), ...(prefill || {}) });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaveError(null);
    const body = {
      product_code: draft.product_code,
      format: draft.format,
      focus: draft.focus,
      name: draft.name,
      payhip_product_key: draft.payhip_product_key,
      payhip_product_id: draft.payhip_product_id,
      payhip_permalink: draft.payhip_permalink,
      prices: { INR: draft.inr, USD: draft.usd },
    };
    try {
      const r =
        editId === "new"
          ? await mutate<{ linked: number }>("/products", "POST", body)
          : await mutate<{ linked: number }>(`/products/${editId}`, "PUT", body);
      setMsg(r.linked ? `Saved — ${r.linked} earlier sale item(s) linked to it.` : "Saved.");
      setEditId(null);
      reload();
      reloadUnmapped();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Product) {
    if (!window.confirm(`Delete ${p.product_code}? Its sales stay, they just lose this mapping.`)) return;
    try {
      await mutate(`/products/${p.id}`, "DELETE");
      reload();
      reloadUnmapped();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  const input = (key: keyof Draft, placeholder = "", cls = "") => (
    <input
      className={`input-field py-1.5 text-xs ${cls}`}
      placeholder={placeholder}
      value={draft[key]}
      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
    />
  );
  const choose = (key: "format" | "focus", list: string[]) => (
    <select className="input-field py-1.5 text-xs" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}>
      <option value="">—</option>
      {list.map((v) => (
        <option key={v} value={v}>
          {cap(v)}
        </option>
      ))}
    </select>
  );

  const editRow = (
    <tr className="bg-brand-light/40">
      <td className="td">{input("product_code", "MT-001")}</td>
      <td className="td">{input("name", "Shower Mixtape — Love")}</td>
      <td className="td">{choose("format", FORMATS)}</td>
      <td className="td">{choose("focus", FOCUSES)}</td>
      <td className="td space-y-1">
        {input("inr", "₹ 999")}
        {input("usd", "$ 12")}
      </td>
      <td className="td space-y-1">
        {input("payhip_product_key", "Product key")}
        {input("payhip_product_id", "Product ID")}
        {input("payhip_permalink", "Permalink, e.g. AbC12")}
      </td>
      <td className="td" colSpan={2}>
        <div className="flex gap-1">
          <button className="btn-primary btn-sm" disabled={busy}>
            Save
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setEditId(null)}>
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );

  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote message={error} />;

  return (
    <div className="space-y-6">
      <div className="card p-5 text-sm text-ink-soft">
        <p>
          Each mixtape has a code (MT-001…MT-015), a format and a focus. Sales are matched to a product by its <b>name</b> as
          shown on Payhip (e.g. &quot;Party Mixtape — Wealth&quot;), or by the Payhip product key, ID or permalink if you add them.
          Prices are list prices per currency (INR main, USD optional); each order keeps the price it was actually sold at.
        </p>
      </div>

      {unmapped && unmapped.data.length > 0 && (
        <div className="card border-warning/40 p-5">
          <h2 className="font-display text-lg">Sold on Payhip but not matched to a product</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {unmapped.data.map((u, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {u.payhip_product_name || "(no name)"}{" "}
                  <span className="text-xs text-ink-muted">
                    {[u.payhip_product_key && `key ${u.payhip_product_key}`, u.payhip_product_id && `id ${u.payhip_product_id}`]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · {u.sales_count} sale(s)
                  </span>
                </span>
                <button className="btn-secondary btn-sm" onClick={() => startEdit("new", {
                  name: u.payhip_product_name || "",
                  payhip_product_key: u.payhip_product_key || "",
                  payhip_product_id: u.payhip_product_id || "",
                  payhip_permalink: u.payhip_permalink || "",
                })}>
                  Add as product
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">If it is an existing MT product under a new name, edit that product and paste its Payhip key or ID instead.</p>
        </div>
      )}

      <ErrorNote message={saveError} />
      {msg && <p className="text-sm text-success">{msg}</p>}
      <form onSubmit={save} className="card overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="border-b border-line bg-canvas/60">
            <tr>
              <th className="th">Code</th>
              <th className="th">Name on Payhip</th>
              <th className="th">Format</th>
              <th className="th">Focus</th>
              <th className="th">Price</th>
              <th className="th">Payhip identifiers</th>
              <th className="th">Sales</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data?.data.map((p) =>
              editId === p.id ? (
                <Fragment key={p.id}>{editRow}</Fragment>
              ) : (
                <tr key={p.id}>
                  <td className="td font-mono">{p.product_code}</td>
                  <td className="td">{p.name}</td>
                  <td className="td">{cap(p.format)}</td>
                  <td className="td">{cap(p.focus)}</td>
                  <td className="td font-mono text-xs">
                    {p.prices.INR != null && <div>{money(p.prices.INR, "INR")}</div>}
                    {p.prices.USD != null && <div className="text-ink-muted">{money(p.prices.USD, "USD")}</div>}
                    {p.prices.INR == null && p.prices.USD == null && "—"}
                  </td>
                  <td className="td text-xs text-ink-soft">
                    {[p.payhip_product_key && `key ${p.payhip_product_key}`, p.payhip_product_id && `id ${p.payhip_product_id}`, p.payhip_permalink]
                      .filter(Boolean)
                      .join(" · ") || <span className="text-ink-muted">matched by name</span>}
                  </td>
                  <td className="td font-mono">{p.sales_count}</td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                      <button type="button" className="btn-ghost btn-sm text-danger" onClick={() => remove(p)} aria-label={`Delete ${p.product_code}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
            {editId === "new" && editRow}
          </tbody>
        </table>
        {editId === null && (
          <div className="border-t border-line p-3">
            <button type="button" className="btn-secondary btn-sm" onClick={() => startEdit("new")}>
              <Plus size={14} /> Add product
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Test contacts                                                       */
/* ------------------------------------------------------------------ */

type Rules = { emails: string[]; domains: string[]; coupons: string[] };

function TestContacts() {
  const { data, error, loading, reload } = useApi<{ rules: Rules; flaggedContacts: number }>("/settings/internal");
  const mutate = useMutate();
  const [form, setForm] = useState({ emails: "", domains: "", coupons: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        emails: data.rules.emails.join("\n"),
        domains: data.rules.domains.join("\n"),
        coupons: data.rules.coupons.join("\n"),
      });
    }
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote message={error} />;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await mutate<{ flagged: number; unflagged: number }>("/settings/internal", "PUT", form);
      setMsg(`Saved. ${r.flagged} contact(s) newly flagged as test, ${r.unflagged} un-flagged.`);
      reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const area = (key: keyof typeof form, label: string, hint: string, placeholder: string) => (
    <div>
      <label className="label" htmlFor={`t-${key}`}>
        {label}
      </label>
      <textarea
        id={`t-${key}`}
        className="input-field min-h-[160px] font-mono text-xs"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="card p-5 text-sm text-ink-soft">
        Team and test contacts are kept: they are imported and recorded like anyone else, but left out of the dashboard, the
        Meta exports and the bots, and hidden from the contact list unless you choose &quot;Test contacts: show&quot;.
        Currently <b>{data?.flaggedContacts ?? 0}</b> contact(s) are flagged. A contact you mark by hand on its page keeps that
        choice whatever this list says.
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {area("emails", "Emails", "One per line.", "someone@gmail.com")}
        {area("domains", "Email domains", "Everyone @ this domain, one per line.", "xlncacademy.com")}
        {area("coupons", "Coupon codes", "Anyone who orders with this code. Leave FOUNDERSCIRCLE off — those are real people.", "TEAMTEST")}
      </div>
      <ErrorNote message={err} />
      {msg && <p className="text-sm text-success">{msg}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Save and re-check all contacts"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Imports                                                             */
/* ------------------------------------------------------------------ */

type Batch = {
  id: number;
  file_name: string;
  is_dry_run: number;
  status: string;
  rows_total: number;
  rows_created: number;
  rows_duplicate: number;
  rows_rejected: number;
  contacts_created: number;
  run_by: string | null;
  started_at: string;
};

function Imports() {
  const { data, error, loading } = useApi<{ data: Batch[] }>("/imports");
  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  return (
    <div className="space-y-6">
      <div className="card p-5 text-sm text-ink-soft">
        <p>
          Past Payhip orders come in from <b>Payhip → Customers → Export</b> (CSV, or the same sheet saved as .xlsx). On the
          server, in the backend folder:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-canvas p-3 text-xs text-ink">
{`npm run import:payhip -- ./Customer_List.csv            # dry run: shows what would happen
npm run import:payhip -- ./Customer_List.csv --commit   # import`}
        </pre>
        <p className="mt-3">
          Orders are matched by Payhip Order ID, so importing the same orders twice — or orders the webhook already received — never
          counts them again.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-line bg-canvas/60">
            <tr>
              <th className="th">When</th>
              <th className="th">File</th>
              <th className="th">Mode</th>
              <th className="th">Rows</th>
              <th className="th">Imported</th>
              <th className="th">Already in CRM</th>
              <th className="th">Rejected</th>
              <th className="th">New contacts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data?.data.map((b) => (
              <tr key={b.id}>
                <td className="td whitespace-nowrap text-ink-soft">{dateTime(b.started_at)}</td>
                <td className="td">
                  {b.file_name}
                  {b.run_by && <span className="block text-xs text-ink-muted">by {b.run_by}</span>}
                </td>
                <td className="td">
                  {Number(b.is_dry_run) ? <Pill>dry run</Pill> : <Pill tone="success">imported</Pill>}
                  {b.status !== "completed" && <Pill tone="danger">{b.status}</Pill>}
                </td>
                <td className="td font-mono">{b.rows_total}</td>
                <td className="td font-mono">{b.rows_created}</td>
                <td className="td font-mono">{b.rows_duplicate}</td>
                <td className="td font-mono">{b.rows_rejected}</td>
                <td className="td font-mono">{b.contacts_created}</td>
              </tr>
            ))}
            {data?.data.length === 0 && (
              <tr>
                <td className="td text-ink-muted" colSpan={8}>
                  No imports yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Integrations                                                        */
/* ------------------------------------------------------------------ */

type Integrations = {
  payhip: { url: string; configured: boolean; lastEventAt: string | null };
  signup: { url: string; allowedOrigins: string[]; configured: boolean; lastEventAt: string | null };
  contact: { url: string; configured: boolean; formName: string | null; lastEventAt: string | null };
  bots: { teleagentWebhookUrl: string; wyltoWebhookUrl: string };
  metaPixelNote: string;
};

function CopyField({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="mt-1 flex items-center gap-2">
      <code className="flex-1 truncate rounded-lg bg-canvas px-3 py-2 text-xs">{value}</code>
      <button
        className="btn-secondary btn-sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value).catch(() => {});
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }}
        aria-label="Copy"
      >
        {done ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function IntegrationCard({
  title,
  where,
  url,
  configured,
  missing,
  lastEventAt,
  extra,
}: {
  title: string;
  where: string;
  url: string;
  configured: boolean;
  missing?: string;
  lastEventAt: string | null;
  extra?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg">{title}</h2>
        {configured ? <Pill tone="success">ready</Pill> : <Pill tone="danger">{missing || "not configured"}</Pill>}
      </div>
      <p className="mt-1 text-sm text-ink-muted">{where}</p>
      <CopyField value={url} />
      {extra}
      <p className="mt-2 text-xs text-ink-muted">Last received: {lastEventAt ? dateTime(lastEventAt) : "never"}</p>
    </div>
  );
}

function Integrations() {
  const { data, error, loading } = useApi<Integrations>("/settings/integrations");
  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return null;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <IntegrationCard
        title="Payhip sales"
        where="Payhip → Settings → Developer → Webhook URL (paid orders)."
        url={data.payhip.url}
        configured={data.payhip.configured}
        missing="PAYHIP_API_KEY missing"
        lastEventAt={data.payhip.lastEventAt}
      />
      <IntegrationCard
        title="Website sign-up form"
        where="Used by the sign-up snippet on the landing pages."
        url={data.signup.url}
        configured={data.signup.configured}
        lastEventAt={data.signup.lastEventAt}
        extra={<p className="mt-2 text-xs text-ink-muted">Accepted from: {data.signup.allowedOrigins.join(", ") || "—"}</p>}
      />
      <IntegrationCard
        title="Contact form (Netlify)"
        where='Netlify → Forms → Form notifications → Outgoing webhook, event "New form submission", with the JWS secret token.'
        url={data.contact.url}
        configured={data.contact.configured}
        missing="NETLIFY_JWS_SECRET missing"
        lastEventAt={data.contact.lastEventAt}
        extra={data.contact.formName ? <p className="mt-2 text-xs text-ink-muted">Only form: {data.contact.formName}</p> : null}
      />
      <div className="card p-5 text-sm">
        <h2 className="font-display text-lg">Bot callbacks (later)</h2>
        <p className="mt-1 text-ink-muted">Give these to TeleAgent / Wylto when the bots go live (replace the token).</p>
        <CopyField value={data.bots.teleagentWebhookUrl} />
        <CopyField value={data.bots.wyltoWebhookUrl} />
        <p className="mt-4 text-xs text-ink-muted">{data.metaPixelNote}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bots                                                                */
/* ------------------------------------------------------------------ */

type BotSettings = {
  voice: { enabled: boolean; provider: string };
  whatsapp: { enabled: boolean; provider: string };
  delayMinutes: number;
  eligibleStages: string[];
  businessHours: { start: string; end: string };
  batchSize: number;
  maxAttempts: number;
};
type BotsResponse = {
  settings: BotSettings;
  providers: { name: string; label: string; channel: string; configured: boolean; missing: string[] }[];
  masterSwitch: boolean;
  counts: { with_mobile: number; reached: number; failed: number };
};

function Bots() {
  const { data, error, loading, reload } = useApi<BotsResponse>("/settings/bots");
  const mutate = useMutate();
  const [s, setS] = useState<BotSettings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) setS(data.settings);
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  if (!data || !s) return null;

  async function save() {
    setErr(null);
    setMsg(null);
    try {
      await mutate("/settings/bots", "PUT", s);
      setMsg("Saved.");
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    }
  }

  async function runNow() {
    setErr(null);
    setMsg(null);
    try {
      const r = await mutate<{ ran: boolean; reason: string | null; channels: Record<string, string> }>("/settings/bots/run-now", "POST");
      setMsg(r.ran ? `Ran: ${Object.entries(r.channels).map(([k, v]) => `${k} ${v}`).join(" · ")}` : `Did not run: ${r.reason}`);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed");
    }
  }

  const channel = (key: "voice" | "whatsapp", label: string) => {
    const options = data.providers.filter((p) => p.channel === key);
    const current = options.find((p) => p.name === s[key].provider);
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">{label}</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s[key].enabled} onChange={(e) => setS({ ...s, [key]: { ...s[key], enabled: e.target.checked } })} />
            On
          </label>
        </div>
        <label className="label mt-3">Provider</label>
        <select className="input-field" value={s[key].provider} onChange={(e) => setS({ ...s, [key]: { ...s[key], provider: e.target.value } })}>
          {options.map((p) => (
            <option key={p.name} value={p.name}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs">
          {current?.configured ? <Pill tone="success">keys set</Pill> : <Pill tone="danger">needs {current?.missing.join(", ")}</Pill>}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-xl2 border px-4 py-3 text-sm ${data.masterSwitch ? "border-success/30 bg-success/10" : "border-line bg-surface"}`}>
        {data.masterSwitch ? (
          <>Bots master switch is <b>on</b> (BOTS_ENABLED=true). Channels below that are on and have keys will run.</>
        ) : (
          <>
            Bots are <b>off</b> for now: BOTS_ENABLED is not &quot;true&quot; in the server .env, so nobody is contacted whatever is set
            here. Bots only ever contact people who have a mobile number and are not unsubscribed.
          </>
        )}
        <p className="mt-1 text-xs text-ink-muted">
          {data.counts.with_mobile} contacts have a mobile · {data.counts.reached} reached · {data.counts.failed} failed
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {channel("voice", "Voice call bot")}
        {channel("whatsapp", "WhatsApp bot")}
      </div>

      <div className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label">Wait after mobile added (min)</label>
          <input type="number" min={0} className="input-field" value={s.delayMinutes} onChange={(e) => setS({ ...s, delayMinutes: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">Business hours (IST)</label>
          <div className="flex gap-2">
            <input type="time" className="input-field" value={s.businessHours.start} onChange={(e) => setS({ ...s, businessHours: { ...s.businessHours, start: e.target.value } })} />
            <input type="time" className="input-field" value={s.businessHours.end} onChange={(e) => setS({ ...s, businessHours: { ...s.businessHours, end: e.target.value } })} />
          </div>
        </div>
        <div>
          <label className="label">Per run</label>
          <input type="number" min={1} max={200} className="input-field" value={s.batchSize} onChange={(e) => setS({ ...s, batchSize: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">Max attempts</label>
          <input type="number" min={1} max={10} className="input-field" value={s.maxAttempts} onChange={(e) => setS({ ...s, maxAttempts: Number(e.target.value) })} />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="label">Stages to contact</label>
          <div className="flex flex-wrap gap-4 text-sm">
            {STAGES.map((st) => (
              <label key={st} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.eligibleStages.includes(st)}
                  onChange={(e) =>
                    setS({
                      ...s,
                      eligibleStages: e.target.checked ? [...s.eligibleStages, st] : s.eligibleStages.filter((x) => x !== st),
                    })
                  }
                />
                {STAGE_LABEL[st]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <ErrorNote message={err} />
      {msg && <p className="text-sm text-success">{msg}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" onClick={save}>
          Save bot settings
        </button>
        <button className="btn-secondary" onClick={runNow} disabled={!data.masterSwitch}>
          Run now
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

function Account() {
  const mutate = useMutate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);
    if (form.newPassword !== form.confirm) return setErr("New passwords do not match");
    try {
      await mutate("/auth/change-password", "POST", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setOk(true);
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not change password");
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-md space-y-3 p-5">
      <h2 className="font-display text-lg">Change password</h2>
      <ErrorNote message={err} />
      {ok && <p className="text-sm text-success">Password changed.</p>}
      {(["currentPassword", "newPassword", "confirm"] as const).map((k) => (
        <div key={k}>
          <label className="label">{k === "currentPassword" ? "Current password" : k === "newPassword" ? "New password (10+ characters)" : "Repeat new password"}</label>
          <input
            type="password"
            className="input-field"
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            autoComplete={k === "currentPassword" ? "current-password" : "new-password"}
            required
          />
        </div>
      ))}
      <button className="btn-primary">Update password</button>
    </form>
  );
}
