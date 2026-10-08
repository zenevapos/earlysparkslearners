import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/hooks/useAuth";
import { useActiveChildData, useChildren, useGamification } from "@/lib/hooks/useChildren";
import { useActiveChild } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { getAvatar } from "@/lib/avatars";
import { Flame, Pencil, Brush, Puzzle, BookOpen, Calculator, Sparkles, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";


export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "LittleSparks — Home" },
      { name: "description", content: "Today's playful learning adventures." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <HomeContent />
    </AppShell>
  );
}

const DAILY_CHALLENGES = [
  { emoji: "✏️", title: "Trace the letter A", to: "/handwriting" },
  { emoji: "🎨", title: "Draw a happy sun", to: "/drawing" },
  { emoji: "🧩", title: "Match 3 shapes", to: "/games" },
  { emoji: "🔢", title: "Count to 5", to: "/games" },
  { emoji: "🌈", title: "Colour a rainbow", to: "/drawing" },
];

function HomeContent() {
  const { user } = useAuth();
  const { data: child } = useActiveChildData();
  const { data: kids } = useChildren(user?.id);
  const { data: game } = useGamification(child?.id);
  const { setChildId } = useActiveChild();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const challenge = useMemo(() => DAILY_CHALLENGES[Math.floor(Math.random() * DAILY_CHALLENGES.length)], []);

  if (!child) {
    return <div className="p-6 text-center text-muted-foreground">Loading your sparkles…</div>;
  }
  const avatar = getAvatar(child.avatar_id);

  function switchChild(id: string, name: string) {
    setChildId(id);
    setShowSwitcher(false);
    toast.success(`Switched to ${name}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-6">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <button
          onClick={() => setShowSwitcher(s => !s)}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl text-3xl shadow-lg ring-4 ring-white"
            style={{ background: avatar.bg }}
          >
            {avatar.emoji}
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hello <ChevronDown className={`h-3 w-3 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
            </p>
            <h1 className="truncate text-2xl font-black text-foreground">{child.name}! <span className="animate-wiggle inline-block">👋</span></h1>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-warning/90 px-3 py-2 text-white shadow-md">
          <Flame className="h-5 w-5 fill-white" />
          <span className="text-lg font-black">{game?.streak_days ?? 0}</span>
        </div>
      </header>

      {/* Child switcher */}
      {showSwitcher && kids && kids.length > 1 && (
        <div className="mt-3 rounded-2xl bg-card p-3 shadow-lg ring-1 ring-border animate-in slide-in-from-top-2">
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Switch player</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {kids.map((k) => {
              const a = getAvatar(k.avatar_id);
              const isActive = k.id === child.id;
              return (
                <button
                  key={k.id}
                  onClick={() => switchChild(k.id, k.name)}
                  className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl p-2 transition-all ${isActive ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted'}`}
                >
                  <div
                    className="grid h-12 w-12 place-items-center rounded-full text-2xl shadow-inner"
                    style={{ background: a.bg }}
                  >
                    {a.emoji}
                  </div>
                  <span className={`text-xs font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{k.name}</span>
                </button>
              );
            })}
            <Link
              to="/setup"
              onClick={() => setShowSwitcher(false)}
              className="flex shrink-0 flex-col items-center gap-1 rounded-2xl bg-muted p-2"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full text-2xl bg-background shadow-inner">
                +
              </div>
              <span className="text-xs font-bold text-muted-foreground">Add</span>
            </Link>
          </div>
        </div>
      )}

      {/* Stars chip */}
      <div className="mt-4 flex items-center justify-between rounded-3xl bg-gradient-to-r from-primary to-accent p-4 text-white shadow-xl animate-star-burst">
        <div>
          <p className="text-xs font-bold uppercase opacity-90">My stars</p>
          <p className="text-3xl font-black">⭐ {game?.total_stars ?? 0}</p>
        </div>
        <Sparkles className="h-12 w-12 opacity-80" />
      </div>

      {/* Feature grid */}
      <h2 className="mt-6 mb-3 text-xl font-black text-foreground">Let's play!</h2>
      <div className="grid grid-cols-2 gap-3">
        <FeatureCard to="/handwriting" emoji="✏️" title="Writing" color="oklch(0.88 0.12 50)" Icon={Pencil} />
        <FeatureCard to="/literacy" emoji="📖" title="Reading" color="oklch(0.85 0.13 145)" Icon={BookOpen} />
        <FeatureCard to="/maths" emoji="🔢" title="Maths" color="oklch(0.82 0.13 230)" Icon={Calculator} />
        <FeatureCard to="/drawing" emoji="🎨" title="Drawing" color="oklch(0.85 0.13 320)" Icon={Brush} />
        <FeatureCard to="/games" emoji="🧩" title="Games" color="oklch(0.88 0.10 30)" Icon={Puzzle} />
      </div>

      {/* Challenge */}
      <div className="mt-6 rounded-3xl border-4 border-dashed border-accent/40 bg-card p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Today's Challenge</p>
        <Link to={challenge.to} className="mt-2 flex items-center gap-3">
          <span className="text-4xl">{challenge.emoji}</span>
          <span className="flex-1 text-base font-bold text-foreground">{challenge.title}</span>
          <span className="rounded-full bg-accent px-4 py-2 text-sm font-black text-white">Go!</span>
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({ to, emoji, title, color, Icon }: { to: string; emoji: string; title: string; color: string; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link
      to={to}
      className="group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl p-4 shadow-md transition-transform active:scale-95"
      style={{ background: color }}
    >
      <span className="text-5xl">{emoji}</span>
      <span className="text-base font-black text-foreground">{title}</span>
      <Icon className="absolute right-3 top-3 h-5 w-5 text-foreground/40" />
    </Link>
  );
}
