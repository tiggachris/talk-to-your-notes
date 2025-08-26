"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, BookOpen, Plus, Trash2, Save } from "lucide-react"
import Link from "next/link"

interface Flashcard {
  id?: string
  front_text: string
  back_text: string
}

interface StudySet {
  id: string
  title: string
  description: string | null
  is_public: boolean
  flashcards: Flashcard[]
}

export default function EditStudySetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [studySetId, setStudySetId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const loadStudySet = async () => {
      const resolvedParams = await params
      setStudySetId(resolvedParams.id)

      const supabase = createClient()

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")

        const { data: studySet, error } = await supabase
          .from("study_sets")
          .select(`
            id,
            title,
            description,
            is_public,
            flashcards (
              id,
              front_text,
              back_text
            )
          `)
          .eq("id", resolvedParams.id)
          .eq("user_id", user.id)
          .single()

        if (error) throw error

        const typedStudySet = studySet as StudySet
        setTitle(typedStudySet.title)
        setDescription(typedStudySet.description || "")
        setIsPublic(typedStudySet.is_public)
        setFlashcards(typedStudySet.flashcards || [])
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Failed to load study set")
      } finally {
        setIsLoading(false)
      }
    }

    loadStudySet()
  }, [params])

  const addFlashcard = () => {
    setFlashcards([...flashcards, { front_text: "", back_text: "" }])
  }

  const updateFlashcard = (index: number, field: "front_text" | "back_text", value: string) => {
    const updated = [...flashcards]
    updated[index][field] = value
    setFlashcards(updated)
  }

  const removeFlashcard = (index: number) => {
    setFlashcards(flashcards.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Update study set
      const { error: studySetError } = await supabase
        .from("study_sets")
        .update({
          title,
          description: description || null,
          is_public: isPublic,
        })
        .eq("id", studySetId)
        .eq("user_id", user.id)

      if (studySetError) throw studySetError

      // Delete existing flashcards
      const { error: deleteError } = await supabase.from("flashcards").delete().eq("study_set_id", studySetId)

      if (deleteError) throw deleteError

      // Insert new flashcards (only non-empty ones)
      const validFlashcards = flashcards.filter((card) => card.front_text.trim() && card.back_text.trim())

      if (validFlashcards.length > 0) {
        const { error: insertError } = await supabase.from("flashcards").insert(
          validFlashcards.map((card) => ({
            study_set_id: studySetId,
            front_text: card.front_text.trim(),
            back_text: card.back_text.trim(),
          })),
        )

        if (insertError) throw insertError
      }

      router.push(`/dashboard/study-sets/${studySetId}`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to save study set")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-blue-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 animate-pulse">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <p className="text-gray-600">Loading study set...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/dashboard/study-sets/${studySetId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Study Set
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">StudyMaster</span>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Study Set</h1>
          <p className="text-gray-600">Update your study set details and manage flashcards</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Study Set Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Study Set Details</CardTitle>
            <CardDescription>Update the basic information for your study set</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="public-toggle" className="text-sm font-medium">
                  Make this study set public
                </Label>
                <p className="text-sm text-gray-500">Other users will be able to find and study from this set</p>
              </div>
              <Switch id="public-toggle" checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </CardContent>
        </Card>

        {/* Flashcards */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Flashcards ({flashcards.length})</CardTitle>
                <CardDescription>Add and edit your flashcards</CardDescription>
              </div>
              <Button onClick={addFlashcard} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {flashcards.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No flashcards yet</h3>
                <p className="text-gray-600 mb-4">Add your first flashcard to get started</p>
                <Button onClick={addFlashcard} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Card
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {flashcards.map((flashcard, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Card {index + 1}</h4>
                        <Button
                          onClick={() => removeFlashcard(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`front-${index}`}>Front</Label>
                        <Textarea
                          id={`front-${index}`}
                          placeholder="Enter the question or term"
                          value={flashcard.front_text}
                          onChange={(e) => updateFlashcard(index, "front_text", e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`back-${index}`}>Back</Label>
                        <Textarea
                          id={`back-${index}`}
                          placeholder="Enter the answer or definition"
                          value={flashcard.back_text}
                          onChange={(e) => updateFlashcard(index, "back_text", e.target.value)}
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
