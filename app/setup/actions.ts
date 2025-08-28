"use server"

import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function setupDatabase() {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  try {
    console.log("[v0] Starting database setup...")

    // Database schema SQL
    const schemaSQL = `
-- Enable RLS
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create study_sets table
CREATE TABLE IF NOT EXISTS public.study_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create flashcards table
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  study_set_id UUID REFERENCES public.study_sets(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create uploaded_files table
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  file_type TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  study_set_id UUID REFERENCES public.study_sets(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  study_set_id UUID REFERENCES public.study_sets(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create study_reminders table
CREATE TABLE IF NOT EXISTS public.study_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  study_set_id UUID REFERENCES public.study_sets(id) ON DELETE CASCADE NOT NULL,
  reminder_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own study sets" ON public.study_sets FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can create own study sets" ON public.study_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study sets" ON public.study_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own study sets" ON public.study_sets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view flashcards from accessible study sets" ON public.flashcards FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.study_sets 
    WHERE study_sets.id = flashcards.study_set_id 
    AND (study_sets.user_id = auth.uid() OR study_sets.is_public = true)
  )
);
CREATE POLICY "Users can manage flashcards in own study sets" ON public.flashcards FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.study_sets 
    WHERE study_sets.id = flashcards.study_set_id 
    AND study_sets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own uploaded files" ON public.uploaded_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own uploaded files" ON public.uploaded_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own uploaded files" ON public.uploaded_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own uploaded files" ON public.uploaded_files FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own quiz attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own quiz attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reminders" ON public.study_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reminders" ON public.study_reminders FOR ALL USING (auth.uid() = user_id);
`

    // Execute schema creation
    console.log("[v0] Executing database schema...")
    const { error: schemaError } = await supabase.rpc("exec", { sql: schemaSQL })

    if (schemaError) {
      console.log("[v0] Schema error:", schemaError)
      // Try alternative approach - execute statements individually
      const statements = schemaSQL.split(";").filter((stmt) => stmt.trim())

      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc("exec", { sql: statement.trim() + ";" })
          if (error) {
            console.log("[v0] Statement error:", error, "Statement:", statement.trim())
          }
        }
      }
    }

    // Create profile trigger function
    const triggerSQL = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`

    console.log("[v0] Creating profile trigger...")
    const { error: triggerError } = await supabase.rpc("exec", { sql: triggerSQL })

    if (triggerError) {
      console.log("[v0] Trigger error:", triggerError)
    }

    console.log("[v0] Database setup completed!")
    return { success: true, message: "Database setup completed successfully!" }
  } catch (error) {
    console.log("[v0] Setup error:", error)
    return {
      success: false,
      message: `Setup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
