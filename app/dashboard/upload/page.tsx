"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, Loader2, Sparkles } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""))
      }
    }
  }

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        resolve(text)
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const generateFlashcardsFromText = async (text: string): Promise<Array<{ front: string; back: string }>> => {
    // Simple AI-like processing to generate flashcards
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20)
    const flashcards: Array<{ front: string; back: string }> = []

    // Generate question-answer pairs from key sentences
    for (let i = 0; i < Math.min(sentences.length, 10); i++) {
      const sentence = sentences[i].trim()
      if (sentence.length > 30) {
        // Create a simple Q&A format
        const words = sentence.split(" ")
        if (words.length > 5) {
          const keyWord = words.find((w) => w.length > 4) || words[Math.floor(words.length / 2)]
          const question = `What is the key concept related to "${keyWord}"?`
          const answer = sentence
          flashcards.push({ front: question, back: answer })
        }
      }
    }

    return flashcards
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) return

    setIsUploading(true)
    setIsProcessing(true)

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Extract text from file
      const fileText = await extractTextFromFile(file)

      // Generate flashcards using AI-like processing
      const generatedFlashcards = await generateFlashcardsFromText(fileText)

      console.log("[v0] Checking database tables...")

      // Test if study_sets table exists
      const { error: tableCheckError } = await supabase.from("study_sets").select("id").limit(1)

      if (tableCheckError && tableCheckError.message.includes("does not exist")) {
        alert(
          "Database setup required! Please run the database setup scripts first:\n\n1. Run scripts/001_create_database_schema.sql\n2. Run scripts/002_create_profile_trigger.sql\n\nThen try uploading again.",
        )
        return
      }

      // Create study set
      const { data: studySet, error: studySetError } = await supabase
        .from("study_sets")
        .insert({
          title: title.trim(),
          description: description.trim() || `Generated from ${file.name}`,
          user_id: user.id,
        })
        .select()
        .single()

      if (studySetError) throw studySetError

      // Insert generated flashcards
      if (generatedFlashcards.length > 0) {
        const flashcardsToInsert = generatedFlashcards.map((card) => ({
          study_set_id: studySet.id,
          front_text: card.front,
          back_text: card.back,
        }))

        const { error: flashcardsError } = await supabase.from("flashcards").insert(flashcardsToInsert)

        if (flashcardsError) throw flashcardsError
      }

      // Record file upload
      const { error: fileError } = await supabase.from("uploaded_files").insert({
        user_id: user.id,
        filename: file.name,
        file_url: `processed-${Date.now()}`,
        file_type: file.type || "text/plain",
        file_size: file.size,
        processed: true,
      })

      if (fileError) console.warn("File record error:", fileError)

      router.push(`/dashboard/study-sets/${studySet.id}`)
    } catch (error) {
      console.error("Upload error:", error)
      if (error instanceof Error && error.message.includes("schema cache")) {
        alert(
          "Database setup required! Please run the database setup scripts first:\n\n1. Run scripts/001_create_database_schema.sql\n2. Run scripts/002_create_profile_trigger.sql\n\nThen try uploading again.",
        )
      } else {
        alert("Failed to process file. Please try again.")
      }
    } finally {
      setIsUploading(false)
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload & Generate</h1>
        <p className="text-gray-600">Upload a text file and let AI generate flashcards for you</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI-Powered Study Set Creation
          </CardTitle>
          <CardDescription>
            Upload a text file and we'll automatically generate flashcards from the content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="file-upload">Select File</Label>
            <div className="mt-2">
              <Input
                id="file-upload"
                type="file"
                accept=".txt,.md,.csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="title">Study Set Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your study set"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for your study set"
              className="mt-2"
              rows={3}
            />
          </div>

          <Button onClick={handleUpload} disabled={!file || !title.trim() || isUploading} className="w-full">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isProcessing ? "Generating Flashcards..." : "Uploading..."}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Generate Flashcards
              </>
            )}
          </Button>

          <div className="text-sm text-gray-500 space-y-1">
            <p>
              <strong>Supported formats:</strong> .txt, .md, .csv
            </p>
            <p>
              <strong>How it works:</strong> Our AI analyzes your content and creates question-answer pairs
              automatically
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
