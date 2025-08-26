"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Clock, Target, TrendingUp } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"

interface QuizAttempt {
  id: string
  score: number
  total_questions: number
  time_taken: number
  completed_at: string
  study_set: {
    id: string
    title: string
  }
}

export default function QuizzesPage() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    bestScore: 0,
    totalTime: 0,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchQuizAttempts()
  }, [])

  const fetchQuizAttempts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("quiz_attempts")
        .select(`
          *,
          study_sets!quiz_attempts_quiz_id_fkey (
            id,
            title
          )
        `)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })

      if (error) throw error

      const formattedAttempts =
        data?.map((attempt) => ({
          ...attempt,
          study_set: attempt.study_sets,
        })) || []

      setAttempts(formattedAttempts)

      // Calculate stats
      if (formattedAttempts.length > 0) {
        const totalScore = formattedAttempts.reduce((sum, attempt) => sum + attempt.score, 0)
        const totalQuestions = formattedAttempts.reduce((sum, attempt) => sum + attempt.total_questions, 0)
        const bestScore = Math.max(
          ...formattedAttempts.map((attempt) => Math.round((attempt.score / attempt.total_questions) * 100)),
        )
        const totalTime = formattedAttempts.reduce((sum, attempt) => sum + (attempt.time_taken || 0), 0)

        setStats({
          totalQuizzes: formattedAttempts.length,
          averageScore: Math.round((totalScore / totalQuestions) * 100),
          bestScore,
          totalTime,
        })
      }
    } catch (error) {
      console.error("Error fetching quiz attempts:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz History</h1>
        <p className="text-gray-600">Track your quiz performance and progress</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Best Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.bestScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Time</p>
                <p className="text-2xl font-bold text-gray-900">{formatTime(stats.totalTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Attempts */}
      {attempts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quiz attempts yet</h3>
            <p className="text-gray-600 mb-4">Take your first quiz to see your results here</p>
            <Link href="/dashboard">
              <Button>Browse Study Sets</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Attempts</h2>
          {attempts.map((attempt) => {
            const percentage = Math.round((attempt.score / attempt.total_questions) * 100)
            const isGoodScore = percentage >= 80
            const isOkScore = percentage >= 60

            return (
              <Card key={attempt.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-2 rounded-full ${
                          isGoodScore ? "bg-green-100" : isOkScore ? "bg-yellow-100" : "bg-red-100"
                        }`}
                      >
                        <Trophy
                          className={`h-6 w-6 ${
                            isGoodScore ? "text-green-600" : isOkScore ? "text-yellow-600" : "text-red-600"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{attempt.study_set?.title || "Unknown Study Set"}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{formatDate(attempt.completed_at)}</span>
                          <span>{formatTime(attempt.time_taken || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{percentage}%</div>
                      <div className="text-sm text-gray-600">
                        {attempt.score}/{attempt.total_questions} correct
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
