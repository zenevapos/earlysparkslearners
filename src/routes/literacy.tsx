import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { useActiveChildData } from "@/lib/hooks/useChildren";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { awardStars, logSession } from "@/lib/rewards";
import { StarBurst, GentleFeedback } from "@/components/Reward";
import { sfx, speak, speakLetterSound, speakLetterName } from "@/lib/sound";
import { ArrowLeft, Volume2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/literacy")({
  head: () => ({
    meta: [
      { title: "Letter Sounds & Blending for Kids | LittleSparks" },
      { name: "description", content: "Phonics practice with spoken letter sounds and 50 blending tasks for two and three letter words." },
      { property: "og:title", content: "Letter Sounds & Blending for Kids | LittleSparks" },
      { property: "og:description", content: "Tap letters to hear their sounds, then blend them into words — 50 tasks per game." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AppShell><Literacy /></AppShell>,
});

type Mode = "sounds" | "blend2" | "blend3";
const TOTAL = 50;

function Literacy() {
  const [mode, setMode] = useState<Mode | null>(null);
  if (!mode) {
    return (
      <div className="mx-auto max-w-md px-4 pt-4">
        <header className="mb-4"><h1 className="text-2xl font-black">Reading & Sounds 📖</h1></header>
        <p className="mb-4 text-sm text-muted-foreground">Tap a letter or word to hear it. Blending games have {TOTAL} tasks each.</p>
        <div className="grid gap-3">
          <Tile color="oklch(0.88 0.13 50)" emoji="🔤" title="Letter Sounds" sub="a, b, c…" onClick={() => setMode("sounds")} />
          <Tile color="oklch(0.85 0.13 145)" emoji="🧩" title="Blend 2 sounds" sub="a + t = at" onClick={() => setMode("blend2")} />
          <Tile color="oklch(0.82 0.13 230)" emoji="📚" title="Blend 3 sounds" sub="c + a + t = cat" onClick={() => setMode("blend3")} />
        </div>
      </div>
    );
  }
  if (mode === "sounds") return <Sounds onExit={() => setMode(null)} />;
  return <Blender mode={mode} onExit={() => setMode(null)} />;
}

function Tile({ color, emoji, title, sub, onClick }: { color: string; emoji: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-4 rounded-3xl p-5 text-left shadow-md active:scale-[0.98]"
      style={{ background: color }}>
      <span className="text-5xl">{emoji}</span>
      <div className="flex-1">
        <p className="text-lg font-black text-foreground">{title}</p>
        <p className="text-sm font-bold text-foreground/70">{sub}</p>
      </div>
      <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">Go ▶</span>
    </button>
  );
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

function Sounds({ onExit }: { onExit: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [caseMode, setCaseMode] = useState<"lower" | "upper">("lower");
  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <header className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="grid h-12 w-12 place-items-center rounded-2xl bg-card shadow"><ArrowLeft /></button>
        <h2 className="text-lg font-black">Letter Sounds</h2>
        <span className="w-12" />
      </header>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1 text-sm font-bold">
        {(["lower", "upper"] as const).map((m) => (
          <button key={m} onClick={() => setCaseMode(m)}
            className={`h-11 rounded-xl transition-colors ${caseMode === m ? "bg-card text-primary shadow" : "text-muted-foreground"}`}>
            {m === "lower" ? "abc" : "ABC"}
          </button>
        ))}
      </div>
      <p className="mb-3 text-center text-sm text-muted-foreground">Tap a letter to hear its sound. Tap again for its name.</p>
      <div className="grid grid-cols-5 gap-2">
        {ALPHABET.map((l) => (
          <button key={l}
            onClick={() => {
              sfx.tap();
              if (picked === l) { speakLetterName(l); setPicked(null); }
              else { speakLetterSound(l); setPicked(l); }
            }}
            className={`aspect-square rounded-2xl text-3xl font-black shadow active:scale-95 transition-colors ${picked === l ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
            style={{ fontFamily: "'Edu NSW ACT Foundation', cursive" }}>
            {caseMode === "upper" ? l.toUpperCase() : l}
          </button>
        ))}
      </div>
    </div>
  );
}

const CVC_WORDS = [
  { w: "cat", emoji: "🐱" }, { w: "dog", emoji: "🐶" }, { w: "sun", emoji: "☀️" },
  { w: "hat", emoji: "🎩" }, { w: "pig", emoji: "🐷" }, { w: "bus", emoji: "🚌" },
  { w: "cup", emoji: "🥤" }, { w: "bed", emoji: "🛏️" }, { w: "fox", emoji: "🦊" },
  { w: "bag", emoji: "👜" }, { w: "pen", emoji: "🖊️" }, { w: "log", emoji: "🪵" },
  { w: "car", emoji: "🚗" }, { w: "cow", emoji: "🐮" }, { w: "hen", emoji: "🐔" },
  { w: "bee", emoji: "🐝" }, { w: "ant", emoji: "🐜" }, { w: "bat", emoji: "🦇" },
  { w: "rat", emoji: "🐀" }, { w: "owl", emoji: "🦉" }, { w: "ram", emoji: "🐏" },
  { w: "van", emoji: "🚐" }, { w: "jet", emoji: "✈️" }, { w: "map", emoji: "🗺️" },
  { w: "key", emoji: "🔑" }, { w: "box", emoji: "📦" }, { w: "mug", emoji: "☕" },
  { w: "pot", emoji: "🍲" }, { w: "pan", emoji: "🍳" }, { w: "egg", emoji: "🥚" },
  { w: "jam", emoji: "🍓" }, { w: "bun", emoji: "🍞" }, { w: "nut", emoji: "🥜" },
  { w: "fig", emoji: "🍈" }, { w: "yam", emoji: "🍠" }, { w: "corn", emoji: "🌽" },
  { w: "leg", emoji: "🦵" }, { w: "lip", emoji: "👄" }, { w: "ear", emoji: "👂" },
  { w: "eye", emoji: "👁️" }, { w: "toe", emoji: "🦶" }, { w: "sock", emoji: "🧦" },
  { w: "cap", emoji: "🧢" }, { w: "web", emoji: "🕸️" }, { w: "sea", emoji: "🌊" },
  { w: "moon", emoji: "🌙" }, { w: "star", emoji: "⭐" }, { w: "rain", emoji: "🌧️" },
  { w: "fan", emoji: "🪭" }, { w: "drum", emoji: "🥁" }, { w: "ball", emoji: "⚽" },
  { w: "fish", emoji: "🐟" }, { w: "frog", emoji: "🐸" }, { w: "duck", emoji: "🦆" },
];
const VC_WORDS = [
  { w: "at", emoji: "📍" }, { w: "in", emoji: "➡️" }, { w: "on", emoji: "🔛" },
  { w: "up", emoji: "⬆️" }, { w: "is", emoji: "✅" }, { w: "it", emoji: "👉" },
  { w: "an", emoji: "🅰️" }, { w: "am", emoji: "🙋" }, { w: "if", emoji: "❓" },
  { w: "as", emoji: "🔁" }, { w: "ox", emoji: "🐂" }, { w: "us", emoji: "👨‍👩‍👧" },
  { w: "go", emoji: "🟢" }, { w: "no", emoji: "🚫" }, { w: "so", emoji: "💫" },
  { w: "me", emoji: "🙂" }, { w: "we", emoji: "👫" }, { w: "he", emoji: "👦" },
  { w: "by", emoji: "🚶" }, { w: "my", emoji: "🫱" }, { w: "do", emoji: "🛠️" },
  { w: "to", emoji: "🎯" }, { w: "be", emoji: "🐝" }, { w: "of", emoji: "📎" },
];

function Blender({ mode, onExit }: { mode: "blend2" | "blend3"; onExit: () => void }) {
  const { data: child } = useActiveChildData();
  const qc = useQueryClient();
  const pool = mode === "blend2" ? VC_WORDS : CVC_WORDS;
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const startedAt = useMemo(() => Date.now(), []);

  // Shuffled queue so all 50 tasks feel varied and repeat as little as possible
  const queue = useMemo(() => {
    const out: typeof pool = [];
    while (out.length < TOTAL) out.push(...[...pool].sort(() => Math.random() - 0.5));
    return out.slice(0, TOTAL);
  }, [pool]);

  const target = queue[round];
  const opts = useMemo(() => {
    const set = new Map<string, { w: string; emoji: string }>();
    set.set(target.w, target);
    while (set.size < 3) {
      const r = pool[Math.floor(Math.random() * pool.length)];
      set.set(r.w, r);
    }
    return Array.from(set.values()).sort(() => Math.random() - 0.5);
  }, [target, pool]);

  useEffect(() => { setRevealed(false); }, [round]);

  function playSounds() {
    target.w.split("").forEach((l, i) => setTimeout(() => speakLetterSound(l), i * 700));
    setTimeout(() => speak(target.w, { rate: 0.85 }), target.w.length * 700 + 300);
  }

  const starsFor = (s: number) => (s >= TOTAL * 0.8 ? 3 : s >= TOTAL * 0.5 ? 2 : 1);

  async function finish(finalScore: number) {
    sfx.win();
    if (child) {
      await supabase.from("game_scores").insert({
        child_id: child.id,
        game_name: `literacy:${mode}`,
        score: finalScore,
        level: 1,
      });
      await awardStars(child.id, starsFor(finalScore));
      await logSession(child.id, `literacy:${mode}`, Math.round((Date.now() - startedAt) / 1000));
      qc.invalidateQueries({ queryKey: ["gamification"] });
    }
    setBurst((b) => b + 1);
    setDone(true);
  }

  function pick(w: string) {
    if (w === target.w) {
      sfx.correct();
      speak(`Yes! ${target.w}`);
      setFeedback("Great blending! 🎉");
      setScore((s) => {
        const ns = s + 1;
        setTimeout(() => {
          setFeedback(null);
          if (round + 1 >= TOTAL) finish(ns);
          else setRound((r) => r + 1);
        }, 1100);
        return ns;
      });
    } else {
      sfx.wrong();
      setFeedback("Listen again 👂");
      setTimeout(() => setFeedback(null), 900);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 pt-10 text-center">
        <p className="text-6xl animate-bounce-in">📚</p>
        <h2 className="mt-3 text-2xl font-black">Super reader!</h2>
        <p className="mt-1 text-muted-foreground">You scored {score} / {TOTAL}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={onExit} className="h-14 rounded-2xl bg-muted font-bold">Back</button>
          <button onClick={() => { setRound(0); setScore(0); setDone(false); }}
            className="h-14 rounded-2xl bg-primary font-black text-primary-foreground shadow-lg flex items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5" /> Play again
          </button>
        </div>
        <StarBurst key={burst} show={burst > 0} count={starsFor(score)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <header className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="grid h-12 w-12 place-items-center rounded-2xl bg-card shadow"><ArrowLeft /></button>
        <h2 className="text-lg font-black">{mode === "blend2" ? "Blend 2 sounds" : "Blend 3 sounds"}</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{round + 1}/{TOTAL}</span>
      </header>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-success transition-all" style={{ width: `${(round / TOTAL) * 100}%` }} />
      </div>

      <div className="rounded-3xl bg-card p-5 shadow">
        <p className="text-center text-sm font-bold text-muted-foreground">Listen, then pick the word</p>
        <div className="mt-3 flex justify-center gap-2">
          {target.w.split("").map((l, i) => (
            <button key={i} onClick={() => { sfx.tap(); speakLetterSound(l); }}
              className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-4xl font-black text-primary shadow"
              style={{ fontFamily: "'Edu NSW ACT Foundation', cursive" }}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={playSounds}
          className="mx-auto mt-4 flex h-12 items-center gap-2 rounded-full bg-accent px-5 font-black text-white shadow">
          <Volume2 className="h-5 w-5" /> Hear it
        </button>
        <button onClick={() => { setRevealed(true); speak(target.w); }}
          className="mx-auto mt-2 block text-xs font-bold text-muted-foreground underline">
          {revealed ? `It's "${target.w}" ${target.emoji}` : "Show me a hint"}
        </button>
      </div>

      <p className="mt-5 text-center text-sm font-bold">Which picture is it?</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {opts.map((o) => (
          <button key={o.w} onClick={() => pick(o.w)}
            className="aspect-square rounded-3xl bg-card text-5xl shadow-md active:scale-95">
            {o.emoji}
          </button>
        ))}
      </div>

      {feedback && <div className="mt-4"><GentleFeedback message={feedback} /></div>}
    </div>
  );
}
