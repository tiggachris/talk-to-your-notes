import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BookOpen, Brain, Zap, Target, Users, TrendingUp } from "lucide-react"

export default function HomePage() {
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
            <Button asChild variant="ghost">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 text-balance">
            Master Any Subject with <span className="text-blue-600">AI-Powered</span> Study Tools
          </h1>
          <p className="text-xl text-gray-600 mb-8 text-pretty">
            Transform your learning with intelligent flashcards, adaptive quizzes, and personalized study plans. Upload
            any document and let AI create the perfect study materials for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 h-12 px-8">
              <Link href="/auth/signup">Start Learning Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 bg-transparent">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need to Excel</h2>
            <p className="text-lg text-gray-600">Powerful features designed to accelerate your learning journey</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Generated Content</h3>
              <p className="text-gray-600">
                Upload any document and get instant flashcards, quizzes, and study guides powered by advanced AI
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Flashcards</h3>
              <p className="text-gray-600">
                Interactive flashcards with text-to-speech, spaced repetition, and progress tracking
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Adaptive Quizzes</h3>
              <p className="text-gray-600">
                Personalized quizzes that adapt to your learning pace and focus on areas that need improvement
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Study Groups</h3>
              <p className="text-gray-600">Share study sets with classmates and collaborate on learning materials</p>
            </div>

            <div className="text-center p-6">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Progress Analytics</h3>
              <p className="text-gray-600">
                Detailed insights into your learning progress with performance metrics and recommendations
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Export & Import</h3>
              <p className="text-gray-600">
                Export your study materials to various formats or import from popular platforms like Quizlet
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-blue-600">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of students who are already studying smarter, not harder.
          </p>
          <Button asChild size="lg" variant="secondary" className="h-12 px-8">
            <Link href="/auth/signup">Get Started Today</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">TalkToYourNotes</span>
          </div>
          <p className="text-gray-400">© 2024 TalkToYourNotes. Empowering learners worldwide.</p>
        </div>
      </footer>
    </div>
  )
}
