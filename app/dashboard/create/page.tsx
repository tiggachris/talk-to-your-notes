"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, BookOpen } from "lucide-react"
import Link from "next/link"

export default function CreateStudySetPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error: tableCheckError } = await supabase.from("study_sets").select("id").limit(1)

      if (tableCheckError && tableCheckError.message.includes("schema cache")) {
        throw new Error(
          "Database setup required. Please run the database setup scripts first:\n1. scripts/001_create_database_schema.sql\n2. scripts/002_create_profile_trigger.sql",
        )
      }

      const { data, error } = await supabase
        .from("study_sets")
        .insert({
          title,
          description: description || null,
          is_public: isPublic,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/dashboard/study-sets/${data.id}/edit`)
    } catch (error: unknown) {
      let errorMessage = "An error occurred"

      if (error instanceof Error) {
        if (error.message.includes("Database setup required")) {
          errorMessage = error.message
        } else if (error.message.includes("schema cache")) {
          errorMessage =
            "Database tables not found. Please run the database setup scripts to create the required tables."
        } else if (error.message.includes("Not authenticated")) {
          errorMessage = "You must be logged in to create study sets."
        } else {
          errorMessage = error.message
        }
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Study Set</h1>
          <p className="text-gray-600">Start building your personalized learning materials</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Study Set Details</CardTitle>
            <CardDescription>
              Give your study set a name and description to help you organize your learning materials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., Biology Chapter 5: Cell Structure"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional: Add a description to help you remember what this study set covers"
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

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800 mb-1">Setup Required</h4>
                      <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading || !title.trim()}
                >
                  {isLoading ? "Creating..." : "Create Study Set"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
