import { createFileRoute } from "@tanstack/react-router";
import { useActiveChildData, useGamification } from "@/lib/hooks/useChildren";

export const Route = createFileRoute("/parent/badges")({
  component: Badges,
});

const BADGES = [
  { id: "first_star", emoji: "⭐", name: "First Star", desc: "Earn your first star", threshold: 1, kind: "stars" },
  { id: "ten_stars", emoji: "🌟", name: "Ten Stars", desc: "Collect 10 stars", threshold: 10, kind: "stars" },
  { id: "fifty_stars", emoji: "🏆", name: "Star Champion", desc: "Collect 50 stars", threshold: 50, kind: "stars" },
  { id: "streak_3", emoji: "🔥", name: "3-Day Streak", desc: "Play 3 days in a row", threshold: 3, kind: "streak" },
  { id: "streak_7", emoji: "🚀", name: "Week Streak", desc: "Play 7 days in a row", threshold: 7, kind: "streak" },
  { id: "sticker_book", emoji: "📖", name: "Sticker Star", desc: "Fill 5 stickers", threshold: 5, kind: "stickers" },
];

function Badges() {
  const { data: child } = useActiveChildData();
  const { data: g } = useGamification(child?.id);
  const stars = g?.total_stars ?? 0;
  const streak = g?.streak_days ?? 0;
  const stickers = ((g?.sticker_book as any[]) ?? []).length;

  return (
    <div className="grid grid-cols-2 gap-3 pb-4">
      {BADGES.map((b) => {
        const value = b.kind === "stars" ? stars : b.kind === "streak" ? streak : stickers;
        const earned = value >= b.threshold;
        return (
          <div key={b.id} className={`rounded-3xl p-4 text-center shadow-md transition-all ${earned ? "bg-card" : "bg-muted opacity-60"}`}>
            <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-4xl ${earned ? "bg-warning/30 animate-bounce-in" : "bg-muted-foreground/10 grayscale"}`}>{b.emoji}</div>
            <p className="mt-2 text-sm font-black">{b.name}</p>
            <p className="text-[11px] text-muted-foreground">{b.desc}</p>
            <p className="mt-1 text-[11px] font-bold text-primary">{earned ? "Earned!" : `${value}/${b.threshold}`}</p>
          </div>
        );
      })}
    </div>
  );
}