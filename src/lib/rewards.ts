import { supabase } from '@/integrations/supabase/client';

/**
 * Award stars and update the 72-hour-forgiving streak.
 * Streak rule: if last_active_date is within 72 hours, continue streak; otherwise reset to 1.
 */
export async function awardStars(childId: string, stars: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: current } = await supabase
    .from('gamification')
    .select('total_stars, streak_days, last_active_date')
    .eq('child_id', childId)
    .maybeSingle();

  let newStreak = current?.streak_days ?? 0;
  const last = current?.last_active_date;
  if (!last) {
    newStreak = 1;
  } else {
    const diffMs = Date.now() - new Date(last).getTime();
    const hours = diffMs / 36e5;
    if (last === today) {
      // same day - keep streak
    } else if (hours <= 72) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }
  }

  await supabase
    .from('gamification')
    .update({
      total_stars: (current?.total_stars ?? 0) + stars,
      streak_days: newStreak,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('child_id', childId);
}

export async function logSession(childId: string, module: string, durationSeconds: number) {
  await supabase.from('sessions').insert({
    child_id: childId,
    module,
    duration_seconds: durationSeconds,
  });
}