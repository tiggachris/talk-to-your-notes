"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Download, Upload } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface StudySet {
  id: string
  title: string
  description: string | null
  flashcards: Array<{
    front_text: string
    back_text: string
  }>
}

export default function ExportPage() {
  const [studySets, setStudySets] = useState<StudySet[]>([])
  const [selectedStudySet, setSelectedStudySet] = useState("")
  const [exportFormat, setExportFormat] = useState("csv")
  const [importData, setImportData] = useState("")
  const [importFormat, setImportFormat] = useState("csv")
  const [newStudySetTitle, setNewStudySetTitle] = useState("")
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchStudySets()
  }, [])

  const fetchStudySets = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("study_sets")
        .select(`
          id,
          title,
          description,
          flashcards (
            front_text,
            back_text
          )
        `)
        .eq("user_id", user.id)
        .order("title")

      if (error) throw error
      setStudySets(data || [])
    } catch (error) {
      console.error("Error fetching study sets:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportStudySet = () => {
    const studySet = studySets.find((set) => set.id === selectedStudySet)
    if (!studySet) return

    let content = ""
    let filename = ""
    let mimeType = ""

    switch (exportFormat) {
      case "csv":
        content =
          "Front,Back\n" +
          studySet.flashcards
            .map((card) => `"${card.front_text.replace(/"/g, '""')}","${card.back_text.replace(/"/g, '""')}"`)
            .join("\n")
        filename = `${studySet.title.replace(/[^a-z0-9]/gi, "_")}.csv`
        mimeType = "text/csv"
        break

      case "json":
        content = JSON.stringify(
          {
            title: studySet.title,
            description: studySet.description,
            flashcards: studySet.flashcards,
          },
          null,
          2,
        )
        filename = `${studySet.title.replace(/[^a-z0-9]/gi, "_")}.json`
        mimeType = "application/json"
        break

      case "txt":
        content = studySet.flashcards.map((card) => `Q: ${card.front_text}\nA: ${card.back_text}\n`).join("\n")
        filename = `${studySet.title.replace(/[^a-z0-9]/gi, "_")}.txt`
        mimeType = "text/plain"
        break
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importStudySet = async () => {
    if (!importData.trim() || !newStudySetTitle.trim()) return

    setImporting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      let flashcards: Array<{ front_text: string; back_text: string }> = []

      switch (importFormat) {
        case "csv":
          const lines = importData.trim().split("\n")
          const hasHeader = lines[0].toLowerCase().includes("front") || lines[0].toLowerCase().includes("question")
          const dataLines = hasHeader ? lines.slice(1) : lines

          flashcards = dataLines
            .map((line) => {
              const [front, back] = line.split(",").map((cell) =>
                cell
                  .replace(/^"(.*)"$/, "$1")
                  .replace(/""/g, '"')
                  .trim(),
              )
              return { front_text: front || "", back_text: back || "" }
            })
            .filter((card) => card.front_text && card.back_text)
          break

        case "json":
          try {
            const parsed = JSON.parse(importData)
            if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
              flashcards = parsed.flashcards
                .map((card: any) => ({
                  front_text: card.front_text || card.front || "",
                  back_text: card.back_text || card.back || "",
                }))
                .filter((card: any) => card.front_text && card.back_text)
            }
          } catch (e) {
            alert("Invalid JSON format")
            return
          }
          break

        case "txt":
          const blocks = importData.split("\n\n").filter((block) => block.trim())
          flashcards = blocks
            .map((block) => {
              const lines = block.trim().split("\n")
              const front =
                lines
                  .find((line) => line.startsWith("Q:"))
                  ?.substring(2)
                  .trim() || ""
              const back =
                lines
                  .find((line) => line.startsWith("A:"))
                  ?.substring(2)
                  .trim() || ""
              return { front_text: front, back_text: back }
            })
            .filter((card) => card.front_text && card.back_text)
          break
      }

      if (flashcards.length === 0) {
        alert("No valid flashcards found in the import data")
        return
      }

      // Create study set
      const { data: studySet, error: studySetError } = await supabase
        .from("study_sets")
        .insert({
          title: newStudySetTitle,
          description: `Imported ${flashcards.length} flashcards`,
          user_id: user.id,
        })
        .select()
        .single()

      if (studySetError) throw studySetError

      // Insert flashcards
      const { error: flashcardsError } = await supabase.from("flashcards").insert(
        flashcards.map((card) => ({
          study_set_id: studySet.id,
          front_text: card.front_text,
          back_text: card.back_text,
        })),
      )

      if (flashcardsError) throw flashcardsError

      alert(`Successfully imported ${flashcards.length} flashcards!`)
      setImportData("")
      setNewStudySetTitle("")
      fetchStudySets()
    } catch (error) {
      console.error("Error importing study set:", error)
      alert("Failed to import study set. Please check your data format.")
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import & Export</h1>
        <p className="text-gray-600">Export your study sets or import flashcards from external sources</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="mr-2 h-5 w-5" />
              Export Study Set
            </CardTitle>
            <CardDescription>Download your study sets in various formats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="study-set-select">Select Study Set</Label>
              <Select value={selectedStudySet} onValueChange={setSelectedStudySet}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a study set to export" />
                </SelectTrigger>
                <SelectContent>
                  {studySets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.title} ({set.flashcards.length} cards)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="export-format">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                  <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
                  <SelectItem value="txt">TXT (Plain Text)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={exportStudySet} disabled={!selectedStudySet} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Study Set
            </Button>

            <div className="text-sm text-gray-500 space-y-1">
              <p>
                <strong>CSV:</strong> Spreadsheet compatible format
              </p>
              <p>
                <strong>JSON:</strong> Structured data format
              </p>
              <p>
                <strong>TXT:</strong> Simple question-answer format
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Import Study Set
            </CardTitle>
            <CardDescription>Create a new study set from imported data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="new-title">New Study Set Title</Label>
              <Input
                id="new-title"
                value={newStudySetTitle}
                onChange={(e) => setNewStudySetTitle(e.target.value)}
                placeholder="Enter title for imported study set"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="import-format">Import Format</Label>
              <Select value={importFormat} onValueChange={setImportFormat}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV Format</SelectItem>
                  <SelectItem value="json">JSON Format</SelectItem>
                  <SelectItem value="txt">Text Format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="import-data">Import Data</Label>
              <Textarea
                id="import-data"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder={
                  importFormat === "csv"
                    ? "Front,Back\nQuestion 1,Answer 1\nQuestion 2,Answer 2"
                    : importFormat === "json"
                      ? '{"flashcards": [{"front_text": "Question", "back_text": "Answer"}]}'
                      : "Q: Question 1\nA: Answer 1\n\nQ: Question 2\nA: Answer 2"
                }
                rows={8}
                className="mt-2 font-mono text-sm"
              />
            </div>

            <Button
              onClick={importStudySet}
              disabled={!importData.trim() || !newStudySetTitle.trim() || importing}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importing..." : "Import Study Set"}
            </Button>

            <div className="text-sm text-gray-500 space-y-1">
              <p>
                <strong>CSV:</strong> Front,Back format with optional header
              </p>
              <p>
                <strong>JSON:</strong> Structured object with flashcards array
              </p>
              <p>
                <strong>TXT:</strong> Q: question, A: answer format
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
