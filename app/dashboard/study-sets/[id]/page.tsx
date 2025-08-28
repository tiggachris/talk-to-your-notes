"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, BookOpen, Edit, Play, Users, Clock, Plus, MessageCircle, Trash2, Loader2 } from "lucide-react"

interface StudySetWithFlashcards {
  id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
  flashcards: Array<{
    id: string
    front_text: string
    back_text: string
    created_at: string
  }>
}

export default function StudySetDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  
  const [studySet, setStudySet] = useState<StudySetWithFlashcards | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadStudySet()
  }, [id])

  const loadStudySet = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push("/auth/login")
        return
      }

      // Get study set with flashcards
      const { data: studySetData, error: studySetError } = await supabase
        .from("study_sets")
        .select(`
          id,
          title,
          description,
          is_public,
          created_at,
          flashcards (
            id,
            front_text,
            back_text,
            created_at
          )
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      if (studySetError || !studySetData) {
        router.push("/dashboard")
        return
      }

      setStudySet(studySetData as StudySetWithFlashcards)
    } catch (error) {
      console.error("Error loading study set:", error)
      router.push("/dashboard")
    } finally {
      setIsLoading(false)
    }
  }

  const deleteFlashcard = async (flashcardId: string) => {
    if (!studySet) return
    
    setDeletingCardId(flashcardId)
    try {
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("id", flashcardId)

      if (error) throw error

      // Update local state
      setStudySet({
        ...studySet,
        flashcards: studySet.flashcards.filter(card => card.id !== flashcardId)
      })
    } catch (error) {
      console.error("Error deleting flashcard:", error)
      alert("Failed to delete flashcard. Please try again.")
    } finally {
      setDeletingCardId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading study set...</p>
        </div>
      </div>
    )
  }

  if (!studySet) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TalkToYourNotes</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/study-sets/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href={`/dashboard/study-sets/${id}/study`}>
                <Play className="h-4 w-4 mr-2" />
                Study
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Study Set Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{studySet.title}</h1>
              {studySet.description && <p className="text-gray-600 text-lg">{studySet.description}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <BookOpen className="h-4 w-4 mr-1" />
              {studySet.flashcards.length} cards
            </span>
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Created {new Date(studySet.created_at).toLocaleDateString()}
            </span>
            <Badge variant={studySet.is_public ? "default" : "secondary"}>
              {studySet.is_public ? (
                <>
                  <Users className="h-3 w-3 mr-1" />
                  Public
                </>
              ) : (
                "Private"
              )}
            </Badge>
          </div>
        </div>

        {/* Flashcards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Flashcards</h2>
            <Button asChild variant="outline">
              <Link href={`/dashboard/study-sets/${id}/edit`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Cards
              </Link>
            </Button>
          </div>

          {studySet.flashcards.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No flashcards yet</h3>
                <p className="text-gray-600 mb-4">Add some flashcards to start studying this set</p>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href={`/dashboard/study-sets/${id}/edit`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Card
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {studySet.flashcards.map((flashcard, index) => (
                <Card key={flashcard.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        Card {index + 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFlashcard(flashcard.id)}
                        disabled={deletingCardId === flashcard.id}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingCardId === flashcard.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">FRONT</p>
                        <p className="text-sm text-gray-900 line-clamp-3">{flashcard.front_text}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">BACK</p>
                        <p className="text-sm text-gray-600 line-clamp-3">{flashcard.back_text}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Study Actions */}
        {studySet.flashcards.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">Study Flashcards</CardTitle>
                <CardDescription>Review cards one by one</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link href={`/dashboard/study-sets/${id}/study`}>Start Studying</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">Take Quiz</CardTitle>
                <CardDescription>Test your knowledge</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href={`/dashboard/study-sets/${id}/quiz`}>Start Quiz</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">Practice Mode</CardTitle>
                <CardDescription>Focused practice session</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href={`/dashboard/study-sets/${id}/practice`}>Start Practice</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <MessageCircle className="h-4 w-4 mr-2 text-purple-600" />
                  Clear Your Doubts
                </CardTitle>
                <CardDescription>Ask AI about your study topics</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  variant="outline"
                  className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                >
                  <Link href={`/dashboard/study-sets/${id}/chat`}>Start Chat</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
