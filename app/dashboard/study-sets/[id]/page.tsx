import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, BookOpen, Edit, Play, Users, Clock, Plus, MessageCircle } from "lucide-react"

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

export default async function StudySetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  // Get study set with flashcards
  const { data: studySet, error: studySetError } = await supabase
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

  if (studySetError || !studySet) {
    redirect("/dashboard")
  }

  const typedStudySet = studySet as StudySetWithFlashcards

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
              <span className="text-xl font-bold text-gray-900">StudyMaster</span>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{typedStudySet.title}</h1>
              {typedStudySet.description && <p className="text-gray-600 text-lg">{typedStudySet.description}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <BookOpen className="h-4 w-4 mr-1" />
              {typedStudySet.flashcards.length} cards
            </span>
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Created {new Date(typedStudySet.created_at).toLocaleDateString()}
            </span>
            <Badge variant={typedStudySet.is_public ? "default" : "secondary"}>
              {typedStudySet.is_public ? (
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

          {typedStudySet.flashcards.length === 0 ? (
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
              {typedStudySet.flashcards.map((flashcard, index) => (
                <Card key={flashcard.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        Card {index + 1}
                      </Badge>
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
        {typedStudySet.flashcards.length > 0 && (
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
