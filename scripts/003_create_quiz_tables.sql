-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  study_set_id UUID REFERENCES study_sets(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('multiple_choice', 'true_false', 'fill_blank', 'mixed')),
  total_questions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank')),
  question TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  options JSONB, -- For multiple choice options
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  time_taken INTEGER, -- in seconds
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_answers table
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE NOT NULL,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes
CREATE POLICY "Users can view their own quizzes" ON quizzes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for quiz_questions
CREATE POLICY "Users can view questions from their quizzes" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_questions.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create questions for their quizzes" ON quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_questions.quiz_id 
      AND quizzes.user_id = auth.uid()
    )
  );

-- RLS Policies for quiz_attempts
CREATE POLICY "Users can view their own quiz attempts" ON quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quiz_answers
CREATE POLICY "Users can view their own quiz answers" ON quiz_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts 
      WHERE quiz_attempts.id = quiz_answers.attempt_id 
      AND quiz_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own quiz answers" ON quiz_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_attempts 
      WHERE quiz_attempts.id = quiz_answers.attempt_id 
      AND quiz_attempts.user_id = auth.uid()
    )
  );
