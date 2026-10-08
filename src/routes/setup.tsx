import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useChildren } from "@/lib/hooks/useChildren";
import { useActiveChild } from "@/lib/store";
import { AVATARS } from "@/lib/avatars";
import { toast } from "sonner";
import { Plus, LogOut } from "lucide-react";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "LittleSparks — Choose Child" }] }),
  component: SetupPage,
});

function SetupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: kids } = useChildren(user?.id);
  const { setChildId } = useActiveChild();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState(3);
  const [avatar, setAvatar] = useState(0);

  if (loading) return <div className="p-8 text-center">Loading…</div>;
  if (!user) {
    navigate({ to: "/auth" });
    return null;
  }

  async function pickChild(id: string) {
    setChildId(id);
    navigate({ to: "/" });
  }

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if ((kids?.length ?? 0) >= 5) {
      toast.error("Up to 5 children per account.");
      return;
    }
    const { data, error } = await supabase
      .from("child_profiles")
      .insert({ user_id: user!.id, name: name.trim(), age, avatar_id: avatar })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["children"] });
    setChildId(data.id);
    toast.success(`Welcome, ${name}!`);
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-8 pb-12">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <h1 className="truncate text-2xl font-black text-foreground">Who's playing?</h1>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {kids && kids.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {kids.map((k) => {
            const a = AVATARS[k.avatar_id] ?? AVATARS[0];
            return (
              <button
                key={k.id}
                onClick={() => pickChild(k.id)}
                className="flex flex-col items-center gap-2 rounded-3xl bg-card p-3 shadow-md transition-transform active:scale-95"
              >
                <div className="grid h-16 w-16 place-items-center rounded-full text-3xl shadow-inner" style={{ background: a.bg }}>
                  {a.emoji}
                </div>
                <span className="truncate text-sm font-bold">{k.name}</span>
                <span className="text-xs text-muted-foreground">Age {k.age}</span>
              </button>
            );
          })}
        </div>
      )}

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-4 border-dashed border-primary/40 text-base font-black text-primary"
        >
          <Plus className="h-5 w-5" /> Add a child
        </button>
      ) : (
        <form onSubmit={addChild} className="space-y-4 rounded-3xl bg-card p-5 shadow-xl">
          <h2 className="text-lg font-black">New little spark</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="h-14 w-full rounded-2xl border-2 border-border bg-background px-4 text-base focus:border-primary focus:outline-none"
            required
          />
          <div>
            <label className="mb-2 block text-sm font-bold">Age: <span className="text-primary">{age}</span></label>
            <input
              type="range"
              min={1}
              max={6}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold">Pick an avatar</label>
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAvatar(a.id)}
                  className={`grid h-16 w-full place-items-center rounded-2xl text-3xl shadow-inner transition-all ${avatar === a.id ? "ring-4 ring-primary scale-105" : ""}`}
                  style={{ background: a.bg }}
                >
                  {a.emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(false)} className="h-14 flex-1 rounded-2xl bg-muted font-bold">Cancel</button>
            <button type="submit" className="h-14 flex-1 rounded-2xl bg-primary font-black text-primary-foreground shadow-lg">Save</button>
          </div>
        </form>
      )}
    </div>
  );
}