import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useRef, useState } from "react";
import { useActiveChildData } from "@/lib/hooks/useChildren";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { awardStars, logSession } from "@/lib/rewards";
import { StarBurst } from "@/components/Reward";
import { Eraser, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/drawing")({
  head: () => ({ meta: [{ title: "LittleSparks — Drawing" }] }),
  component: () => <AppShell><Drawing /></AppShell>,
});

type Mode = "free" | "guided" | "colour";
const COLOURS = ["#7C5CBF", "#F97316", "#22C55E", "#EF4444", "#3B82F6", "#FBBF24", "#EC4899", "#111827"];
const GUIDED = [
  { name: "Sun", emoji: "☀️" },
  { name: "House", emoji: "🏠" },
  { name: "Flower", emoji: "🌸" },
  { name: "Star", emoji: "⭐" },
];
const COLOUR_TARGETS = [
  { name: "Apple", emoji: "🍎" },
  { name: "Fish", emoji: "🐟" },
  { name: "Balloon", emoji: "🎈" },
  { name: "Cat", emoji: "🐱" },
];

function Drawing() {
  const { data: child } = useActiveChildData();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("free");
  const [color, setColor] = useState(COLOURS[0]);
  const [size, setSize] = useState(10);
  const [guidedIdx, setGuidedIdx] = useState(0);
  const [colourIdx, setColourIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const startedAt = useRef(Date.now());
  const [burst, setBurst] = useState(0);

  useEffect(() => { startedAt.current = Date.now(); clear(); }, [mode, guidedIdx, colourIdx]);

  function clear() {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, c.width, c.height);
    if (mode === "guided") {
      ctx.fillStyle = "rgba(124, 92, 191, 0.15)";
      ctx.font = `${c.height * 0.55}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(GUIDED[guidedIdx].emoji, c.width / 2, c.height / 2);
    } else if (mode === "colour") {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.font = `${c.height * 0.65}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(COLOUR_TARGETS[colourIdx].emoji, c.width / 2, c.height / 2);
    }
  }

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }
  function start(e: React.PointerEvent) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function end() { drawing.current = false; }

  async function save() {
    if (!child) return;
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    const title = mode === "guided" ? GUIDED[guidedIdx].name : mode === "colour" ? COLOUR_TARGETS[colourIdx].name : "Free draw";
    const { error } = await supabase.from("drawing_gallery").insert({
      child_id: child.id,
      title,
      image_data_url: dataUrl,
      activity_type: mode,
    });
    if (error) { toast.error(error.message); return; }
    await logSession(child.id, "drawing", Math.round((Date.now() - startedAt.current) / 1000));
    await awardStars(child.id, 2);
    qc.invalidateQueries({ queryKey: ["gamification"] });
    qc.invalidateQueries({ queryKey: ["gallery"] });
    setBurst((b) => b + 1);
    toast.success("Saved to your gallery! 🎨");
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <header className="mb-3"><h1 className="text-2xl font-black">Drawing 🎨</h1></header>

      <div className="mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1 text-sm font-bold">
        {(["free", "guided", "colour"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`h-11 rounded-xl transition-colors ${mode === m ? "bg-card text-primary shadow" : "text-muted-foreground"}`}
          >
            {m === "free" ? "Free" : m === "guided" ? "Guided" : "Colour"}
          </button>
        ))}
      </div>

      {mode === "guided" && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
          {GUIDED.map((g, i) => (
            <button key={g.name} onClick={() => setGuidedIdx(i)}
              className={`flex shrink-0 flex-col items-center rounded-2xl p-2 ${guidedIdx === i ? "bg-primary text-primary-foreground" : "bg-card"}`}>
              <span className="text-2xl">{g.emoji}</span>
              <span className="text-xs font-bold">{g.name}</span>
            </button>
          ))}
        </div>
      )}
      {mode === "colour" && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
          {COLOUR_TARGETS.map((g, i) => (
            <button key={g.name} onClick={() => setColourIdx(i)}
              className={`flex shrink-0 flex-col items-center rounded-2xl p-2 ${colourIdx === i ? "bg-primary text-primary-foreground" : "bg-card"}`}>
              <span className="text-2xl">{g.emoji}</span>
              <span className="text-xs font-bold">{g.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="relative aspect-square w-full overflow-hidden rounded-3xl border-4 border-primary/20 bg-white shadow-xl">
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          className="h-full w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>

      {/* Colour palette */}
      <div className="mt-3 flex flex-wrap gap-2">
        {COLOURS.map((c) => (
          <button key={c} onClick={() => setColor(c)}
            className={`h-12 w-12 rounded-full shadow transition-transform ${color === c ? "ring-4 ring-foreground scale-110" : ""}`}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs font-bold">Brush</span>
        <input type="range" min={3} max={30} value={size} onChange={(e) => setSize(Number(e.target.value))} className="flex-1 accent-primary" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={clear} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-muted font-bold">
          <RotateCcw className="h-5 w-5" /> New
        </button>
        <button onClick={() => { setColor("#FFFFFF"); }} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-muted font-bold">
          <Eraser className="h-5 w-5" /> Eraser
        </button>
        <button onClick={save} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary font-black text-primary-foreground shadow-lg">
          <Save className="h-5 w-5" /> Save
        </button>
      </div>

      <StarBurst key={burst} show={burst > 0} count={2} />
    </div>
  );
}