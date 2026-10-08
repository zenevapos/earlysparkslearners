import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveChild } from '@/lib/store';

export interface Child {
  id: string;
  name: string;
  age: number;
  avatar_id: number;
}

export function useChildren(userId: string | undefined) {
  return useQuery({
    queryKey: ['children', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_profiles')
        .select('id, name, age, avatar_id')
        .order('created_at');
      if (error) throw error;
      return data as Child[];
    },
  });
}

export function useActiveChildData() {
  const { childId } = useActiveChild();
  return useQuery({
    queryKey: ['child', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_profiles')
        .select('id, name, age, avatar_id')
        .eq('id', childId!)
        .maybeSingle();
      if (error) throw error;
      return data as Child | null;
    },
  });
}

export function useGamification(childId: string | null | undefined) {
  return useQuery({
    queryKey: ['gamification', childId],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification')
        .select('*')
        .eq('child_id', childId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}