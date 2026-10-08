import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { Home, Pencil, BookOpen, Calculator, BarChart3, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useActiveChildData, useChildren } from '@/lib/hooks/useChildren';
import { useEffect, useState } from 'react';
import { useActiveChild } from '@/lib/store';
import { isAudioUnlocked, isMusicEnabled, isMusicPlaying, setMusicEnabled, startMusic } from '@/lib/music';

const TABS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/handwriting', icon: Pencil, label: 'Write' },
  { to: '/literacy', icon: BookOpen, label: 'Read' },
  { to: '/maths', icon: Calculator, label: 'Maths' },
  { to: '/parent', icon: BarChart3, label: 'Parent' },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: kids } = useChildren(user?.id);
  const { data: active } = useActiveChildData();
  const { childId, setChildId } = useActiveChild();

  // Auth gate
  useEffect(() => {
    if (!loading && !user) navigate({ to: '/auth' });
  }, [user, loading, navigate]);

  // If no children yet, push to setup
  useEffect(() => {
    if (user && kids && kids.length === 0 && location.pathname !== '/setup') {
      navigate({ to: '/setup' });
    }
  }, [user, kids, location.pathname, navigate]);

  // Auto-select first child if none active
  useEffect(() => {
    if (kids && kids.length > 0 && (!childId || !kids.find(k => k.id === childId))) {
      setChildId(kids[0].id);
    }
  }, [kids, childId, setChildId]);

  const [musicOn, setMusicOn] = useState(true);

  // Try to start the music as soon as the app opens. Phone browsers may block
  // sound until the screen is touched, so we keep retrying on any interaction
  // (and when the app comes back to the foreground) until it actually plays.
  useEffect(() => {
    setMusicOn(isMusicEnabled());

    const kick = () => {
      if (isMusicEnabled()) startMusic();
      if (isAudioUnlocked()) cleanup();
    };

    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'pointerup',
      'touchstart',
      'touchend',
      'click',
      'keydown',
      'scroll',
      'focus',
    ];

    function cleanup() {
      events.forEach((e) => window.removeEventListener(e, kick));
      document.removeEventListener('visibilitychange', kick);
    }

    kick(); // immediate attempt on open
    events.forEach((e) => window.addEventListener(e, kick, { passive: true }));
    document.addEventListener('visibilitychange', kick);

    return cleanup;
  }, []);

  useEffect(() => {
    if (!musicOn) return;
    const t = setInterval(() => {
      if (!isMusicPlaying()) startMusic();
    }, 2000);
    return () => clearInterval(t);
  }, [musicOn]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-24 safe-top">{children}</main>
      <button
        type="button"
        aria-label={musicOn ? 'Turn music off' : 'Turn music on'}
        onClick={() => {
          const next = !musicOn;
          setMusicEnabled(next);
          setMusicOn(next);
        }}
        className="fixed bottom-28 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-lg border border-border text-muted-foreground active:scale-95 transition-transform"
      >
        {musicOn ? <Volume2 className="h-5 w-5 text-primary" /> : <VolumeX className="h-5 w-5 opacity-50" />}
      </button>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md safe-bottom">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2">
          {TABS.map(({ to, icon: Icon, label }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className="group relative flex min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-colors"
              >
                {isActive && (
                  <span className="absolute inset-x-2 top-0 h-1 rounded-full bg-primary animate-bounce-in" />
                )}
                <Icon
                  className={`h-6 w-6 transition-all ${isActive ? 'text-primary scale-110' : 'text-muted-foreground'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-[11px] font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Hidden useful: keep active out of dead-code elimination warnings */}
      <span className="hidden">{active?.name}</span>
    </div>
  );
}