-- Create study_reminders table
CREATE TABLE IF NOT EXISTS study_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  study_set_id UUID REFERENCES study_sets(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  reminder_time TIME NOT NULL,
  reminder_days INTEGER[] NOT NULL DEFAULT '{}', -- Array of days (0=Sunday, 1=Monday, etc.)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE study_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_reminders
CREATE POLICY "Users can view their own reminders" ON study_reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders" ON study_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" ON study_reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" ON study_reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_study_reminders_user_id ON study_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_study_reminders_active ON study_reminders(is_active) WHERE is_active = true;
