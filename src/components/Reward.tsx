import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

/** Floating +N stars animation */
export function StarBurst({ count = 1, show, onDone }: { count?: number; show: boolean; onDone?: () => void }) {
  const [visible, setVisible] = useState(show);
  useEffect(() => {
    setVisible(show);
    if (show) {
      const t = setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [show, onDone]);
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center">
      <div className="animate-float-up flex items-center gap-1 rounded-full bg-warning/95 px-5 py-3 text-2xl font-black text-white shadow-2xl">
        <Star className="h-7 w-7 fill-white" /> +{count}
      </div>
    </div>
  );
}

/** Gentle "try again" feedback - no negative consequences */
export function GentleFeedback({ message }: { message: string }) {
  return (
    <div className="rounded-3xl bg-sky/30 px-4 py-3 text-center text-sm font-bold text-foreground animate-bounce-in">
      {message}
    </div>
  );
}