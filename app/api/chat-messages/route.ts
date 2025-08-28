import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Fetch chat messages for a specific study set
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studySetId = searchParams.get('studySetId')
    
    if (!studySetId) {
      return NextResponse.json({ error: "Study set ID is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user.id)
      .eq("study_set_id", studySetId)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}

// POST - Save a chat message
export async function POST(req: Request) {
  try {
    const { studySetId, role, content } = await req.json()
    
    if (!studySetId || !role || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!['user', 'assistant'].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        study_set_id: studySetId,
        role: role,
        content: content,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}

// DELETE - Clear chat history for a study set
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const studySetId = searchParams.get('studySetId')
    
    if (!studySetId) {
      return NextResponse.json({ error: "Study set ID is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", user.id)
      .eq("study_set_id", studySetId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}