"use client";

import { Fragment, Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/auth-context";
import { dateTime, SOURCE_LABEL } from "@/lib/format";
import { Empty, ErrorNote, Loading, PageHeader, Pager, StatusBadge } from "@/components/ui";

type EventRow = {
  id: number;
  contact_id: number | null;
  contact_email: string | null;
  source: string;
  type: string;
  status: string;
  email_raw: string | null;
  summary: string | null;
  error: string | null;
  created_at: string;
};
type ListResponse = { data: EventRow[]; total: number; page: number; pageSize: number };
type EventDetail = { payload: unknown; details: unknown };

const TABS = [
  ["", "All"],
  ["rejected", "Rejected (error log)"],
  ["duplicate", "Duplicates"],
  ["ignored", "Ignored"],
] as const;

export default function EventsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Events />
    </Suspense>
  );
}

function Events() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get("status") || "";
  const source = params.get("source") || "";
  const q = params.get("q") || "";
  const page = Number(params.get("page") || 1);
  const [search, setSearch] = useState(q);
  const [openId, setOpenId] = useState<number | null>(null);

  const qs = new URLSearchParams({ page: String(page), pageSize: "50" });
  if (status) qs.set("status", status);
  if (source) qs.set("source", source);
  if (q) qs.set("q", q);
  const { data, error, loading } = useApi<ListResponse>(`/events?${qs.toString()}`);
  const { data: detail } = useApi<EventDetail>(openId ? `/events/${openId}` : null);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <>
      <PageHeader
        title="Event log"
        subtitle="Every incoming sale, sign-up and message is saved here — including rejected and duplicate ones."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([v, l]) => (
          <button key={v} className={status === v ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={() => setParam("status", v)}>
            {l}
          </button>
        ))}
        <select className="input-field w-auto py-1.5 text-xs" value={source} onChange={(e) => setParam("source", e.target.value)}>
          <option value="">All sources</option>
          {["payhip", "signup", "contact_form", "admin", "bot"].map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABEL[s]}
            </option>
          ))}
        </select>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", search.trim());
          }}
        >
          <input className="input-field w-56 py-1.5 text-xs" placeholder="Search email or text" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </div>

      <div className="card overflow-hidden">
        {error ? (
          <div className="p-4">
            <ErrorNote message={error} />
          </div>
        ) : loading && !data ? (
          <Loading />
        ) : !data?.data.length ? (
          <Empty>No events.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-line bg-canvas/60">
                <tr>
                  <th className="th">When</th>
                  <th className="th">Source</th>
                  <th className="th">Email</th>
                  <th className="th">What happened</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((e) => (
                  <Fragment key={e.id}>
                    <tr className="cursor-pointer hover:bg-canvas/60" onClick={() => setOpenId(openId === e.id ? null : e.id)}>
                      <td className="td whitespace-nowrap text-ink-soft">{dateTime(e.created_at)}</td>
                      <td className="td text-ink-soft">{SOURCE_LABEL[e.source] || e.source}</td>
                      <td className="td">
                        {e.contact_id ? (
                          <Link href={`/contacts/${e.contact_id}`} className="hover:text-brand" onClick={(ev) => ev.stopPropagation()}>
                            {e.contact_email}
                          </Link>
                        ) : (
                          <span className="text-ink-muted">{e.email_raw || "—"}</span>
                        )}
                      </td>
                      <td className="td">
                        {e.summary}
                        {e.error && <p className="text-xs text-danger">{e.error}</p>}
                      </td>
                      <td className="td">
                        <StatusBadge status={e.status} />
                      </td>
                    </tr>
                    {openId === e.id && (
                      <tr>
                        <td colSpan={5} className="bg-canvas px-4 py-3">
                          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-ink-soft">
                            {detail ? JSON.stringify({ details: detail.details, payload: detail.payload }, null, 2) : "Loading…"}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
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
