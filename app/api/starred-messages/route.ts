import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Ensure environment variables are properly loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required Supabase environment variables')
}

// GET - Fetch all starred messages for the user
export async function GET() {
  try {
    console.log('GET /api/starred-messages - Starting request')
    const supabase = await createClient()
    console.log('Supabase client created successfully')
    
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    
    console.log('User auth check:', { user: user?.id, error: userError })
    
    if (userError || !user) {
      console.log('Authentication failed:', userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: starredMessages, error } = await supabase
      .from("starred_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ starredMessages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}

// POST - Star a message
export async function POST(req: Request) {
  try {
    console.log('POST /api/starred-messages - Starting request')
    const { messageContent, question, studySetId, studySetTitle } = await req.json()
    console.log('Request body parsed:', { messageContent: !!messageContent, question: !!question, studySetId, studySetTitle })
    
    if (!messageContent || !question || !studySetId || !studySetTitle) {
      console.log('Missing required fields')
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()
    console.log('Supabase client created for POST')
    
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    
    console.log('POST User auth check:', { user: user?.id, error: userError })
    
    if (userError || !user) {
      console.log('POST Authentication failed:', userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('Attempting to insert starred message using raw SQL')
    // Final workaround: Use raw SQL execution to completely bypass PostgREST
    const { data, error } = await supabase
      .from('starred_messages')
      .insert({
        user_id: user.id,
        study_set_id: studySetId,
        message_content: messageContent,
        question: question,
        study_set_title: studySetTitle
      })
      .select()
      .single()
      .then(result => {
        // If PostgREST fails, try raw SQL as fallback
        if (result.error && result.error.code === 'PGRST205') {
          console.log('PostgREST failed, trying raw SQL fallback')
          return supabase.rpc('exec_sql', {
            query: `
              INSERT INTO starred_messages (id, user_id, study_set_id, message_content, question, study_set_title, created_at)
              VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
              RETURNING *
            `,
            params: [user.id, studySetId, messageContent, question, studySetTitle]
          })
        }
        return result
      })

    console.log('Database operation result:', { data: !!data, error })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Successfully created starred message')
    return NextResponse.json({ starredMessage: data })
  } catch (error: any) {
    console.error('Caught error in POST /api/starred-messages:', error)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}

// DELETE - Unstar a message
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get('id')
    
    if (!messageId) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
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
      .from("starred_messages")
      .delete()
      .eq("id", messageId)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}