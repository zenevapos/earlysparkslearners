
-- Child profiles
CREATE TABLE public.child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT NOT NULL CHECK (age BETWEEN 1 AND 6),
  avatar_id INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_profiles TO authenticated;
GRANT ALL ON public.child_profiles TO service_role;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage own children" ON public.child_profiles FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents access own sessions" ON public.sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.id = child_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.id = child_id AND c.user_id = auth.uid()));

-- Handwriting attempts
CREATE TABLE public.handwriting_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  letter_or_word TEXT NOT NULL,
  accuracy_score INT NOT NULL,
  attempt_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handwriting_attempts TO authenticated;
GRANT ALL ON public.handwriting_attempts TO service_role;
ALTER TABLE public.handwriting_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents access own handwriting" ON public.handwriting_attempts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.id = child_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.id = child_id AND c.user_id = auth.uid()));

-- Drawing gallery
CREATE TABLE public.drawing_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  image_data_url TEXT NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawing_gallery TO authenticated;
GRANT ALL ON public.drawing_gallery TO service_role;
ALTER TABLE public.drawing_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents access own drawings" ON public.drawing_gallery FOR ALL
  USING (EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.id = child_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.id = child_id AND c.user_id = auth.uid()));

-- Game scores
CREATE TABLE public.game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_scores TO authenticated;
GRANT ALL ON public.game_scores TO service_role;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents access own game scores" ON public.game_scores FOR ALL
  USING (EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.id = child_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.id = child_id AND c.user_id = auth.uid()));

-- Gamification (one row per child)
CREATE TABLE public.gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL UNIQUE REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  total_stars INT NOT NULL DEFAULT 0,
  badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  streak_days INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  sticker_book JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gamification TO authenticated;
GRANT ALL ON public.gamification TO service_role;
ALTER TABLE public.gamification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents access own gamification" ON public.gamification FOR ALL
  USING (EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.id = child_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.id = child_id AND c.user_id = auth.uid()));

-- Auto-create gamification row when a child is added
CREATE OR REPLACE FUNCTION public.create_gamification_for_child()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.gamification (child_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_child_profile_created
AFTER INSERT ON public.child_profiles
FOR EACH ROW EXECUTE FUNCTION public.create_gamification_for_child();
