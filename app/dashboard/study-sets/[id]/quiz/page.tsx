"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Clock, Trophy, RotateCcw } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface QuizQuestion {
  id: string
  question: string
  correct_answer: string
  question_type: "multiple_choice" | "true_false" | "fill_blank"
  options?: string[]
}

interface QuizAttempt {
  score: number
  total_questions: number
  time_taken: number
}

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const studySetId = params.id as string

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [studySetTitle, setStudySetTitle] = useState("")
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    generateQuiz()
  }, [studySetId])

  const generateQuiz = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get study set info
      const { data: studySet } = await supabase.from("study_sets").select("title").eq("id", studySetId).single()

      if (studySet) {
        setStudySetTitle(studySet.title)
      }

      // Get flashcards from the study set
      const { data: flashcards } = await supabase.from("flashcards").select("*").eq("study_set_id", studySetId)

      if (!flashcards || flashcards.length === 0) {
        alert("No flashcards found in this study set")
        return
      }

      // Generate quiz questions from flashcards
      const quizQuestions: QuizQuestion[] = flashcards.slice(0, 10).map((card, index) => {
        const questionTypes: ("multiple_choice" | "true_false" | "fill_blank")[] = [
          "multiple_choice",
          "true_false",
          "fill_blank",
        ]
        const questionType = questionTypes[index % 3]

        let question = ""
        let options: string[] = []

        switch (questionType) {
          case "multiple_choice":
            question = card.front
            options = [
              card.back,
              generateWrongAnswer(card.back),
              generateWrongAnswer(card.back),
              generateWrongAnswer(card.back),
            ].sort(() => Math.random() - 0.5)
            break
          case "true_false":
            question = `True or False: ${card.front} - ${card.back}`
            options = ["True", "False"]
            break
          case "fill_blank":
            question = `Fill in the blank: ${card.front}`
            break
        }

        return {
          id: card.id,
          question,
          correct_answer: questionType === "true_false" ? "True" : card.back,
          question_type: questionType,
          options: questionType !== "fill_blank" ? options : undefined,
        }
      })

      setQuestions(quizQuestions)
      setUserAnswers(new Array(quizQuestions.length).fill(""))
      setQuizStartTime(new Date())

      // Get last attempt
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(1)

      if (attempts && attempts.length > 0) {
        setLastAttempt(attempts[0])
      }
    } catch (error) {
      console.error("Error generating quiz:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateWrongAnswer = (correctAnswer: string): string => {
    const wrongAnswers = [
      "Alternative option",
      "Different answer",
      "Another choice",
      "Wrong option",
      "Incorrect answer",
    ]
    return wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)]
  }

  const handleAnswerChange = (answer: string) => {
    const newAnswers = [...userAnswers]
    newAnswers[currentQuestionIndex] = answer
    setUserAnswers(newAnswers)
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      finishQuiz()
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const finishQuiz = async () => {
    if (!quizStartTime) return

    const endTime = new Date()
    const timeTaken = Math.floor((endTime.getTime() - quizStartTime.getTime()) / 1000)

    // Calculate score
    let score = 0
    questions.forEach((question, index) => {
      if (userAnswers[index].toLowerCase().trim() === question.correct_answer.toLowerCase().trim()) {
        score++
      }
    })

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Save quiz attempt
      await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        quiz_id: studySetId, // Using study set ID as quiz ID for simplicity
        score,
        total_questions: questions.length,
        time_taken: timeTaken,
      })

      setLastAttempt({ score, total_questions: questions.length, time_taken: timeTaken })
      setShowResults(true)
    } catch (error) {
      console.error("Error saving quiz attempt:", error)
      setShowResults(true)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestionIndex(0)
    setUserAnswers(new Array(questions.length).fill(""))
    setShowResults(false)
    setQuizStartTime(new Date())
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">No Questions Available</h1>
        <p className="text-gray-600 mb-4">This study set doesn't have enough flashcards to generate a quiz.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  if (showResults) {
    const score = lastAttempt?.score || 0
    const total = lastAttempt?.total_questions || questions.length
    const percentage = Math.round((score / total) * 100)

    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Trophy className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
            <CardDescription>Here are your results for {studySetTitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">{percentage}%</div>
              <div className="text-gray-600">
                {score} out of {total} questions correct
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Time taken:
                </span>
                <span>
                  {Math.floor((lastAttempt?.time_taken || 0) / 60)}m {(lastAttempt?.time_taken || 0) % 60}s
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={restartQuiz} className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => router.back()} className="flex-1">
                Back to Study Set
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Quiz: {studySetTitle}</h1>
          <span className="text-sm text-gray-600">
            {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Question {currentQuestionIndex + 1}</CardTitle>
          <CardDescription className="text-base">{currentQuestion.question}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion.question_type === "multiple_choice" && (
            <RadioGroup value={userAnswers[currentQuestionIndex]} onValueChange={handleAnswerChange}>
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.question_type === "true_false" && (
            <RadioGroup value={userAnswers[currentQuestionIndex]} onValueChange={handleAnswerChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="True" id="true" />
                <Label htmlFor="true" className="cursor-pointer">
                  True
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="False" id="false" />
                <Label htmlFor="false" className="cursor-pointer">
                  False
                </Label>
              </div>
            </RadioGroup>
          )}

          {currentQuestion.question_type === "fill_blank" && (
            <Input
              value={userAnswers[currentQuestionIndex]}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
              className="text-base"
            />
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={previousQuestion} disabled={currentQuestionIndex === 0}>
              Previous
            </Button>
            <Button onClick={nextQuestion} disabled={!userAnswers[currentQuestionIndex]}>
              {currentQuestionIndex === questions.length - 1 ? "Finish Quiz" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
