"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Upload, FileText, LogOut, Trophy, Bell, Download, Settings, Star } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/dashboard/study-sets')
    }
    return pathname.startsWith(path)
  }

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUser(user)
      setLoading(false)
    }

    getUser()
  }, [router, supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">TalkToYourNotes</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="mt-8 px-4">
            <div className="space-y-2">
              <Link
                href="/dashboard"
                className={`flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 ${
                  isActive('/dashboard') 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700'
                }`}
              >
                <BookOpen className="mr-3 h-5 w-5" />
                Study Sets
              </Link>
              <Link
                href="/dashboard/upload"
                className={`flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 ${
                  isActive('/dashboard/upload') 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700'
                }`}
              >
                <Upload className="mr-3 h-5 w-5" />
                Upload & Generate
              </Link>
              <Link
                href="/dashboard/files"
                className={`flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 ${
                  isActive('/dashboard/files') 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700'
                }`}
              >
                <FileText className="mr-3 h-5 w-5" />
                Files
              </Link>
              <Link
                href="/dashboard/quizzes"
                className={`flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 ${
                  isActive('/dashboard/quizzes') 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700'
                }`}
              >
                <Trophy className="mr-3 h-5 w-5" />
                Quiz History
              </Link>
              <Link
                href="/dashboard/reminders"
                className={`flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 ${
                  isActive('/dashboard/reminders') 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700'
                }`}
              >
                <Bell className="mr-3 h-5 w-5" />
                Reminders
              </Link>
              <Link
                href="/dashboard/starred-notes"
                className={`flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 ${
                  isActive('/dashboard/starred-notes') 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700'
                }`}
              >
                <Star className="mr-3 h-5 w-5" />
                Starred Notes
              </Link>
              <Link
                href="/dashboard/export"
                className={`flex items-center px-4 py-2 rounded-lg hover:bg-gray-100 ${
                  isActive('/dashboard/export') 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700'
                }`}
              >
                <Download className="mr-3 h-5 w-5" />
                Import & Export
              </Link>
            </div>
          </nav>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
