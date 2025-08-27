import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Optional: use Tavily for web search if TAVILY_API_KEY is set
async function webSearch(query: string) {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        include_answer: true,
        max_results: 5,
        include_images: false,
        include_domains: undefined,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch (e) {
    return null
  }
}

function isGibberish(text: string) {
  if (!text) return true
  const t = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
  // Detect raw PDF markers or binary-ish content
  const pdfMarkers = /%PDF|\bxref\b|\bobj\b|\bendobj\b|\btrailer\b|\bstartxref\b|\bstream\b|\bendstream\b/i
  if (pdfMarkers.test(t)) return true
  // Ratio of printable ASCII
  const printable = t.match(/[ -~\s]/g)?.length || 0
  const ratio = printable / t.length
  if (t.length > 80 && ratio < 0.85) return true
  return false
}

function sanitizeText(text: string, maxLen = 800) {
  if (!text) return ""
  let t = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
  t = t.replace(/\s+/g, " ").trim()
  if (t.length > maxLen) t = t.slice(0, maxLen) + "…"
  return t
}

function makeStudyContext(pairs: { q: string; a: string }[]) {
  if (!pairs.length) return ""
  const chunks = pairs.map((p) => `Q: ${sanitizeText(p.q, 300)}\nA: ${sanitizeText(p.a, 700)}`)
  // Cap total context length to avoid overly large prompts
  let total = 0
  const limited: string[] = []
  for (const c of chunks) {
    if (total + c.length > 8000) break
    limited.push(c)
    total += c.length
  }
  return limited.join("\n\n")
}

function fallbackAnswer(question: string, pairs: { q: string; a: string }[]) {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ")
  const query = new Set(normalize(question).split(/\s+/).filter(Boolean))
  const scored = pairs
    .map((p) => {
      const words = new Set(normalize(`${p.q} ${p.a}`).split(/\s+/).filter(Boolean))
      let overlap = 0
      query.forEach((t) => {
        if (words.has(t)) overlap += 1
      })
      const bonus = normalize(p.q).includes(normalize(question)) ? 2 : 0
      return { ...p, score: overlap + bonus }
    })
    .sort((a, b) => b.score - a.score)

  const top = scored.slice(0, 3).filter((s) => s.score > 0)
  if (!top.length) return "I couldn't find this topic in your study set. Try rephrasing your question or add relevant flashcards."
  if (top.length === 1) return top[0].a
  return `Here’s what your study set says about this topic:\n\n${top.map((t, i) => `${i + 1}. ${t.a}`).join("\n\n")}`
}

export async function POST(req: Request) {
  try {
    const { question, studySetId, useWeb = true } = await req.json()
    if (!question || !studySetId) {
      return NextResponse.json({ error: "Missing question or studySetId" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Load study set flashcards for this user
    const { data, error } = await supabase
      .from("study_sets")
      .select(
        `id, title, flashcards ( front_text, back_text )`
      )
      .eq("id", studySetId)
      .eq("user_id", user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Study set not found" }, { status: 404 })
    }

    let pairs: { q: string; a: string }[] = (data.flashcards || [])
      .map((c: any) => ({ q: c.front_text || "", a: c.back_text || "" }))
      .filter((p) => !isGibberish(p.q) && !isGibberish(p.a))
      .map((p) => ({ q: sanitizeText(p.q), a: sanitizeText(p.a, 1000) }))

    // Limit number of pairs to keep prompts manageable
    if (pairs.length > 200) pairs = pairs.slice(0, 200)

    const studyContext = makeStudyContext(pairs)

    // If OpenAI API key is available, use LLM; otherwise fallback to simple retrieval
    const openaiKey = process.env.OPENAI_API_KEY

    let webData: any = null
    if (useWeb) {
      webData = await webSearch(question)
    }

    if (!openaiKey) {
      // Fallback answer purely from study set
      const answer = fallbackAnswer(question, pairs)
      return NextResponse.json({ answer, sources: webData?.results?.map((r: any) => ({ title: r.title, url: r.url })) || [] })
    }

    const webSection = webData?.results
      ? webData.results
          .slice(0, 5)
          .map((r: any, i: number) => `Source ${i + 1}: ${r.title}\n${r.url}\n${(r.content || r.snippet || "").slice(0, 400)}...`)
          .join("\n\n")
      : ""

    const system = [
      "You are an expert study assistant.",
      "Answer the user's question clearly and concisely.",
      "First use the provided Study Set context; if insufficient, use the Web Sources if present.",
      "Cite sources inline with [n] and include a short 'Sources' list with URLs at the end when web sources are used.",
      "If the answer is not found, say you don't know and suggest how to refine the question.",
    ].join(" ")

    const userPrompt = [
      `Question: ${question}`,
      studyContext ? `\n\nStudy Set Context:\n${studyContext}` : "",
      webSection ? `\n\nWeb Sources:\n${webSection}` : "",
      "\n\nInstructions: Use the study context first. When using web info, cite with [1], [2], etc., and list sources at the end.",
    ].join("")

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    })

    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json({ answer: fallbackAnswer(question, pairs), note: "LLM error", details: text }, { status: 200 })
    }

    const dataJson = await resp.json()
    const answer = dataJson?.choices?.[0]?.message?.content || fallbackAnswer(question, pairs)

    return NextResponse.json({
      answer,
      sources: webData?.results?.map((r: any) => ({ title: r.title, url: r.url })) || [],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 })
  }
}
