import { NextRequest, NextResponse } from "next/server"
import { hydeSearch } from "@/lib/rag-hyde"
import { generateAnswerWithOpenAI } from "@/utils/openai"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, limit } = body as { query: string; limit?: number }

    if (!query?.trim()) {
      return NextResponse.json(
        { error: "Missing or empty 'query' in request body" },
        { status: 400 }
      )
    }

    // Use HyDE to get relevant chunks
    const results = await hydeSearch(query, limit || 5)

    // Build context from results
    const context = results
      .map((r, idx) => `[${idx + 1}] ${r.content}`)
      .join("\n\n")
    const sources = [...new Set(results.map((r) => r.url))]

    let answer = ""
    if (results.length > 0) {
      // Use OpenAI to generate the answer from the context
      answer = await generateAnswerWithOpenAI(context, query)
      console.log("Answer:", answer)
    } else {
      answer =
        "Sorry, I couldn't find relevant information in the indexed website(s)."
    }

    return NextResponse.json({
      answer,
      context,
      sources,
      results,
    })
  } catch (error) {
    console.error("[HyDE] Error in chat-search:", error)
    return NextResponse.json(
      { error: "Failed to process search request" },
      { status: 500 }
    )
  }
}
