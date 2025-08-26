"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Volume2, VolumeX, RotateCcw, Shuffle, CheckCircle, XCircle, Play, Pause } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"

interface Flashcard {
  id: string
  front_text: string
  back_text: string
}

interface StudySession {
  total_cards: number
  current_index: number
  correct_count: number
  incorrect_count: number
  is_shuffled: boolean
}

export default function StudyPage() {
  const params = useParams()
  const router = useRouter()
  const studySetId = params.id as string

  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [studySetTitle, setStudySetTitle] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<StudySession>({
    total_cards: 0,
    current_index: 0,
    correct_count: 0,
    incorrect_count: 0,
    is_shuffled: false,
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

      // Get study set with flashcards
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
      setFlashcards(studySet.flashcards || [])
      setSession((prev) => ({
        ...prev,
        total_cards: studySet.flashcards?.length || 0,
      }))
    } catch (error) {
      console.error("Error loading study set:", error)
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const speakText = async (text: string) => {
    if (!audioEnabled || !("speechSynthesis" in window)) return

    // Cancel any ongoing speech
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

  const flipCard = () => {
    setShowBack(!showBack)
    if (!showBack && audioEnabled) {
      // Read the back text when flipping to back
      speakText(currentCard.back_text)
    }
  }

  const markCorrect = () => {
    setSession((prev) => ({
      ...prev,
      correct_count: prev.correct_count + 1,
    }))
    nextCard()
  }

  const markIncorrect = () => {
    setSession((prev) => ({
      ...prev,
      incorrect_count: prev.incorrect_count + 1,
    }))
    nextCard()
  }

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowBack(false)
      setSession((prev) => ({
        ...prev,
        current_index: currentIndex + 1,
      }))

      // Auto-read the front text of the next card
      if (audioEnabled) {
        setTimeout(() => {
          speakText(flashcards[currentIndex + 1].front_text)
        }, 300)
      }
    } else {
      setIsComplete(true)
    }
  }

  const previousCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setShowBack(false)
      setSession((prev) => ({
        ...prev,
        current_index: currentIndex - 1,
      }))

      if (audioEnabled) {
        setTimeout(() => {
          speakText(flashcards[currentIndex - 1].front_text)
        }, 300)
      }
    }
  }

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5)
    setFlashcards(shuffled)
    setCurrentIndex(0)
    setShowBack(false)
    setSession((prev) => ({
      ...prev,
      is_shuffled: !prev.is_shuffled,
      current_index: 0,
      correct_count: 0,
      incorrect_count: 0,
    }))
    setIsComplete(false)
  }

  const restartSession = () => {
    setCurrentIndex(0)
    setShowBack(false)
    setSession((prev) => ({
      ...prev,
      current_index: 0,
      correct_count: 0,
      incorrect_count: 0,
    }))
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
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Study Session Complete!</CardTitle>
            <CardDescription>Great job studying {studySetTitle}</CardDescription>
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

            <div className="flex gap-4">
              <Button onClick={restartSession} className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" />
                Study Again
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
            <h1 className="text-2xl font-bold">Study: {studySetTitle}</h1>
            <p className="text-gray-600">
              Card {currentIndex + 1} of {flashcards.length}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setAudioEnabled(!audioEnabled)}>
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={shuffleCards}>
            <Shuffle className="h-4 w-4" />
            {session.is_shuffled ? "Unshuffle" : "Shuffle"}
          </Button>
        </div>
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

      {/* Flashcard */}
      <div className="mb-8">
        <Card
          className={`min-h-[400px] cursor-pointer transition-all duration-300 hover:shadow-lg ${
            showBack ? "bg-blue-50 border-blue-200" : "bg-white"
          }`}
          onClick={flipCard}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant={showBack ? "default" : "secondary"}>{showBack ? "Back" : "Front"}</Badge>
              {audioEnabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isPlaying) {
                      stopSpeech()
                    } else {
                      speakText(showBack ? currentCard.back_text : currentCard.front_text)
                    }
                  }}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <p className="text-xl leading-relaxed text-balance">
                {showBack ? currentCard.back_text : currentCard.front_text}
              </p>
              {!showBack && <p className="text-sm text-gray-500 mt-4">Click to reveal answer</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={previousCard} disabled={currentIndex === 0}>
          Previous
        </Button>

        {showBack && (
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={markIncorrect}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Incorrect
            </Button>
            <Button onClick={markCorrect} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="mr-2 h-4 w-4" />
              Correct
            </Button>
          </div>
        )}

        <Button variant="outline" onClick={nextCard} disabled={currentIndex === flashcards.length - 1}>
          Next
        </Button>
      </div>
    </div>
  )
}
