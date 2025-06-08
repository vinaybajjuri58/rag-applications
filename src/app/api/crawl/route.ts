import { NextRequest, NextResponse } from "next/server"
import {
  crawlWebsite,
  chunkDocuments,
  generateEmbeddings,
  storeChunks,
  CrawlOptions,
} from "@/lib/rag"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url, crawlOptions, chunkOptions } = body as {
      url: string
      crawlOptions?: CrawlOptions
      chunkOptions?: CrawlOptions
    }

    if (!url?.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid 'url' in request body" },
        { status: 400 }
      )
    }

    // Crawl and chunk the website
    const docs = await crawlWebsite(url, crawlOptions)
    const chunks = await chunkDocuments(docs, chunkOptions)

    // Generate embeddings and store in Qdrant
    const embeddings = await generateEmbeddings(chunks)
    await storeChunks(chunks, embeddings)

    return NextResponse.json({ chunks: chunks.length })
  } catch (error) {
    console.error("[RAG] Error processing website:", error)
    return NextResponse.json(
      {
        error: "Failed to process website. Please try again.",
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
