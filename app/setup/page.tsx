"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Database, Play, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { setupDatabase } from "./actions"

export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAutoSetup = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await setupDatabase()
      if (result.success) {
        setSetupComplete(true)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-12">
          <Database className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Database Setup Required</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Welcome to StudyMaster! Before you can start creating study sets and uploading files, we need to set up your
            database tables.
          </p>
        </div>

        <div className="mb-8">
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Play className="w-5 h-5" />
                Automated Setup (Recommended)
              </CardTitle>
              <CardDescription className="text-orange-700">
                Click the button below to automatically run both setup scripts with a single click.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {setupComplete ? (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Setup Complete!</h3>
                  <p className="text-green-700 mb-4">Your database has been successfully configured.</p>
                  <Link href="/dashboard">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center">
                  <Button
                    onClick={handleAutoSetup}
                    disabled={isLoading}
                    size="lg"
                    className="bg-orange-600 hover:bg-orange-700 text-white mb-4"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting up database...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Automated Setup
                      </>
                    )}
                  </Button>
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                      <p className="text-red-800 text-sm">{error}</p>
                      <p className="text-red-600 text-xs mt-2">If automated setup fails, try the manual steps below.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Manual Setup (Alternative)</h2>
          <p className="text-gray-600">If automated setup doesn't work, follow these manual steps:</p>
        </div>

        <div className="grid gap-6 mb-8">
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-600" />
                Step 1: Create Database Schema
              </CardTitle>
              <CardDescription>
                This script creates all the necessary tables for your study platform including profiles, study sets,
                flashcards, uploaded files, quiz attempts, and reminders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <code className="text-sm font-mono text-gray-800">scripts/001_create_database_schema.sql</code>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Click the "Run Script" button in the v0 interface to execute this script.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-green-600" />
                Step 2: Create Profile Trigger
              </CardTitle>
              <CardDescription>
                This script sets up automatic profile creation when users sign up through authentication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <code className="text-sm font-mono text-gray-800">scripts/002_create_profile_trigger.sql</code>
              </div>
              <p className="text-sm text-gray-600 mb-4">Run this script after completing Step 1.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              What happens after setup?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">✨ Create Study Sets</h4>
                <p className="text-blue-100 text-sm">
                  Build custom flashcard sets with titles, descriptions, and privacy settings.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📁 Upload Files</h4>
                <p className="text-blue-100 text-sm">
                  Upload text files and automatically generate flashcards using AI.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🧠 Take Quizzes</h4>
                <p className="text-blue-100 text-sm">
                  Test your knowledge with multiple choice, true/false, and fill-in-the-blank questions.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🔔 Set Reminders</h4>
                <p className="text-blue-100 text-sm">Schedule study sessions with customizable reminder frequencies.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Link href="/dashboard">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-sm text-gray-500 mt-2">Return to dashboard after running the setup scripts</p>
        </div>
      </div>
    </div>
  )
}
