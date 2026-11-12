"use client";

import { type ReactNode } from "react";
import { STAGE_LABEL } from "@/lib/format";

const STAGE_STYLE: Record<string, string> = {
  contact: "bg-line/70 text-ink-soft",
  subscriber: "bg-brand-light text-brand-dark",
  customer: "bg-accent-light text-warning",
  repeat_buyer: "bg-accent text-white",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_STYLE[stage] || ""}`}>
      {STAGE_LABEL[stage] || stage}
    </span>
  );
}

const STATUS_STYLE: Record<string, string> = {
  processed: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
  duplicate: "bg-warning/10 text-warning",
  ignored: "bg-line text-ink-muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status] || "bg-line"}`}>
      {status}
    </span>
  );
}

export function Pill({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "danger" | "success" }) {
  const cls = { plain: "bg-canvas text-ink-soft border border-line", danger: "bg-danger/10 text-danger", success: "bg-success/10 text-success" }[tone];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-ink-muted">{label}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-ink-muted">{children}</p>;
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-muted">
      <span>
        {total === 0 ? "0" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`} of {total}
      </span>
      <div className="flex gap-2">
        <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

/** Text wordmark. To use the real logo, put the file in /public and swap this for <img src="/wishtune-logo.svg" … />. */
export function Logo({ light = false, size = "md" }: { light?: boolean; size?: "md" | "lg" }) {
  return (
    <span
      className={`font-display font-semibold tracking-[0.28em] ${size === "lg" ? "text-2xl" : "text-lg"} ${
        light ? "text-white" : "text-ink"
      }`}
    >
      WISHTUNE
    </span>
  );
}
