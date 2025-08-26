"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Bell, Plus, Trash2, Clock, Calendar } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface StudySet {
  id: string
  title: string
}

interface Reminder {
  id: string
  title: string
  reminder_time: string
  reminder_days: number[]
  is_active: boolean
  study_set: StudySet
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
]

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [studySets, setStudySets] = useState<StudySet[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newReminder, setNewReminder] = useState({
    title: "",
    study_set_id: "",
    reminder_time: "09:00",
    reminder_days: [] as number[],
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchData()
    requestNotificationPermission()
  }, [])

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission()
    }
  }

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Fetch reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from("study_reminders")
        .select(`
          *,
          study_sets (
            id,
            title
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (remindersError) throw remindersError

      const formattedReminders =
        remindersData?.map((reminder) => ({
          ...reminder,
          study_set: reminder.study_sets,
        })) || []

      setReminders(formattedReminders)

      // Fetch study sets
      const { data: studySetsData, error: studySetsError } = await supabase
        .from("study_sets")
        .select("id, title")
        .eq("user_id", user.id)
        .order("title")

      if (studySetsError) throw studySetsError
      setStudySets(studySetsData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const createReminder = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from("study_reminders").insert({
        user_id: user.id,
        title: newReminder.title,
        study_set_id: newReminder.study_set_id,
        reminder_time: newReminder.reminder_time,
        reminder_days: newReminder.reminder_days,
      })

      if (error) throw error

      setNewReminder({
        title: "",
        study_set_id: "",
        reminder_time: "09:00",
        reminder_days: [],
      })
      setShowCreateForm(false)
      fetchData()
    } catch (error) {
      console.error("Error creating reminder:", error)
    }
  }

  const toggleReminder = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from("study_reminders").update({ is_active: isActive }).eq("id", id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error("Error updating reminder:", error)
    }
  }

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase.from("study_reminders").delete().eq("id", id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error("Error deleting reminder:", error)
    }
  }

  const toggleDay = (day: number) => {
    setNewReminder((prev) => ({
      ...prev,
      reminder_days: prev.reminder_days.includes(day)
        ? prev.reminder_days.filter((d) => d !== day)
        : [...prev.reminder_days, day].sort(),
    }))
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDays = (days: number[]) => {
    if (days.length === 7) return "Every day"
    if (days.length === 0) return "No days selected"
    return days.map((day) => DAYS_OF_WEEK[day].label).join(", ")
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Reminders</h1>
          <p className="text-gray-600">Set up reminders to stay consistent with your studies</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Reminder
        </Button>
      </div>

      {/* Create Reminder Form */}
      {showCreateForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Reminder</CardTitle>
            <CardDescription>Set up a study reminder for one of your study sets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reminder-title">Reminder Title</Label>
              <Input
                id="reminder-title"
                value={newReminder.title}
                onChange={(e) => setNewReminder((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Morning Spanish Review"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="study-set">Study Set</Label>
              <Select
                value={newReminder.study_set_id}
                onValueChange={(value) => setNewReminder((prev) => ({ ...prev, study_set_id: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a study set" />
                </SelectTrigger>
                <SelectContent>
                  {studySets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reminder-time">Time</Label>
              <Input
                id="reminder-time"
                type="time"
                value={newReminder.reminder_time}
                onChange={(e) => setNewReminder((prev) => ({ ...prev, reminder_time: e.target.value }))}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Days of Week</Label>
              <div className="flex gap-2 mt-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    variant={newReminder.reminder_days.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={createReminder}
                disabled={!newReminder.title || !newReminder.study_set_id || newReminder.reminder_days.length === 0}
              >
                Create Reminder
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders set</h3>
            <p className="text-gray-600 mb-4">Create your first study reminder to stay on track</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Reminder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <Card key={reminder.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${reminder.is_active ? "bg-blue-100" : "bg-gray-100"}`}>
                      <Bell className={`h-6 w-6 ${reminder.is_active ? "text-blue-600" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{reminder.title}</h3>
                      <p className="text-sm text-gray-600">{reminder.study_set?.title}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatTime(reminder.reminder_time)}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDays(reminder.reminder_days)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={reminder.is_active ? "default" : "secondary"}>
                      {reminder.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Switch
                      checked={reminder.is_active}
                      onCheckedChange={(checked) => toggleReminder(reminder.id, checked)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteReminder(reminder.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
