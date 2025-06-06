import { NextRequest, NextResponse } from "next/server"
import { searchChunksInQdrant } from "@/utils/qdrant"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, limit } = body as { query: string; limit?: number }
    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "Missing or empty 'query' in request body" },
        { status: 400 }
      )
    }
    const results = await searchChunksInQdrant(query, limit || 5)
    // Return score, url, and title for each result
    return NextResponse.json({
      results: results.map((r) => ({
        score: r.score,
        url: r.payload?.source || null,
        title: r.payload?.title || null,
        pageContent: r.payload?.pageContent || null,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
