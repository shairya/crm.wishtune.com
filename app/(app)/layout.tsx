"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, LayoutDashboard, LogOut, Menu, Settings, Users, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { IS_SANDBOX, Logo, SandboxBanner } from "@/components/ui";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/events", label: "Event log", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isLoading, user, pathname, router]);

  if (isLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <SandboxBanner />
      {open && <div className="fixed inset-0 z-40 bg-ink/40 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-ink text-white transition-transform md:translate-x-0 ${IS_SANDBOX ? "top-7" : ""} ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            <Logo light />
          </Link>
          <button className="rounded p-1 hover:bg-white/10 md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 pt-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "bg-white/10 font-medium text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={17} className={active ? "text-accent" : ""} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm">{user.fullName}</p>
          <p className="truncate text-xs text-white/50">{user.email}</p>
          <button
            className="mt-3 flex items-center gap-2 text-xs text-white/70 hover:text-white"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:hidden">
        <button className="rounded p-1.5 hover:bg-canvas" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <Logo />
      </header>

      <main className="md:pl-60">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
