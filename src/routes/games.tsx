import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { useActiveChildData } from "@/lib/hooks/useChildren";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { awardStars, logSession } from "@/lib/rewards";
import { StarBurst, GentleFeedback } from "@/components/Reward";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { sfx, speakNumber, speakLetterSound, speak } from "@/lib/sound";

export const Route = createFileRoute("/games")({
  head: () => ({ meta: [{ title: "LittleSparks — Games" }] }),
  component: () => <AppShell><Games /></AppShell>,
});

type GameKey = "shapes" | "counting" | "memory" | "letters";

const GAMES: { key: GameKey; emoji: string; name: string; color: string }[] = [
  { key: "shapes", emoji: "🟢", name: "Shape Match", color: "oklch(0.85 0.13 145)" },
  { key: "counting", emoji: "🔢", name: "Count Fun", color: "oklch(0.88 0.13 50)" },
  { key: "memory", emoji: "🧠", name: "Memory", color: "oklch(0.85 0.13 320)" },
  { key: "letters", emoji: "🔤", name: "Letter Hunt", color: "oklch(0.82 0.13 230)" },
];

function Games() {
  const [active, setActive] = useState<GameKey | null>(null);
  if (active) {
    return <GameRunner game={active} onExit={() => setActive(null)} />;
  }
  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <header className="mb-4"><h1 className="text-2xl font-black">Mini Games 🧩</h1></header>
      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((g) => (
          <button key={g.key} onClick={() => setActive(g.key)}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl p-4 shadow-md transition-transform active:scale-95"
            style={{ background: g.color }}>
            <span className="text-6xl">{g.emoji}</span>
            <span className="text-base font-black text-foreground">{g.name}</span>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">Play ▶</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GameRunner({ game, onExit }: { game: GameKey; onExit: () => void }) {
  const { data: child } = useActiveChildData();
  const qc = useQueryClient();
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const startedAt = useMemo(() => Date.now(), []);

  const name = GAMES.find((g) => g.key === game)!.name;
  const TOTAL = 50;

  async function finish(finalScore: number) {
    if (!child) return;
    await supabase.from("game_scores").insert({
      child_id: child.id,
      game_name: game,
      score: finalScore,
      level: 1,
    });
    const stars = finalScore >= TOTAL * 0.8 ? 3 : finalScore >= TOTAL * 0.4 ? 2 : 1;
    sfx.win();
    await awardStars(child.id, stars);
    await logSession(child.id, `game:${game}`, Math.round((Date.now() - startedAt) / 1000));
    qc.invalidateQueries({ queryKey: ["gamification"] });
    setBurst((b) => b + 1);
    setDone(true);
  }

  function correct() {
    sfx.correct();
    setScore((s) => {
      const ns = s + 1;
      setFeedback("Yay! 🎉");
      setTimeout(() => {
        setFeedback(null);
        if (round + 1 >= TOTAL) finish(ns);
        else setRound((r) => r + 1);
      }, 700);
      return ns;
    });
  }
  function wrong() {
    sfx.wrong();
    setFeedback("Almost! Try another 💛");
    setTimeout(() => setFeedback(null), 900);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 pt-10 text-center">
        <p className="text-6xl animate-bounce-in">🎉</p>
        <h2 className="mt-3 text-2xl font-black">Great game!</h2>
        <p className="mt-1 text-muted-foreground">You scored {score} / {TOTAL}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={onExit} className="h-14 rounded-2xl bg-muted font-bold">Back</button>
          <button onClick={() => { setRound(0); setScore(0); setDone(false); }} className="h-14 rounded-2xl bg-primary font-black text-primary-foreground shadow-lg flex items-center justify-center gap-2"><RefreshCw className="h-5 w-5" /> Play again</button>
        </div>
        <StarBurst key={burst} show={burst > 0} count={score >= TOTAL * 0.8 ? 3 : score >= TOTAL * 0.4 ? 2 : 1} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <header className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="grid h-12 w-12 place-items-center rounded-2xl bg-card shadow"><ArrowLeft /></button>
        <h2 className="text-lg font-black">{name}</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{round + 1}/{TOTAL}</span>
      </header>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-success transition-all" style={{ width: `${(round / TOTAL) * 100}%` }} />
      </div>

      {game === "shapes" && <ShapeMatch key={round} round={round} onCorrect={correct} onWrong={wrong} />}
      {game === "counting" && <CountFun key={round} round={round} onCorrect={correct} onWrong={wrong} />}
      {game === "memory" && <MemoryGame key={round} round={round} onCorrect={correct} onWrong={wrong} />}
      {game === "letters" && <LetterHunt key={round} round={round} onCorrect={correct} onWrong={wrong} />}

      {feedback && <div className="mt-4"><GentleFeedback message={feedback} /></div>}
    </div>
  );
}

type RoundProps = { round: number; onCorrect: () => void; onWrong: () => void };

// ---- Shape Match ----
const SHAPES = [
  { e: "⭐", n: "star" }, { e: "🔺", n: "triangle" }, { e: "🟦", n: "square" },
  { e: "⚪", n: "circle" }, { e: "❤️", n: "heart" }, { e: "🟩", n: "green square" },
  { e: "🔶", n: "diamond" }, { e: "🌙", n: "moon" }, { e: "🟣", n: "purple circle" },
  { e: "🔷", n: "blue diamond" }, { e: "🟨", n: "yellow square" }, { e: "➕", n: "cross" },
];
function ShapeMatch({ round, onCorrect, onWrong }: RoundProps) {
  const choices = Math.min(6, 4 + Math.floor(round / 20));
  const target = useMemo(() => SHAPES[Math.floor(Math.random() * SHAPES.length)], []);
  const opts = useMemo(() => {
    const set = new Set<string>([target.e]);
    while (set.size < choices) set.add(SHAPES[Math.floor(Math.random() * SHAPES.length)].e);
    return Array.from(set).sort(() => Math.random() - 0.5);
  }, [target, choices]);
  useEffect(() => { speak(`Find the ${target.n}`); }, [target]);
  return (
    <div>
      <p className="text-center text-base font-bold">Tap the matching shape</p>
      <button onClick={() => speak(target.n)} className="mt-4 grid w-full place-items-center text-7xl active:scale-95">{target.e}</button>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {opts.map((o, i) => (
          <button key={i} onClick={() => { sfx.tap(); o === target.e ? onCorrect() : onWrong(); }}
            className="grid h-24 place-items-center rounded-3xl bg-card text-5xl shadow-md active:scale-95">{o}</button>
        ))}
      </div>
    </div>
  );
}

// ---- Count Fun ----
const COUNT_ITEMS = ["🍎", "🍌", "🐥", "🎈", "🚗", "⭐", "🐞", "🍓"];
function CountFun({ round, onCorrect, onWrong }: RoundProps) {
  const max = round < 15 ? 5 : round < 30 ? 8 : round < 40 ? 12 : 20;
  const item = useMemo(() => COUNT_ITEMS[Math.floor(Math.random() * COUNT_ITEMS.length)], []);
  const n = useMemo(() => 1 + Math.floor(Math.random() * max), [max]);
  const opts = useMemo(() => {
    const set = new Set<number>([n]);
    while (set.size < 4) set.add(1 + Math.floor(Math.random() * Math.max(4, max)));
    return Array.from(set).sort(() => Math.random() - 0.5);
  }, [n, max]);
  useEffect(() => { speak("How many?"); }, [n]);
  return (
    <div>
      <p className="text-center text-base font-bold">How many?</p>
      <div className="mx-auto mt-4 grid w-full max-w-xs grid-cols-5 place-items-center gap-2 rounded-3xl bg-card p-4 text-4xl shadow">
        {Array.from({ length: n }).map((_, i) => (
          <button key={i} onClick={() => speakNumber(i + 1)} className="active:scale-90">{item}</button>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-4 gap-2">
        {opts.map((o) => (
          <button key={o} onClick={() => { speakNumber(o); o === n ? onCorrect() : onWrong(); }}
            className="h-20 rounded-2xl bg-primary/15 text-3xl font-black text-primary shadow active:scale-95">{o}</button>
        ))}
      </div>
    </div>
  );
}

// ---- Memory ----
function MemoryGame({ round, onCorrect, onWrong }: RoundProps) {
  const pool = ["🦊", "🐼", "🐯", "🐰", "🐸", "🦁", "🐨", "🐮", "🐷", "🐵"];
  const len = round < 10 ? 2 : round < 25 ? 3 : round < 40 ? 4 : 5;
  const [seq] = useState(() => Array.from({ length: len }, () => pool[Math.floor(Math.random() * pool.length)]));
  const [showIdx, setShowIdx] = useState(0);
  const [phase, setPhase] = useState<"show" | "pick">("show");
  const [pickIdx, setPickIdx] = useState(0);

  useEffect(() => {
    if (phase !== "show") return;
    sfx.tap();
    const t = setTimeout(() => {
      if (showIdx + 1 >= seq.length) setPhase("pick");
      else setShowIdx((i) => i + 1);
    }, 900);
    return () => clearTimeout(t);
  }, [showIdx, phase, seq.length]);

  if (phase === "show") {
    return (
      <div>
        <p className="text-center text-base font-bold">Remember the order…</p>
        <div className="mt-8 grid place-items-center text-9xl animate-bounce-in">{seq[showIdx]}</div>
        <p className="mt-4 text-center text-sm text-muted-foreground">{showIdx + 1} / {seq.length}</p>
      </div>
    );
  }
  const options = Array.from(new Set([...seq, ...pool])).slice(0, 6).sort(() => Math.random() - 0.5);
  function pick(e: string) {
    sfx.tap();
    if (e !== seq[pickIdx]) { onWrong(); return; }
    if (pickIdx + 1 >= seq.length) { onCorrect(); return; }
    setPickIdx((i) => i + 1);
  }
  return (
    <div>
      <p className="text-center text-base font-bold">What came {pickIdx === 0 ? "first" : pickIdx === 1 ? "second" : "next"}?</p>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {options.map((o, i) => (
          <button key={i} onClick={() => pick(o)}
            className="grid h-24 place-items-center rounded-3xl bg-card text-5xl shadow-md active:scale-95">{o}</button>
        ))}
      </div>
    </div>
  );
}

// ---- Letter Hunt ----
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function LetterHunt({ round, onCorrect, onWrong }: RoundProps) {
  const lower = round >= 25;
  const pool = useMemo(() => (round < 10 ? ALPHABET.slice(0, 10) : ALPHABET), [round]);
  const target = useMemo(() => pool[Math.floor(Math.random() * pool.length)], [pool]);
  const opts = useMemo(() => {
    const set = new Set<string>([target]);
    while (set.size < 6) set.add(pool[Math.floor(Math.random() * pool.length)]);
    return Array.from(set).sort(() => Math.random() - 0.5);
  }, [target, pool]);
  const show = (l: string) => (lower ? l.toLowerCase() : l);
  useEffect(() => { speakLetterSound(target); }, [target]);
  return (
    <div>
      <p className="text-center text-base font-bold">Find the letter that says…</p>
      <button onClick={() => speakLetterSound(target)}
        className="mt-4 grid w-full place-items-center text-7xl font-black text-primary active:scale-95">{show(target)}</button>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {opts.map((o, i) => (
          <button key={i} onClick={() => { speakLetterSound(o); o === target ? onCorrect() : onWrong(); }}
            className="h-24 rounded-3xl bg-card text-4xl font-black shadow-md active:scale-95">{show(o)}</button>
        ))}
      </div>
    </div>
  );
}