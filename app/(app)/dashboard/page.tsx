"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useApi } from "@/lib/auth-context";
import { cap, money, relative, STAGES, STAGE_LABEL } from "@/lib/format";
import { ErrorNote, Loading, PageHeader, StatusBadge } from "@/components/ui";

type Revenue = { currency: string; orders: number; paidOrders: number; gross: number; refunded: number; net: number };
type Summary = {
  stages: Record<string, number>;
  totals: { contacts: number; buyers: number; paidBuyers: number; unsubscribed: number; withMobile: number; consented: number; testContacts: number };
  revenue: Revenue[];
  last7Days: { sales: number; signups: number; messages: number; rejected: number; duplicates: number };
  byFocus: { focus: string; buyers: number; paidBuyers: number }[];
  byFormat: { format: string; orders: number }[];
  byCampaign: { campaign: string; contacts: number; paidBuyers: number }[];
  unmappedProducts: number;
  recent: {
    id: number;
    contact_id: number | null;
    contact_email: string | null;
    email_raw: string | null;
    status: string;
    summary: string;
    created_at: string;
  }[];
};

function Stat({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const body = (
    <div className="card h-full p-5 transition-colors hover:border-brand/40">
      <p className="label">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function DashboardPage() {
  const { data, error, loading } = useApi<Summary>("/dashboard/summary");

  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return null;

  const maxStage = Math.max(1, ...STAGES.map((s) => data.stages[s]));
  const inr = data.revenue.find((r) => r.currency === "INR") || { currency: "INR", orders: 0, paidOrders: 0, gross: 0, refunded: 0, net: 0 };
  const others = data.revenue.filter((r) => r.currency !== "INR");
  const totalOrders = data.revenue.reduce((n, r) => n + r.orders, 0);
  const paidOrders = data.revenue.reduce((n, r) => n + r.paidOrders, 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Real customers only — ${data.totals.testContacts} test contact${data.totals.testContacts === 1 ? " is" : "s are"} left out.`}
      />

      {data.unmappedProducts > 0 && (
        <Link
          href="/settings?tab=products"
          className="mb-6 flex items-center gap-3 rounded-xl2 border border-warning/30 bg-accent-light px-4 py-3 text-sm text-ink"
        >
          <AlertTriangle size={18} className="text-warning" />
          {data.unmappedProducts} Payhip product{data.unmappedProducts > 1 ? "s are" : " is"} not matched to an MT code yet. Map{" "}
          {data.unmappedProducts > 1 ? "them" : "it"} in Settings → Products.
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Contacts" value={data.totals.contacts} hint={`${data.totals.unsubscribed} unsubscribed`} href="/contacts" />
        <Stat
          label="Paying customers"
          value={data.totals.paidBuyers}
          hint={`${data.totals.buyers} buyers incl. 100%-off`}
          href="/contacts?buyer=paid"
        />
        <Stat
          label="Revenue (INR)"
          value={money(inr.net, "INR")}
          hint={others.length ? `+ ${others.map((r) => money(r.net, r.currency)).join(" + ")} earlier` : `${inr.paidOrders} paid orders`}
        />
        <Stat label="Orders" value={totalOrders} hint={`${paidOrders} paid · ${totalOrders - paidOrders} free`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="font-display text-lg">Stages</h2>
          <div className="mt-4 space-y-3">
            {STAGES.map((s) => (
              <Link key={s} href={`/contacts?stage=${s}`} className="block">
                <div className="flex justify-between text-sm">
                  <span>{STAGE_LABEL[s]}</span>
                  <span className="font-mono text-ink-soft">{data.stages[s]}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-canvas">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${(data.stages[s] / maxStage) * 100}%` }} />
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <div>
              <p className="label">With mobile</p>
              <p className="font-mono">{data.totals.withMobile}</p>
            </div>
            <div>
              <p className="label">Email consent</p>
              <p className="font-mono">{data.totals.consented}</p>
            </div>
          </div>
          {data.revenue.length > 0 && (
            <div className="mt-4 border-t border-line pt-4 text-sm">
              <p className="label">Revenue by currency</p>
              <table className="w-full">
                <tbody>
                  {data.revenue.map((r) => (
                    <tr key={r.currency}>
                      <td className="py-1">{r.currency}</td>
                      <td className="py-1 text-right font-mono">{money(r.net, r.currency)}</td>
                      <td className="py-1 text-right text-xs text-ink-muted">
                        {r.paidOrders}/{r.orders} paid
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-display text-lg">Buyers by focus</h2>
          {data.byFocus.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Appears once sales come in.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {data.byFocus.map((f) => (
                <li key={f.focus} className="flex justify-between">
                  <Link href={`/contacts?focus=${f.focus}&buyer=any`} className="hover:text-brand">
                    {cap(f.focus)}
                  </Link>
                  <span className="font-mono text-ink-soft">
                    {f.buyers} <span className="text-xs text-ink-muted">({f.paidBuyers} paid)</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <h2 className="mt-6 font-display text-lg">Orders by format</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.byFormat.map((f) => (
              <li key={f.format} className="flex justify-between">
                <Link href={`/contacts?format=${f.format}`} className="hover:text-brand">
                  {cap(f.format)}
                </Link>
                <span className="font-mono text-ink-soft">{f.orders}</span>
              </li>
            ))}
            {data.byFormat.length === 0 && <li className="text-ink-muted">—</li>}
          </ul>
          <h2 className="mt-6 font-display text-lg">Top campaigns</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {data.byCampaign.map((c) => (
                <tr key={c.campaign} className="border-t border-line first:border-0">
                  <td className="py-1.5 pr-2">{c.campaign}</td>
                  <td className="py-1.5 text-right font-mono text-ink-soft">
                    {c.contacts} <span className="text-ink-muted">/ {c.paidBuyers} paid</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">Latest events</h2>
            <Link href="/events" className="text-xs text-brand hover:underline">
              All events
            </Link>
          </div>
          {data.last7Days.rejected > 0 && (
            <Link href="/events?status=rejected" className="mt-2 block text-xs text-danger hover:underline">
              {data.last7Days.rejected} rejected this week — check the error log
            </Link>
          )}
          <ul className="mt-3 divide-y divide-line">
            {data.recent.map((e) => (
              <li key={e.id} className="py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  {e.contact_id ? (
                    <Link href={`/contacts/${e.contact_id}`} className="truncate font-medium hover:text-brand">
                      {e.contact_email}
                    </Link>
                  ) : (
                    <span className="truncate text-ink-muted">{e.email_raw || "(no email)"}</span>
                  )}
                  <StatusBadge status={e.status} />
                </div>
                <p className="truncate text-xs text-ink-muted">
                  {e.summary} · {relative(e.created_at)}
                </p>
              </li>
            ))}
            {data.recent.length === 0 && <li className="py-4 text-sm text-ink-muted">No live events yet (imports are not listed here).</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
