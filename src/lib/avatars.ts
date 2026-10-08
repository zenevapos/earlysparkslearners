export const AVATARS = [
  { id: 0, emoji: '🦊', label: 'Fox', bg: 'oklch(0.85 0.12 50)' },
  { id: 1, emoji: '🐼', label: 'Panda', bg: 'oklch(0.9 0.02 280)' },
  { id: 2, emoji: '🐯', label: 'Tiger', bg: 'oklch(0.88 0.14 80)' },
  { id: 3, emoji: '🐰', label: 'Bunny', bg: 'oklch(0.92 0.06 10)' },
  { id: 4, emoji: '🐸', label: 'Frog', bg: 'oklch(0.88 0.12 145)' },
  { id: 5, emoji: '🦉', label: 'Owl', bg: 'oklch(0.85 0.08 60)' },
  { id: 6, emoji: '🐵', label: 'Monkey', bg: 'oklch(0.85 0.1 70)' },
  { id: 7, emoji: '🦁', label: 'Lion', bg: 'oklch(0.88 0.14 75)' },
];

export function getAvatar(id: number) {
  return AVATARS[id] ?? AVATARS[0];
}