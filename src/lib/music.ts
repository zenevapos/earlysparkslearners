/**
 * Gentle background music for the app, generated with WebAudio (no audio files).
 * A soft, slow lullaby-style loop that sits far behind speech and sound effects.
 */

const STORAGE_KEY = "littlesparks-music-on";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let playing = false;
let step = 0;

// A calm pentatonic melody (C major pentatonic) with a soft bass note per bar.
const MELODY = [
  523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33,
  523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 587.33, 659.25,
];
const BASS = [130.81, 174.61, 196.0, 174.61];
const STEP_MS = 700;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.05; // deliberately quiet, speech stays clear
    master.connect(ctx.destination);
  }
  return ctx;
}

function pluck(freq: number, durSec: number, gain: number, type: OscillatorType) {
  const a = ac();
  if (!a || !master) return;
  const t0 = a.currentTime;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + durSec + 0.05);
}

function tick() {
  if (!playing) return;
  pluck(MELODY[step % MELODY.length], 1.4, 0.5, "sine");
  if (step % 4 === 0) pluck(BASS[(step / 4) % BASS.length], 2.2, 0.35, "triangle");
  step += 1;
  timer = setTimeout(tick, STEP_MS);
}

export function isMusicEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) !== "off";
}

export function setMusicEnabled(on: boolean) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  }
  if (on) startMusic();
  else stopMusic();
}

export function startMusic() {
  if (!isMusicEnabled()) return;
  const a = ac();
  if (!a) return;
  if (a.state !== "running") a.resume().catch(() => {});
  if (playing) return;
  playing = true;
  tick();
}

export function stopMusic() {
  playing = false;
  if (timer) clearTimeout(timer);
  timer = null;
}

export function isMusicPlaying() {
  return playing && !!ctx && ctx.state === "running";
}

/** True once the browser actually lets us make sound. */
export function isAudioUnlocked() {
  return !!ctx && ctx.state === "running";
}
