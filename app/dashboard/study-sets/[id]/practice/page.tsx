"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Volume2, VolumeX, RotateCcw, Target, CheckCircle, XCircle, Play, Pause } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"

interface Flashcard {
  id: string
  front_text: string
  back_text: string
}

interface PracticeSession {
  total_cards: number
  current_index: number
  correct_count: number
  incorrect_count: number
  difficult_cards: string[]
}

export default function PracticePage() {
  const params = useParams()
  const router = useRouter()
  const studySetId = params.id as string

  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [studySetTitle, setStudySetTitle] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<PracticeSession>({
    total_cards: 0,
    current_index: 0,
    correct_count: 0,
    incorrect_count: 0,
    difficult_cards: [],
  })
  const [isComplete, setIsComplete] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    loadStudySet()
  }, [studySetId])

  const loadStudySet = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: studySet, error } = await supabase
        .from("study_sets")
        .select(`
          title,
          flashcards (
            id,
            front_text,
            back_text
          )
        `)
        .eq("id", studySetId)
        .eq("user_id", user.id)
        .single()

      if (error) throw error

      setStudySetTitle(studySet.title)
      const shuffledCards = [...(studySet.flashcards || [])].sort(() => Math.random() - 0.5)
      setFlashcards(shuffledCards)
      setSession((prev) => ({
        ...prev,
        total_cards: shuffledCards.length,
      }))

      // Auto-read first question
      if (shuffledCards.length > 0 && audioEnabled) {
        setTimeout(() => speakText(shuffledCards[0].front_text), 500)
      }
    } catch (error) {
      console.error("Error loading study set:", error)
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const speakText = async (text: string) => {
    if (!audioEnabled || !("speechSynthesis" in window)) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.8
    utterance.pitch = 1
    utterance.volume = 0.8

    utterance.onstart = () => setIsPlaying(true)
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
    }
  }

  const checkAnswer = () => {
    const currentCard = flashcards[currentIndex]
    const correct = userAnswer.toLowerCase().trim() === currentCard.back_text.toLowerCase().trim()

    setIsCorrect(correct)
    setShowResult(true)

    if (correct) {
      setSession((prev) => ({
        ...prev,
        correct_count: prev.correct_count + 1,
      }))
    } else {
      setSession((prev) => ({
        ...prev,
        incorrect_count: prev.incorrect_count + 1,
        difficult_cards: [...prev.difficult_cards, currentCard.id],
      }))
    }

    // Read the correct answer
    if (audioEnabled) {
      setTimeout(() => speakText(currentCard.back_text), 300)
    }
  }

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setUserAnswer("")
      setShowResult(false)
      setSession((prev) => ({
        ...prev,
        current_index: currentIndex + 1,
      }))

      // Auto-read next question
      if (audioEnabled) {
        setTimeout(() => speakText(flashcards[currentIndex + 1].front_text), 300)
      }
    } else {
      setIsComplete(true)
    }
  }

  const restartSession = () => {
    const shuffledCards = [...flashcards].sort(() => Math.random() - 0.5)
    setFlashcards(shuffledCards)
    setCurrentIndex(0)
    setUserAnswer("")
    setShowResult(false)
    setSession({
      total_cards: shuffledCards.length,
      current_index: 0,
      correct_count: 0,
      incorrect_count: 0,
      difficult_cards: [],
    })
    setIsComplete(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (flashcards.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">No Flashcards Available</h1>
        <p className="text-gray-600 mb-4">This study set doesn't have any flashcards yet.</p>
        <Link href={`/dashboard/study-sets/${studySetId}`}>
          <Button>Go Back</Button>
        </Link>
      </div>
    )
  }

  const currentCard = flashcards[currentIndex]
  const progress = ((currentIndex + 1) / flashcards.length) * 100

  if (isComplete) {
    const accuracy = session.total_cards > 0 ? Math.round((session.correct_count / session.total_cards) * 100) : 0

    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Target className="h-16 w-16 text-blue-500" />
            </div>
            <CardTitle className="text-2xl">Practice Session Complete!</CardTitle>
            <CardDescription>You've completed practicing {studySetTitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{session.total_cards}</div>
                <div className="text-sm text-gray-600">Total Cards</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{session.correct_count}</div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{session.incorrect_count}</div>
                <div className="text-sm text-gray-600">Incorrect</div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">{accuracy}%</div>
              <div className="text-gray-600">Accuracy</div>
            </div>

            {session.difficult_cards.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">Cards to Review</h3>
                <p className="text-sm text-yellow-700">
                  You got {session.difficult_cards.length} cards wrong. Consider reviewing these cards again.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={restartSession} className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" />
                Practice Again
              </Button>
              <Link href={`/dashboard/study-sets/${studySetId}`} className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  Back to Study Set
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/study-sets/${studySetId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Practice: {studySetTitle}</h1>
            <p className="text-gray-600">
              Card {currentIndex + 1} of {flashcards.length}
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => setAudioEnabled(!audioEnabled)}>
          {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>Progress: {Math.round(progress)}%</span>
          <span>
            Correct: {session.correct_count} | Incorrect: {session.incorrect_count}
          </span>
        </div>
      </div>

      {/* Practice Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Question</CardTitle>
            {audioEnabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isPlaying) {
                    stopSpeech()
                  } else {
                    speakText(currentCard.front_text)
                  }
                }}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <p className="text-xl leading-relaxed text-balance">{currentCard.front_text}</p>
          </div>

          <div className="space-y-4">
            <Input
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer here..."
              disabled={showResult}
              className="text-lg p-4"
              onKeyPress={(e) => {
                if (e.key === "Enter" && userAnswer.trim() && !showResult) {
                  checkAnswer()
                }
              }}
            />

            {showResult && (
              <div
                className={`p-4 rounded-lg border ${
                  isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  {isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-medium ${isCorrect ? "text-green-800" : "text-red-800"}`}>
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </span>
                </div>
                {!isCorrect && (
                  <p className="text-sm text-gray-700">
                    <strong>Correct answer:</strong> {currentCard.back_text}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex justify-center">
        {!showResult ? (
          <Button onClick={checkAnswer} disabled={!userAnswer.trim()} className="px-8">
            Check Answer
          </Button>
        ) : (
          <Button onClick={nextCard} className="px-8">
            {currentIndex === flashcards.length - 1 ? "Finish Practice" : "Next Card"}
          </Button>
        )}
      </div>
    </div>
  )
}
