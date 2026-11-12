"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Ban, Bot, FlaskConical, MessageSquarePlus, Pencil, ShoppingBag } from "lucide-react";
import { useApi, useMutate } from "@/lib/auth-context";
import { dateOnly, dateTime, fullName, money, moneyTotals, SOURCE_LABEL, STAGE_LABEL } from "@/lib/format";
import { ErrorNote, Loading, PageHeader, Pill, StageBadge, StatusBadge } from "@/components/ui";

type Contact = {
  id: number;
  primary_email: string | null;
  primary_mobile: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  state: string | null;
  stage: string;
  lead_source: string;
  first_page_seen: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  email_consent: number | null;
  email_consent_at: string | null;
  unsubscribed: number;
  unsubscribed_at: string | null;
  is_internal: number;
  internal_reason: string | null;
  purchase_count: number;
  paid_purchase_count: number;
  last_coupon_code: string | null;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  created_at: string;
};
type Identifier = { type: string; value: string; value_raw: string | null; is_primary: number; source: string | null; first_seen_at: string };
type Order = {
  id: number;
  payhip_order_id: string;
  currency: string;
  list_amount: string | null;
  discount_amount: string;
  amount_gross: string;
  coupon_code: string | null;
  coupon_pct: string | null;
  used_coupon: number;
  is_free: number;
  payment_type: string | null;
  status: string;
  refunded_amount: string | null;
  refunded_at: string | null;
  downloads: number | null;
  ordered_at: string;
  date_precision: "second" | "day";
  source: "webhook" | "import";
  items: {
    payhip_product_name: string | null;
    product_code: string | null;
    product_name: string | null;
    format: string | null;
    focus: string | null;
    quantity: number;
  }[];
};
type EventRow = {
  id: number;
  source: string;
  type: string;
  status: string;
  summary: string | null;
  details: Record<string, unknown> | null;
  error: string | null;
  stage_before: string | null;
  stage_after: string | null;
  occurred_at: string | null;
  created_at: string;
  created_by_name: string | null;
};
type Outreach = { channel: string; provider: string; status: string; attempts: number; mobile: string; last_error: string | null };
type Detail = {
  contact: Contact;
  identifiers: Identifier[];
  orders: Order[];
  events: EventRow[];
  outreach: Outreach[];
  mergedInto: { id: number; primary_email: string } | null;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="break-words text-sm text-ink [overflow-wrap:anywhere]">{children || <span className="text-ink-muted">—</span>}</dd>
    </div>
  );
}

export default function ContactPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<Detail>(`/contacts/${id}`);
  const mutate = useMutate();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", mobile: "" });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return null;
  const { contact: c, identifiers, orders, events, outreach, mergedInto } = data;
  const unsub = Number(c.unsubscribed) === 1;
  const isTest = Number(c.is_internal) === 1;
  const name = fullName(c);

  const paidTotals: Record<string, number> = {};
  for (const o of orders) {
    paidTotals[o.currency] = (paidTotals[o.currency] || 0) + Number(o.amount_gross) - Number(o.refunded_amount || 0);
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      reload();
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (await run(() => mutate(`/contacts/${c.id}`, "PATCH", form))) setEditing(false);
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    if (await run(() => mutate(`/contacts/${c.id}/notes`, "POST", { text: note }))) setNote("");
  }

  function toggleUnsubscribe() {
    const msg = unsub
      ? "Remove the unsubscribe? This person may be contacted again (bots, future emails)."
      : "Mark as unsubscribed? They will never be contacted by email or bots.";
    if (window.confirm(msg)) run(() => mutate(`/contacts/${c.id}`, "PATCH", { unsubscribed: !unsub }));
  }

  function toggleTest() {
    const msg = isTest
      ? "Mark as a real contact? They will count in the dashboard and appear in Meta exports."
      : "Mark as a test / team contact? They will be hidden from the dashboard, Meta exports and bots.";
    if (window.confirm(msg)) run(() => mutate(`/contacts/${c.id}`, "PATCH", { is_internal: !isTest }));
  }

  return (
    <>
      <Link href="/contacts" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand">
        <ArrowLeft size={15} /> Contacts
      </Link>
      <PageHeader
        title={name || c.primary_email || `Contact #${c.id}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {name && <span>{c.primary_email}</span>}
            <StageBadge stage={c.stage} />
            {Number(c.paid_purchase_count) > 0 ? <Pill tone="success">paying customer</Pill> : c.purchase_count > 0 ? <Pill>free orders only</Pill> : null}
            {isTest && <Pill>test {c.internal_reason === "manual" ? "(set by hand)" : "(test list)"}</Pill>}
            {unsub && <Pill tone="danger">Unsubscribed {dateOnly(c.unsubscribed_at)}</Pill>}
          </span>
        }
        actions={
          <>
            <button className="btn-secondary" onClick={toggleTest} disabled={busy}>
              <FlaskConical size={15} /> {isTest ? "Not a test contact" : "Mark as test"}
            </button>
            <button className={unsub ? "btn-secondary" : "btn-danger"} onClick={toggleUnsubscribe} disabled={busy}>
              <Ban size={15} /> {unsub ? "Remove unsubscribe" : "Mark unsubscribed"}
            </button>
          </>
        }
      />
      {mergedInto && (
        <p className="mb-4 rounded-lg bg-accent-light px-3 py-2 text-sm">
          This record was merged into{" "}
          <Link className="text-brand underline" href={`/contacts/${mergedInto.id}`}>
            {mergedInto.primary_email}
          </Link>
          .
        </p>
      )}
      <ErrorNote message={actionError} />

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">Details</h2>
              {!editing && (
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    setForm({ first_name: c.first_name || "", last_name: c.last_name || "", mobile: c.primary_mobile || "" });
                    setEditing(true);
                  }}
                >
                  <Pencil size={13} /> Edit
                </button>
              )}
            </div>
            {editing ? (
              <form onSubmit={saveEdit} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="first_name">
                      First name
                    </label>
                    <input id="first_name" className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="last_name">
                      Last name
                    </label>
                    <input id="last_name" className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="mobile">
                    Mobile
                  </label>
                  <input
                    id="mobile"
                    className="input-field"
                    placeholder="98765 43210 or +91…"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-ink-muted">10-digit numbers get +91. Once bots are on, contacts with a mobile are reached automatically.</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary btn-sm" disabled={busy}>
                    Save
                  </button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <Field label="Email">{c.primary_email}</Field>
                <Field label="Mobile">{c.primary_mobile}</Field>
                <Field label="Name">{name}</Field>
                <Field label="Country">{[c.state, c.country].filter(Boolean).join(", ")}</Field>
                <Field label="Stage">{STAGE_LABEL[c.stage]}</Field>
                <Field label="Lead source">{SOURCE_LABEL[c.lead_source]}</Field>
                <Field label="First page seen">{c.first_page_seen}</Field>
                <Field label="Campaign">{c.utm_campaign}</Field>
                <Field label="UTM source">{c.utm_source}</Field>
                <Field label="UTM medium">{c.utm_medium}</Field>
                <Field label="Email consent">
                  {c.email_consent === null ? null : `${Number(c.email_consent) ? "Yes" : "No"} · ${dateOnly(c.email_consent_at)}`}
                </Field>
                <Field label="First seen">{dateOnly(c.created_at)}</Field>
              </dl>
            )}
            {identifiers.length > 1 && !editing && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="label">All emails &amp; mobiles</p>
                <ul className="space-y-1 text-sm">
                  {identifiers.map((i) => (
                    <li key={i.type + i.value} className="flex justify-between gap-2">
                      <span className="[overflow-wrap:anywhere]">
                        {i.value} {Number(i.is_primary) === 1 && <span className="text-xs text-ink-muted">(primary)</span>}
                      </span>
                      <span className="text-xs text-ink-muted">{SOURCE_LABEL[i.source || ""] || i.source}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg">
              <ShoppingBag size={17} /> Purchases
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <Field label="Orders">{`${c.purchase_count} (${c.paid_purchase_count} paid)`}</Field>
              <Field label="Paid">{moneyTotals(paidTotals)}</Field>
              <Field label="Last">{dateOnly(c.last_purchase_at)}</Field>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id} className="py-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">
                      {Number(o.is_free) ? "Free" : money(o.amount_gross, o.currency)}
                      {o.list_amount && Number(o.discount_amount) > 0 && (
                        <span className="ml-1 text-xs font-normal text-ink-muted line-through">{money(o.list_amount, o.currency)}</span>
                      )}
                    </span>
                    <span className="text-ink-muted">{o.date_precision === "day" ? dateOnly(o.ordered_at) : dateTime(o.ordered_at)}</span>
                  </div>
                  {o.items.map((i, idx) => (
                    <p key={idx} className="text-ink-soft">
                      {i.product_code ? `${i.product_code} · ` : ""}
                      {i.product_name || i.payhip_product_name}
                      {!i.product_code && <span className="ml-1 text-xs text-warning">not mapped</span>}
                    </p>
                  ))}
                  <p className="text-xs text-ink-muted">
                    Order {o.payhip_order_id}
                    {o.coupon_code ? ` · ${o.coupon_code}${o.coupon_pct ? ` (${Number(o.coupon_pct)}% off)` : ""}` : Number(o.used_coupon) ? " · coupon used" : ""}
                    {o.payment_type ? ` · ${o.payment_type}` : ""}
                    {o.downloads !== null ? ` · ${o.downloads} download${o.downloads === 1 ? "" : "s"}` : ""}
                    {o.source === "import" ? " · imported" : ""}
                    {o.refunded_at ? ` · refunded ${money(o.refunded_amount, o.currency)} on ${dateOnly(o.refunded_at)}` : ""}
                  </p>
                </li>
              ))}
              {orders.length === 0 && <li className="py-3 text-sm text-ink-muted">No purchases yet.</li>}
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg">
              <Bot size={17} /> Bot outreach
            </h2>
            {outreach.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">
                {isTest
                  ? "Test contacts are never contacted by bots."
                  : c.primary_mobile
                    ? "Not contacted by a bot yet (bots are switched off until set up in Settings)."
                    : "No mobile number — bots only contact people with a mobile."}
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {outreach.map((o) => (
                  <li key={o.channel} className="flex justify-between gap-2">
                    <span>
                      {o.channel === "voice" ? "Voice call" : "WhatsApp"} · {o.provider}
                      {o.last_error && <span className="block text-xs text-danger">{o.last_error}</span>}
                    </span>
                    <span className="text-ink-muted">
                      {o.status} · {o.attempts}×
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card p-5">
            <h2 className="font-display text-lg">Events &amp; notes</h2>
            <form onSubmit={addNote} className="mt-3">
              <textarea
                className="input-field min-h-[80px]"
                placeholder="Add a note — e.g. a support email from wishtune.support@gmail.com"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={5000}
              />
              <button className="btn-primary btn-sm mt-2" disabled={busy || !note.trim()}>
                <MessageSquarePlus size={14} /> Add note
              </button>
            </form>

            <ol className="mt-6">
              {events.map((e) => (
                <li key={e.id} className="relative border-l-2 border-line pb-5 pl-5 last:pb-0">
                  <span
                    className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-surface ${
                      e.type === "sale" ? "bg-accent" : e.type === "note" ? "bg-ink-muted" : e.status === "processed" ? "bg-brand" : "bg-line"
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>{e.source === "import" && e.occurred_at ? dateOnly(e.occurred_at) : dateTime(e.occurred_at || e.created_at)}</span>
                    <span>·</span>
                    <span>{SOURCE_LABEL[e.source] || e.source}</span>
                    {e.created_by_name && <span>· {e.created_by_name}</span>}
                    {e.status !== "processed" && <StatusBadge status={e.status} />}
                    {e.stage_before !== e.stage_after && e.stage_after && (
                      <span className="text-brand">
                        {e.stage_before ? `${STAGE_LABEL[e.stage_before]} → ` : "New · "}
                        {STAGE_LABEL[e.stage_after]}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">
                    {e.type === "note" ? String(e.details?.text ?? e.summary) : e.summary}
                  </p>
                  {e.type === "contact_message" && typeof e.details?.message === "string" && (
                    <p className="mt-1 whitespace-pre-wrap rounded-lg bg-canvas p-3 text-sm text-ink-soft">{e.details.message}</p>
                  )}
                  {typeof e.details?.mobileConflict === "string" && <p className="mt-0.5 text-xs text-warning">{e.details.mobileConflict}</p>}
                  {e.error && <p className="mt-0.5 text-xs text-danger">{e.error}</p>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}

