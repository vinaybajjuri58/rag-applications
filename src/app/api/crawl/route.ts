import { NextRequest, NextResponse } from "next/server"
import {
  crawlWebsite,
  chunkDocuments,
  embedDocumentsWithCohere,
} from "@/lib/crawl"
import { upsertChunksToQdrant } from "@/utils/qdrant"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url, crawlOptions, chunkOptions } = body as {
      url: string
      crawlOptions?: Parameters<typeof crawlWebsite>[1]
      chunkOptions?: Parameters<typeof chunkDocuments>[1]
    }
    if (!url) {
      return NextResponse.json(
        { error: "Missing 'url' in request body" },
        { status: 400 }
      )
    }
    const docs = await crawlWebsite(url, crawlOptions)
    const chunks = await chunkDocuments(docs, chunkOptions)
    const vectors = await embedDocumentsWithCohere(chunks)
    await upsertChunksToQdrant(chunks, vectors)
    return NextResponse.json({
      message: "Chunks embedded and stored in Qdrant.",
      count: chunks.length,
      preview: chunks.slice(0, 3).map((c) => ({
        url: c.metadata?.source || null,
        title: c.metadata?.title || null,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
