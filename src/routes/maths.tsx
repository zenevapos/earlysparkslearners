import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { useActiveChildData } from "@/lib/hooks/useChildren";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { awardStars, logSession } from "@/lib/rewards";
import { StarBurst, GentleFeedback } from "@/components/Reward";
import { sfx, speak, speakNumber } from "@/lib/sound";
import { ArrowLeft, Plus, Minus, RefreshCw, Hash, Volume2 } from "lucide-react";

export const Route = createFileRoute("/maths")({
  head: () => ({
    meta: [
      { title: "Simple Maths for Little Learners | LittleSparks" },
      { name: "description", content: "50 adding and taking away tasks with spoken numbers, picture counters and star rewards for ages 1-6." },
      { property: "og:title", content: "Simple Maths for Little Learners | LittleSparks" },
      { property: "og:description", content: "Adding, taking away and number sounds — 50 friendly tasks per game." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AppShell><Maths /></AppShell>,
});

type Op = "add" | "sub";
const TOTAL = 50;

function Maths() {
  const [op, setOp] = useState<Op | null>(null);
  const [numbers, setNumbers] = useState(false);

  if (numbers) return <NumberSounds onExit={() => setNumbers(false)} />;
  if (!op) {
    return (
      <div className="mx-auto max-w-md px-4 pt-4">
        <header className="mb-4"><h1 className="text-2xl font-black">Simple Maths 🔢</h1></header>
        <p className="mb-4 text-sm text-muted-foreground">Pick what you'd like to practise. Each game has {TOTAL} tasks.</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setOp("add")}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl p-4 shadow-md active:scale-95"
            style={{ background: "oklch(0.88 0.13 50)" }}>
            <Plus className="h-12 w-12" />
            <span className="text-lg font-black">Adding</span>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">1 + 2 = ?</span>
          </button>
          <button onClick={() => setOp("sub")}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl p-4 shadow-md active:scale-95"
            style={{ background: "oklch(0.85 0.13 320)" }}>
            <Minus className="h-12 w-12" />
            <span className="text-lg font-black">Taking Away</span>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">5 − 2 = ?</span>
          </button>
        </div>
        <button onClick={() => setNumbers(true)}
          className="mt-3 flex w-full items-center gap-4 rounded-3xl p-5 text-left shadow-md active:scale-[0.98]"
          style={{ background: "oklch(0.85 0.13 200)" }}>
          <Hash className="h-10 w-10" />
          <div className="flex-1">
            <p className="text-lg font-black">Number Sounds</p>
            <p className="text-sm font-bold text-foreground/70">Tap 0–20 to hear each number</p>
          </div>
          <Volume2 className="h-6 w-6" />
        </button>
      </div>
    );
  }
  return <Runner op={op} onExit={() => setOp(null)} />;
}

function NumberSounds({ onExit }: { onExit: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <header className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="grid h-12 w-12 place-items-center rounded-2xl bg-card shadow"><ArrowLeft /></button>
        <h2 className="text-lg font-black">Number Sounds</h2>
        <span className="w-12" />
      </header>
      <p className="mb-3 text-center text-sm text-muted-foreground">Tap any number to hear it said out loud.</p>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 21 }, (_, n) => n).map((n) => (
          <button key={n} onClick={() => { sfx.tap(); speakNumber(n); setPicked(n); }}
            className={`aspect-square rounded-2xl text-2xl font-black shadow active:scale-95 transition-colors ${picked === n ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Difficulty grows gently across the 50 tasks. */
function makeQuestion(op: Op, round: number) {
  const max = round < 15 ? 5 : round < 30 ? 8 : round < 42 ? 10 : 12;
  if (op === "add") {
    const a = 1 + Math.floor(Math.random() * max);
    const b = 1 + Math.floor(Math.random() * max);
    return { a, b, answer: a + b };
  }
  const a = 2 + Math.floor(Math.random() * (max + 2));
  const b = 1 + Math.floor(Math.random() * (a - 1));
  return { a, b, answer: a - b };
}

function Runner({ op, onExit }: { op: Op; onExit: () => void }) {
  const { data: child } = useActiveChildData();
  const qc = useQueryClient();
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(() => makeQuestion(op, 0));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);
  const startedAt = useMemo(() => Date.now(), []);

  const opSym = op === "add" ? "+" : "−";

  useEffect(() => {
    speak(`${q.a} ${op === "add" ? "plus" : "minus"} ${q.b}`);
  }, [q, op]);

  const options = useMemo(() => {
    const set = new Set<number>([q.answer]);
    while (set.size < 4) {
      const n = Math.max(0, q.answer + (Math.floor(Math.random() * 7) - 3));
      if (n !== q.answer) set.add(n);
    }
    return Array.from(set).sort(() => Math.random() - 0.5);
  }, [q]);

  const starsFor = (s: number) => (s >= TOTAL * 0.8 ? 3 : s >= TOTAL * 0.5 ? 2 : 1);

  async function finish(finalScore: number) {
    sfx.win();
    if (child) {
      await supabase.from("game_scores").insert({
        child_id: child.id,
        game_name: `maths:${op}`,
        score: finalScore,
        level: 1,
      });
      await awardStars(child.id, starsFor(finalScore));
      await logSession(child.id, `maths:${op}`, Math.round((Date.now() - startedAt) / 1000));
      qc.invalidateQueries({ queryKey: ["gamification"] });
    }
    setBurst((b) => b + 1);
    setDone(true);
  }

  function pick(n: number) {
    speakNumber(n);
    if (n === q.answer) {
      sfx.correct();
      setFeedback(`Yes! ${q.a} ${opSym} ${q.b} = ${q.answer} 🎉`);
      setScore((s) => {
        const ns = s + 1;
        setTimeout(() => {
          setFeedback(null);
          if (round + 1 >= TOTAL) finish(ns);
          else { setRound((r) => r + 1); setQ(makeQuestion(op, round + 1)); }
        }, 1100);
        return ns;
      });
    } else {
      sfx.wrong();
      setFeedback("Almost! Try another 💛");
      setTimeout(() => setFeedback(null), 900);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 pt-10 text-center">
        <p className="text-6xl animate-bounce-in">🎉</p>
        <h2 className="mt-3 text-2xl font-black">Maths champ!</h2>
        <p className="mt-1 text-muted-foreground">You scored {score} / {TOTAL}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={onExit} className="h-14 rounded-2xl bg-muted font-bold">Back</button>
          <button onClick={() => { setRound(0); setScore(0); setDone(false); setQ(makeQuestion(op, 0)); }}
            className="h-14 rounded-2xl bg-primary font-black text-primary-foreground shadow-lg flex items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5" /> Play again
          </button>
        </div>
        <StarBurst key={burst} show={burst > 0} count={starsFor(score)} />
      </div>
    );
  }

  const dotsA = Array.from({ length: q.a });
  const dotsB = Array.from({ length: q.b });

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <header className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="grid h-12 w-12 place-items-center rounded-2xl bg-card shadow"><ArrowLeft /></button>
        <h2 className="text-lg font-black">{op === "add" ? "Adding ➕" : "Taking Away ➖"}</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{round + 1}/{TOTAL}</span>
      </header>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-success transition-all" style={{ width: `${(round / TOTAL) * 100}%` }} />
      </div>

      <div className="rounded-3xl bg-card p-5 shadow">
        <p className="text-center text-4xl font-black tracking-wider">
          <button onClick={() => speakNumber(q.a)}>{q.a}</button> <span className="text-primary">{opSym}</span>{" "}
          <button onClick={() => speakNumber(q.b)}>{q.b}</button> = <span className="text-accent">?</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-center">
            <div className="flex flex-wrap justify-center gap-1 text-3xl">{dotsA.map((_, i) => <span key={i}>🍎</span>)}</div>
          </div>
          <div className="rounded-2xl bg-accent/10 p-3 text-center">
            <div className="flex flex-wrap justify-center gap-1 text-3xl">
              {op === "add"
                ? dotsB.map((_, i) => <span key={i}>🍎</span>)
                : dotsB.map((_, i) => <span key={i} className="opacity-30 line-through">🍎</span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {options.map((o) => (
          <button key={o} onClick={() => pick(o)}
            className="h-20 rounded-2xl bg-primary/15 text-3xl font-black text-primary shadow active:scale-95">{o}</button>
        ))}
      </div>

      {feedback && <div className="mt-4"><GentleFeedback message={feedback} /></div>}
    </div>
  );
}
