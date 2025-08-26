"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Upload, Trash2, Calendar } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"

interface UploadedFile {
  id: string
  filename: string
  file_type: string
  file_size: number
  processed: boolean
  created_at: string
}

export default function FilesPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      console.log("[v0] Checking uploaded_files table...")

      const { data, error } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
          console.log("[v0] Database tables not found, showing setup message")
          setFiles([])
          return
        }
        throw error
      }
      setFiles(data || [])
    } catch (error) {
      console.error("Error fetching files:", error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const deleteFile = async (fileId: string) => {
    try {
      const { error } = await supabase.from("uploaded_files").delete().eq("id", fileId)

      if (error) throw error
      setFiles(files.filter((f) => f.id !== fileId))
    } catch (error) {
      console.error("Error deleting file:", error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
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
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Uploaded Files</h1>
          <p className="text-gray-600">Manage your uploaded files and generated study sets</p>
        </div>
        <Link href="/dashboard/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload New File
          </Button>
        </Link>
      </div>

      {files.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded yet</h3>
            <p className="text-gray-600 mb-4">Upload your first file to get started with AI-generated flashcards</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
              <h4 className="font-medium text-yellow-800 mb-2">Database Setup Required</h4>
              <p className="text-sm text-yellow-700 mb-3">
                To use file uploads and study sets, please run the database setup scripts:
              </p>
              <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                <li>
                  Run <code className="bg-yellow-100 px-1 rounded">scripts/001_create_database_schema.sql</code>
                </li>
                <li>
                  Run <code className="bg-yellow-100 px-1 rounded">scripts/002_create_profile_trigger.sql</code>
                </li>
              </ol>
            </div>
            <Link href="/dashboard/upload">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{file.filename}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(file.created_at)}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            file.processed ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {file.processed ? "Processed" : "Processing"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteFile(file.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
