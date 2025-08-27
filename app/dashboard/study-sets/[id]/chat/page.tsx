"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft, Send, MessageCircle, Sparkles, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useParams } from "next/navigation"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface StudySet {
  id: string
  title: string
  description: string | null
  flashcards: Array<{
    front_text: string
    back_text: string
  }>
}

export default function StudySetChatPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [studySet, setStudySet] = useState<StudySet | null>(null)
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    fetchStudySet()
    // Add welcome message
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hi! I'm here to help you understand your study material better. Ask me anything about the topics in this study set, and I'll provide detailed explanations to clear your doubts!",
        timestamp: new Date(),
      },
    ])
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchStudySet = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

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
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error || !data) {
      router.push("/dashboard")
      return
    }

    setStudySet(data)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const generateAIResponse = async (userMessage: string, context: string) => {
    // Call server-side AI endpoint that uses LLM + optional web search
    const res = await fetch(`/api/ai-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: userMessage, studySetId: id, useWeb: true }),
    })

    if (!res.ok) {
      throw new Error("Failed to get AI response")
    }

    const data = await res.json()
    const sources = Array.isArray(data.sources) && data.sources.length
      ? `\n\nSources:\n${data.sources.map((s: any, i: number) => `${i + 1}. ${s.title} - ${s.url}`).join("\n")}`
      : ""

    return `${data.answer || "I couldn't formulate an answer."}${sources}`
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const context =
        studySet?.flashcards.map((card) => `Q: ${card.front_text}\nA: ${card.back_text}`).join("\n\n") || ""

      const aiResponse = await generateAIResponse(userMessage.content, context)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error generating response:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const generateFlashcardsFromChat = async () => {
    if (!studySet || messages.length < 2) return

    setIsGeneratingFlashcards(true)

    try {
      const supabase = createClient()

      // Extract Q&A pairs from chat conversation
      const chatContent = messages
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n\n")

      // Generate flashcards from chat (simplified version)
      const newFlashcards = []
      const userQuestions = messages.filter((msg) => msg.role === "user")

      for (let i = 0; i < Math.min(userQuestions.length, 3); i++) {
        const question = userQuestions[i]
        const answer = messages.find((msg) => msg.role === "assistant" && msg.timestamp > question.timestamp)

        if (answer) {
          newFlashcards.push({
            study_set_id: studySet.id,
            front_text: question.content,
            back_text: answer.content.substring(0, 200) + (answer.content.length > 200 ? "..." : ""),
          })
        }
      }

      if (newFlashcards.length > 0) {
        const { error } = await supabase.from("flashcards").insert(newFlashcards)

        if (!error) {
          alert(`Successfully generated ${newFlashcards.length} new flashcards from your chat!`)
          router.push(`/dashboard/study-sets/${id}`)
        } else {
          throw error
        }
      } else {
        alert("No suitable Q&A pairs found in the chat to generate flashcards.")
      }
    } catch (error) {
      console.error("Error generating flashcards:", error)
      alert("Failed to generate flashcards. Please try again.")
    } finally {
      setIsGeneratingFlashcards(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/dashboard/study-sets/${id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Study Set
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <div className="bg-purple-600 p-2 rounded-lg">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">Clear Your Doubts</span>
                {studySet && <p className="text-sm text-gray-600">{studySet.title}</p>}
              </div>
            </div>
          </div>
          <Button
            onClick={generateFlashcardsFromChat}
            disabled={isGeneratingFlashcards || messages.length < 3}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGeneratingFlashcards ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Flashcards
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Chat Messages */}
        <Card className="mb-4 h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <MessageCircle className="h-5 w-5 mr-2 text-purple-600" />
              AI Study Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.role === "user" ? "text-blue-100" : "text-gray-500"}`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your study material..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-600">
          <p>Ask questions about your study material and get detailed explanations.</p>
          <p>Generate flashcards from your conversation using the button above!</p>
        </div>
      </main>
    </div>
  )
}
