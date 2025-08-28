-- Create chat_messages table for storing conversation history
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_set_id UUID NOT NULL REFERENCES public.study_sets(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create starred_messages table for storing user's starred AI responses
CREATE TABLE IF NOT EXISTS public.starred_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_set_id UUID NOT NULL REFERENCES public.study_sets(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  question TEXT NOT NULL,
  study_set_title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_messages
CREATE POLICY "chat_messages_select_own" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chat_messages_insert_own" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_messages_update_own" ON public.chat_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "chat_messages_delete_own" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on starred_messages
ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for starred_messages
CREATE POLICY "starred_messages_select_own" ON public.starred_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "starred_messages_insert_own" ON public.starred_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "starred_messages_update_own" ON public.starred_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "starred_messages_delete_own" ON public.starred_messages FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_study_set ON public.chat_messages(user_id, study_set_id, created_at);
CREATE INDEX IF NOT EXISTS idx_starred_messages_user ON public.starred_messages(user_id, created_at DESC);