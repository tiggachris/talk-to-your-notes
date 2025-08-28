"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Star, Trash2, MessageCircle, BookOpen, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface StarredMessage {
  id: string
  message_content: string
  question: string
  study_set_title: string
  study_set_id: string
  created_at: string
}

export default function StarredNotesPage() {
  const [starredMessages, setStarredMessages] = useState<StarredMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadStarredMessages()
  }, [])

  const loadStarredMessages = async () => {
    try {
      const starred: StarredMessage[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('starred_')) {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          starred.push({
            id: key.replace('starred_', ''),
            message_content: data.messageContent,
            question: data.question,
            study_set_title: data.studySetTitle,
            study_set_id: data.studySetId,
            created_at: data.timestamp
          })
        }
      }
      // Sort by timestamp, newest first
      starred.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setStarredMessages(starred)
    } catch (error) {
      console.error('Error loading starred messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteStarredMessage = async (messageId: string) => {
    setDeletingId(messageId)
    try {
      const starredKey = `starred_${messageId}`
      localStorage.removeItem(starredKey)
      setStarredMessages(prev => prev.filter(msg => msg.id !== messageId))
    } catch (error) {
      console.error('Error deleting starred message:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your starred notes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2">
            <div className="bg-yellow-500 p-2 rounded-lg">
              <Star className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Starred Notes</h1>
              <p className="text-gray-600">Your saved AI responses and insights</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {starredMessages.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Starred Notes Yet</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start conversations with AI in your study sets and star helpful responses to save them here.
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/dashboard">
                <BookOpen className="h-4 w-4 mr-2" />
                Go to Study Sets
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                {starredMessages.length} starred {starredMessages.length === 1 ? 'note' : 'notes'}
              </p>
            </div>
            
            <div className="grid gap-6">
              {starredMessages.map((message) => (
                <Card key={message.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {message.study_set_title}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {formatDate(message.created_at)}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg font-medium text-gray-900 mb-1">
                          Question
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-700">
                          {message.question}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Link href={`/dashboard/study-sets/${message.study_set_id}/chat`}>
                            <MessageCircle className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteStarredMessage(message.id)}
                          disabled={deletingId === message.id}
                        >
                          {deletingId === message.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium text-gray-700">AI Response</span>
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {message.message_content}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}