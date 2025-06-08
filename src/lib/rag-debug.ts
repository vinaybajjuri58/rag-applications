import { qdrantClient, QDRANT_COLLECTION, EMBEDDING_MODEL } from "./rag"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

/**
 * Debug function to inspect stored chunks
 */
export async function debugStoredChunks(limit = 10): Promise<void> {
  try {
    console.log(
      `[DEBUG] Inspecting stored chunks in collection: ${QDRANT_COLLECTION}`
    )

    // Get collection info
    const collectionInfo = await qdrantClient.getCollection(QDRANT_COLLECTION)
    console.log("[DEBUG] Collection info:", {
      pointsCount: collectionInfo.points_count,
      vectorsCount: collectionInfo.vectors_count,
      status: collectionInfo.status,
    })

    // Get some sample points
    const scrollResult = await qdrantClient.scroll(QDRANT_COLLECTION, {
      limit,
      with_payload: true,
      with_vector: false,
    })

    console.log(`[DEBUG] Sample chunks (${scrollResult.points.length}):`)
    scrollResult.points.forEach((point, idx) => {
      console.log(`\n--- Chunk ${idx + 1} ---`)
      console.log("ID:", point.id)
      console.log("URL:", point.payload?.url)
      console.log("Title:", point.payload?.title)
      console.log(
        "Content preview:",
        (point.payload?.pageContent as string)?.slice(0, 200) + "..."
      )
      console.log("Word count:", point.payload?.wordCount)
      console.log("Chunk index:", point.payload?.chunkIndex)
    })
  } catch (error) {
    console.error("[DEBUG] Error inspecting chunks:", error)
  }
}

/**
 * Debug function to test search with different queries
 */
export async function debugSearch(queries: string[]): Promise<void> {
  for (const query of queries) {
    console.log(`\n[DEBUG] Testing query: "${query}"`)

    try {
      // Generate embedding for the query
      const embeddingResponse = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: query,
      })
      const queryEmbedding = embeddingResponse.data[0].embedding

      console.log("[DEBUG] Query embedding generated successfully")

      // Search with different thresholds
      const thresholds = [0.1, 0.3, 0.5, 0.7]

      for (const threshold of thresholds) {
        const results = await qdrantClient.search(QDRANT_COLLECTION, {
          vector: queryEmbedding,
          limit: 5,
          with_payload: true,
          score_threshold: threshold,
        })

        console.log(`[DEBUG] Threshold ${threshold}: ${results.length} results`)
        if (results.length > 0) {
          console.log(
            `[DEBUG] Best match (score: ${results[0].score}):`,
            (results[0].payload?.pageContent as string)?.slice(0, 150) + "..."
          )
        }
      }
    } catch (error) {
      console.error(`[DEBUG] Error testing query "${query}":`, error)
    }
  }
}

/**
 * Validate collection configuration and status
 */
export async function validateCollection(): Promise<void> {
  try {
    const collectionInfo = await qdrantClient.getCollection(QDRANT_COLLECTION)

    console.log("[RAG] Collection validation:", {
      name: QDRANT_COLLECTION,
      pointsCount: collectionInfo.points_count,
      vectorsCount: collectionInfo.vectors_count,
      status: collectionInfo.status,
      vectorSize: collectionInfo.config?.params?.vectors?.size,
    })

    if (collectionInfo.points_count === 0) {
      throw new Error("Collection is empty - no points stored")
    }

    if (collectionInfo.config?.params?.vectors?.size !== 1536) {
      throw new Error(
        `Vector size mismatch: expected 1536, got ${collectionInfo.config?.params?.vectors?.size}`
      )
    }
  } catch (error) {
    console.error("[RAG] Collection validation failed:", error)
    throw error
  }
}

/**
 * Create a test script to debug search functionality
 */
export async function testSupabasePricingSearch(): Promise<void> {
  console.log("=== Testing Supabase Pricing Search ===")

  // 1. Check what's stored
  await debugStoredChunks(10)

  // 2. Test various pricing-related queries
  const testQueries = [
    "What are the pricing options available",
    "pricing options",
    "pricing plans",
    "supabase pricing",
    "cost",
    "price",
    "subscription",
    "free tier",
    "paid plan",
  ]

  await debugSearch(testQueries)
}
