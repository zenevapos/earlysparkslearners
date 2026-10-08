import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useRef, useState } from "react";
import { useActiveChildData } from "@/lib/hooks/useChildren";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { awardStars, logSession } from "@/lib/rewards";
import { StarBurst, GentleFeedback } from "@/components/Reward";
import { Eraser, Check, RotateCcw, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { sfx, speakLetterSound, speakLetterName, speakNumber, speakSymbol } from "@/lib/sound";

export const Route = createFileRoute("/handwriting")({
  head: () => ({
    meta: [
      { title: "Handwriting Practice for Kids | LittleSparks" },
      { name: "description", content: "Trace lowercase and uppercase letters plus numbers with sound-guided handwriting practice for young children." },
      { property: "og:title", content: "Handwriting Practice for Kids | LittleSparks" },
      { property: "og:description", content: "Trace letters and numbers with instant sound feedback and gentle accuracy checking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AppShell><Handwriting /></AppShell>,
});

const UPPER = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
const LOWER = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
const DIGITS = ["0","1","2","3","4","5","6","7","8","9"];
// Nelson-Thong-style precursive font: 'Edu NSW ACT Foundation' is a free Google Font
// designed for early-years handwriting practice and matches the Nelson Thong look closely.
const HAND_FONT = "'Edu NSW ACT Foundation', 'Nunito', system-ui, sans-serif";

const SIZE = 400;
const PASS_COVERAGE = 0.6;   // how much of the guide letter must be traced
const PASS_PRECISION = 0.55; // how much of the child's ink must sit on the guide

function Handwriting() {
  const { data: child } = useActiveChildData();
  const qc = useQueryClient();
  const [caseMode, setCaseMode] = useState<"upper" | "lower" | "digits">("lower");
  const LETTERS = caseMode === "upper" ? UPPER : caseMode === "digits" ? DIGITS : LOWER;
  const [idx, setIdx] = useState(0);
  const letter = LETTERS[Math.min(idx, LETTERS.length - 1)];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inkPoints = useRef(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [stars, setStars] = useState(0);
  const [checking, setChecking] = useState(false);
  const [passed, setPassed] = useState(false);
  const startedAt = useRef(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (idx > LETTERS.length - 1) setIdx(0); }, [caseMode, LETTERS.length, idx]);

  // Reset board for each new character and say its sound
  useEffect(() => {
    startedAt.current = Date.now();
    clearCanvas();
    inkPoints.current = 0;
    setFeedback(null);
    setPassed(false);
    speakSymbol(letter);
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, [letter]);

  function clearCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }

  function getPos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  }

  // Render guide letter
  useEffect(() => {
    const g = guideRef.current;
    if (!g) return;
    const ctx = g.getContext("2d")!;
    ctx.clearRect(0, 0, g.width, g.height);
    ctx.fillStyle = "rgba(124, 92, 191, 0.22)";
    ctx.font = `600 ${g.height * 0.75}px ${HAND_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, g.width / 2, g.height / 2);
  }, [letter]);

  function start(e: React.PointerEvent) {
    if (passed) return;
    drawing.current = true;
    sfx.tap();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    inkPoints.current += 1;
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#7C5CBF";
    ctx.lineTo(x, y);
    ctx.stroke();
    inkPoints.current += 1;
  }
  function end() { drawing.current = false; }

  /**
   * Compare the traced strokes with the guide letter shape.
   * coverage  = share of the guide letter that was actually traced
   * precision = share of the child's ink that landed on the guide letter
   * A straight line scores very low coverage, so it no longer counts as correct.
   */
  function grade() {
    const g = guideRef.current, c = canvasRef.current;
    if (!g || !c) return { coverage: 0, precision: 0, accuracy: 0 };
    const gd = g.getContext("2d")!.getImageData(0, 0, SIZE, SIZE).data;
    const cd = c.getContext("2d")!.getImageData(0, 0, SIZE, SIZE).data;

    const step = 4;
    const cols = Math.floor(SIZE / step);
    const guideCells: boolean[] = new Array(cols * cols).fill(false);
    const inkCells: boolean[] = new Array(cols * cols).fill(false);

    for (let cy = 0; cy < cols; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        let gHit = false, iHit = false;
        for (let y = cy * step; y < (cy + 1) * step; y++) {
          for (let x = cx * step; x < (cx + 1) * step; x++) {
            const a = (y * SIZE + x) * 4 + 3;
            if (gd[a] > 20) gHit = true;
            if (cd[a] > 20) iHit = true;
          }
        }
        guideCells[cy * cols + cx] = gHit;
        inkCells[cy * cols + cx] = iHit;
      }
    }

    const R = 3; // tolerance in cells (~12px) so wobbly little hands still pass
    const near = (grid: boolean[], cx: number, cy: number) => {
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= cols) continue;
          if (grid[ny * cols + nx]) return true;
        }
      }
      return false;
    };

    let guideTotal = 0, guideCovered = 0, inkTotal = 0, inkOnGuide = 0;
    for (let cy = 0; cy < cols; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const i = cy * cols + cx;
        if (guideCells[i]) { guideTotal++; if (near(inkCells, cx, cy)) guideCovered++; }
        if (inkCells[i]) { inkTotal++; if (near(guideCells, cx, cy)) inkOnGuide++; }
      }
    }

    const coverage = guideTotal === 0 ? 0 : guideCovered / guideTotal;
    const precision = inkTotal === 0 ? 0 : inkOnGuide / inkTotal;
    const accuracy = Math.round(coverage * 60 + precision * 40);
    return { coverage, precision, accuracy };
  }

  async function finish() {
    if (checking || passed) return;
    if (inkPoints.current < 8) {
      setFeedback("Trace the letter on the board first ✏️");
      sfx.tap();
      return;
    }
    setChecking(true);
    const { coverage, precision, accuracy } = grade();
    const ok = coverage >= PASS_COVERAGE && precision >= PASS_PRECISION;

    if (child) {
      const duration = Math.round((Date.now() - startedAt.current) / 1000);
      await supabase.from("handwriting_attempts").insert({
        child_id: child.id,
        letter_or_word: letter,
        accuracy_score: accuracy,
        attempt_number: 1,
      });
      await logSession(child.id, "handwriting", duration);
    }

    if (!ok) {
      sfx.wrong();
      const why = coverage < PASS_COVERAGE
        ? `Let's trace all of "${letter}" — follow the whole shape 💛`
        : `Try to stay on the "${letter}" lines 💛`;
      setFeedback(why);
      setChecking(false);
      return;
    }

    const earned = accuracy >= 85 ? 3 : accuracy >= 70 ? 2 : 1;
    if (child) {
      await awardStars(child.id, earned);
      qc.invalidateQueries({ queryKey: ["gamification"] });
    }
    sfx.correct();
    setStars(earned);
    setBurst((b) => b + 1);
    setPassed(true);
    setFeedback(accuracy >= 85 ? "Beautiful writing! ⭐⭐⭐" : "Well done! Next letter…");
    setChecking(false);

    // Auto-advance to the next character
    advanceTimer.current = setTimeout(() => {
      setIdx((i) => (i + 1 >= LETTERS.length ? 0 : i + 1));
    }, 1600);
  }

  function resetBoard() {
    clearCanvas();
    inkPoints.current = 0;
    setFeedback(null);
  }

  const label = caseMode === "digits" ? "Number" : "Letter";

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-black">Handwriting ✏️</h1>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
          {label} {Math.min(idx + 1, LETTERS.length)}/{LETTERS.length}
        </span>
      </header>

      {/* Case toggle */}
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1 text-xs font-bold">
        {([
          ["lower", "abc"],
          ["upper", "ABC"],
          ["digits", "123"],
        ] as const).map(([m, text]) => (
          <button key={m} onClick={() => { setCaseMode(m); setIdx(0); }}
            className={`h-11 rounded-xl transition-colors ${caseMode === m ? "bg-card text-primary shadow" : "text-muted-foreground"}`}>
            {text}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          className="grid h-12 w-12 place-items-center rounded-2xl bg-card shadow"
          disabled={idx === 0}
        >
          <ChevronLeft />
        </button>
        <button onClick={() => speakSymbol(letter)}
          className="flex items-center gap-2 rounded-full bg-accent/15 px-3 py-2 text-sm font-bold text-accent">
          <Volume2 className="h-4 w-4" /> Hear "{letter}"
        </button>
        <button
          onClick={() => setIdx((i) => Math.min(LETTERS.length - 1, i + 1))}
          className="grid h-12 w-12 place-items-center rounded-2xl bg-card shadow"
        >
          <ChevronRight />
        </button>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-3xl border-4 border-primary/20 bg-white shadow-xl">
        <canvas ref={guideRef} width={SIZE} height={SIZE} className="absolute inset-0 h-full w-full" />
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>

      <button onClick={() => (caseMode === "digits" ? speakNumber(letter) : speakLetterName(letter))}
        className="mx-auto mt-3 block text-xs font-bold text-muted-foreground underline">
        {caseMode === "digits" ? "Hear the number" : "Hear the letter name"}
      </button>

      {feedback && <div className="mt-4"><GentleFeedback message={feedback} /></div>}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={resetBoard}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-muted font-bold"
        >
          <RotateCcw className="h-5 w-5" /> Redo
        </button>
        <button
          onClick={() => clearCanvas()}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-muted font-bold"
        >
          <Eraser className="h-5 w-5" /> Erase
        </button>
        <button
          onClick={finish}
          disabled={checking || passed}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-success font-black text-success-foreground shadow-lg disabled:opacity-60"
        >
          <Check className="h-5 w-5" /> {checking ? "…" : "Done"}
        </button>
      </div>

      <StarBurst key={burst} show={burst > 0} count={stars} />
    </div>
  );
}
