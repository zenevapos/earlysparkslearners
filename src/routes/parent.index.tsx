import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveChildData, useGamification } from "@/lib/hooks/useChildren";
import { Flame, Star, Clock, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

export const Route = createFileRoute("/parent/")({
  component: Overview,
});

function Overview() {
  const { data: child } = useActiveChildData();
  const { data: game } = useGamification(child?.id);
  const { data: sessions } = useQuery({
    queryKey: ["sessions", child?.id],
    enabled: !!child?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("module, duration_seconds, created_at")
        .eq("child_id", child!.id)
        .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString());
      if (error) throw error;
      return data;
    },
  });
  const { data: handwriting } = useQuery({
    queryKey: ["handwriting", child?.id],
    enabled: !!child?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handwriting_attempts")
        .select("accuracy_score, created_at")
        .eq("child_id", child!.id)
        .order("created_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // 7-day activity bars
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { day: d.toLocaleDateString(undefined, { weekday: "short" }), date: d.toISOString().slice(0, 10), minutes: 0 };
  });
  sessions?.forEach((s) => {
    const d = new Date(s.created_at).toISOString().slice(0, 10);
    const slot = days.find((x) => x.date === d);
    if (slot) slot.minutes += Math.round(s.duration_seconds / 60);
  });

  const accuracy = (handwriting ?? []).map((h, i) => ({ n: i + 1, score: h.accuracy_score }));

  // Module breakdown
  const byModule = new Map<string, number>();
  sessions?.forEach((s) => byModule.set(s.module, (byModule.get(s.module) ?? 0) + s.duration_seconds));

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Star} label="Stars" value={game?.total_stars ?? 0} color="oklch(0.85 0.16 90)" />
        <Stat icon={Flame} label="Streak" value={`${game?.streak_days ?? 0}d`} color="oklch(0.72 0.18 50)" />
        <Stat icon={Clock} label="This week" value={`${Math.round((sessions?.reduce((s, x) => s + x.duration_seconds, 0) ?? 0) / 60)}m`} color="oklch(0.78 0.11 230)" />
        <Stat icon={Trophy} label="Badges" value={(game?.badges as any[])?.length ?? 0} color="oklch(0.82 0.13 320)" />
      </div>

      <Card title="Activity (last 7 days)">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={days}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="day" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12 }} />
            <Bar dataKey="minutes" fill="#7C5CBF" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Handwriting accuracy">
        {accuracy.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No attempts yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={accuracy}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="n" fontSize={11} />
              <YAxis fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 12 }} />
              <Line type="monotone" dataKey="score" stroke="#F97316" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Time by module (this week)">
        {byModule.size === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {Array.from(byModule.entries()).map(([m, s]) => (
              <li key={m} className="flex items-center justify-between">
                <span className="text-sm font-bold capitalize">{m.replace("game:", "🎮 ")}</span>
                <span className="text-sm text-muted-foreground">{Math.max(1, Math.round(s / 60))} min</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="rounded-3xl p-4 shadow-md" style={{ background: color }}>
      <Icon className="h-6 w-6 text-foreground/70" />
      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-foreground/70">{label}</p>
      <p className="text-2xl font-black text-foreground">{value}</p>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-md">
      <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}