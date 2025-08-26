-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Create study_sets table
CREATE TABLE IF NOT EXISTS public.study_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on study_sets
ALTER TABLE public.study_sets ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_sets
CREATE POLICY "study_sets_select_own" ON public.study_sets FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);
CREATE POLICY "study_sets_insert_own" ON public.study_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_sets_update_own" ON public.study_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "study_sets_delete_own" ON public.study_sets FOR DELETE USING (auth.uid() = user_id);

-- Create flashcards table
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_set_id UUID NOT NULL REFERENCES public.study_sets(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on flashcards
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- RLS policies for flashcards (inherit permissions from study_sets)
CREATE POLICY "flashcards_select_via_study_set" ON public.flashcards FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.study_sets 
    WHERE study_sets.id = flashcards.study_set_id 
    AND (study_sets.user_id = auth.uid() OR study_sets.is_public = TRUE)
  )
);

CREATE POLICY "flashcards_insert_via_study_set" ON public.flashcards FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.study_sets 
    WHERE study_sets.id = flashcards.study_set_id 
    AND study_sets.user_id = auth.uid()
  )
);

CREATE POLICY "flashcards_update_via_study_set" ON public.flashcards FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.study_sets 
    WHERE study_sets.id = flashcards.study_set_id 
    AND study_sets.user_id = auth.uid()
  )
);

CREATE POLICY "flashcards_delete_via_study_set" ON public.flashcards FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.study_sets 
    WHERE study_sets.id = flashcards.study_set_id 
    AND study_sets.user_id = auth.uid()
  )
);

-- Create uploaded_files table for file management
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on uploaded_files
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for uploaded_files
CREATE POLICY "uploaded_files_select_own" ON public.uploaded_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uploaded_files_insert_own" ON public.uploaded_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uploaded_files_update_own" ON public.uploaded_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "uploaded_files_delete_own" ON public.uploaded_files FOR DELETE USING (auth.uid() = user_id);

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_set_id UUID NOT NULL REFERENCES public.study_sets(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  time_taken INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on quiz_attempts
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_attempts
CREATE POLICY "quiz_attempts_select_own" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quiz_attempts_insert_own" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quiz_attempts_update_own" ON public.quiz_attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "quiz_attempts_delete_own" ON public.quiz_attempts FOR DELETE USING (auth.uid() = user_id);

-- Create study_reminders table
CREATE TABLE IF NOT EXISTS public.study_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_set_id UUID NOT NULL REFERENCES public.study_sets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  frequency TEXT CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly')) DEFAULT 'once',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on study_reminders
ALTER TABLE public.study_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_reminders
CREATE POLICY "study_reminders_select_own" ON public.study_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "study_reminders_insert_own" ON public.study_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "study_reminders_update_own" ON public.study_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "study_reminders_delete_own" ON public.study_reminders FOR DELETE USING (auth.uid() = user_id);
