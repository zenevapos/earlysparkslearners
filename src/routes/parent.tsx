import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/parent")({
  head: () => ({ meta: [{ title: "LittleSparks — Parent Dashboard" }] }),
  component: () => (
    <AppShell>
      <ParentLayout />
    </AppShell>
  ),
});

const TABS = [
  { to: "/parent", label: "Overview" },
  { to: "/parent/gallery", label: "Gallery" },
  { to: "/parent/badges", label: "Badges" },
] as const;

function ParentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <h1 className="truncate text-2xl font-black">Parent Dashboard 📊</h1>
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-muted px-4 text-sm font-bold text-muted-foreground active:scale-95 transition-transform"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
      <div className="mb-4 flex gap-1 rounded-2xl bg-muted p-1 text-sm font-bold">
        {TABS.map((t) => {
          const active = location.pathname === t.to;
          return (
            <Link key={t.to} to={t.to}
              className={`flex-1 rounded-xl py-2 text-center transition-colors ${active ? "bg-card text-primary shadow" : "text-muted-foreground"}`}>
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}