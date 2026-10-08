/**
 * Tiny audio helper for kid-friendly feedback and speech.
 * Uses the Web Speech API (no network, free) and WebAudio for chimes.
 */

let ctx: AudioContext | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function tone(freq: number, durationMs: number, when = 0, type: OscillatorType = "sine", gain = 0.15) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.05);
}

export const sfx = {
  tap: () => tone(660, 80, 0, "triangle", 0.08),
  correct: () => { tone(660, 120, 0); tone(880, 160, 0.1); tone(1320, 200, 0.22); },
  wrong: () => { tone(300, 200, 0, "sawtooth", 0.08); },
  win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 220, i * 0.12, "triangle", 0.12)); },
};

/** Speak text with browser TTS. Tries to pick a child-friendly English voice. */
export function speak(text: string, opts: { rate?: number; pitch?: number; lang?: string } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 0.9;
    u.pitch = opts.pitch ?? 1.2;
    u.lang = opts.lang ?? "en-GB";
    const voices = window.speechSynthesis.getVoices();
    const pref = voices.find(v => /child|kid|female|samantha|google uk english female|karen/i.test(v.name) && v.lang.startsWith("en"))
      || voices.find(v => v.lang === u.lang)
      || voices.find(v => v.lang.startsWith("en"));
    if (pref) u.voice = pref;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

/** Phonetic sound of a single letter (the sound it makes, not its name). */
const LETTER_SOUNDS: Record<string, string> = {
  a: "ah", b: "buh", c: "kuh", d: "duh", e: "eh", f: "ff", g: "guh", h: "huh",
  i: "ih", j: "juh", k: "kuh", l: "lll", m: "mmm", n: "nnn", o: "oh", p: "puh",
  q: "kwuh", r: "rrr", s: "sss", t: "tuh", u: "uh", v: "vvv", w: "wuh",
  x: "ks", y: "yuh", z: "zzz",
};
export function speakLetterSound(letter: string) {
  const k = letter.toLowerCase();
  speak(LETTER_SOUNDS[k] ?? letter, { rate: 0.8, pitch: 1.3 });
}
export function speakLetterName(letter: string) {
  speak(letter.toUpperCase(), { rate: 0.85, pitch: 1.2 });
}

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty",
];

/** Say a number out loud, e.g. tapping "7" says "seven". */
export function speakNumber(n: number | string) {
  const num = typeof n === "number" ? n : parseInt(n, 10);
  if (Number.isNaN(num)) return speak(String(n));
  speak(NUMBER_WORDS[num] ?? String(num), { rate: 0.85, pitch: 1.2 });
}

/** Say any character: digits become number words, letters become letter sounds. */
export function speakSymbol(ch: string) {
  if (/^[0-9]$/.test(ch)) speakNumber(ch);
  else speakLetterSound(ch);
}