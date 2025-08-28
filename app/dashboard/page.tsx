import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, BookOpen, Clock, Users, MoreVertical, MessageCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface StudySet {
  id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
  flashcard_count: number
}

async function deleteStudySet(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  if (!id) return

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  await supabase.from("study_sets").delete().eq("id", id)
  redirect("/dashboard")
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  // Get user's study sets with flashcard counts
  const { data: studySets, error: studySetsError } = await supabase
    .from("study_sets")
    .select(`
      id,
      title,
      description,
      is_public,
      created_at,
      flashcards(count)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const formattedStudySets: StudySet[] =
    studySets?.map((set) => ({
      ...set,
      flashcard_count: set.flashcards?.[0]?.count || 0,
    })) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">TalkToYourNotes</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/dashboard/create">
                <Plus className="h-4 w-4 mr-2" />
                New Study Set
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Study Sets</h1>
          <p className="text-gray-600">Manage your flashcards and track your learning progress</p>
        </div>

        {formattedStudySets.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Study Sets Yet</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first study set to start learning. You can add flashcards manually or upload documents to
              generate them automatically.
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/dashboard/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Study Set
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {formattedStudySets.map((studySet) => (
              <Card key={studySet.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        <Link href={`/dashboard/study-sets/${studySet.id}`}>{studySet.title}</Link>
                      </CardTitle>
                      {studySet.description && (
                        <CardDescription className="mt-1 line-clamp-2">{studySet.description}</CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/study-sets/${studySet.id}/edit`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/study-sets/${studySet.id}/study`}>Study</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <form action={deleteStudySet}>
                            <input type="hidden" name="id" value={studySet.id} />
                            <button type="submit" className="w-full text-left text-red-600">Delete</button>
                          </form>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-1" />
                        {studySet.flashcard_count} cards
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(studySet.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={studySet.is_public ? "default" : "secondary"} className="text-xs">
                      {studySet.is_public ? (
                        <>
                          <Users className="h-3 w-3 mr-1" />
                          Public
                        </>
                      ) : (
                        "Private"
                      )}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/study-sets/${studySet.id}/study`}>Study</Link>
                      </Button>
                      <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                        <Link href={`/dashboard/study-sets/${studySet.id}/chat`}>
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Clear Your Doubts
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
