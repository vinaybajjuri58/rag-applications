import { QdrantClient } from "@qdrant/js-client-rest"
import OpenAI from "openai"
import crypto from "crypto"

export const QDRANT_COLLECTION = "rag_chunks"
const QDRANT_VECTOR_SIZE = 1536 // OpenAI embedding size
const BATCH_SIZE = 100
const MAX_CONTENT_LENGTH = 4000

// Initialize Qdrant client
export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
  timeout: 8000,
  checkCompatibility: false,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

function chunkId(url: string, chunkIndex: number): string {
  return crypto
    .createHash("sha256")
    .update(`${url}:${chunkIndex}`)
    .digest("hex")
}

// Type for Qdrant error objects
type QdrantError = {
  status?: number
  response?: { status?: number }
  data?: unknown
}

/**
 * Initialize the Qdrant collection for RAG chunks if it doesn't exist.
 */
export async function initializeRagCollection() {
  const collections = await qdrantClient.getCollections()
  const exists = collections.collections.some(
    (c: { name: string }) => c.name === QDRANT_COLLECTION
  )
  if (!exists) {
    await qdrantClient.createCollection(QDRANT_COLLECTION, {
      vectors: {
        size: QDRANT_VECTOR_SIZE,
        distance: "Cosine",
      },
    })
  }
}

/**
 * Ensure the Qdrant collection exists, creating it if missing.
 */
export async function ensureQdrantCollectionExists() {
  try {
    await qdrantClient.getCollection(QDRANT_COLLECTION)
    // Collection exists
  } catch (err) {
    const hasStatus = typeof err === "object" && err !== null && "status" in err
    const hasResponse =
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      typeof (err as QdrantError).response === "object" &&
      (err as QdrantError).response !== null
    const response = hasResponse ? (err as QdrantError).response : undefined
    const responseStatus =
      response && typeof response.status === "number"
        ? response.status
        : undefined
    if (
      (hasStatus && (err as QdrantError).status === 404) ||
      (hasResponse && responseStatus === 404)
    ) {
      await qdrantClient.createCollection(QDRANT_COLLECTION, {
        vectors: {
          size: QDRANT_VECTOR_SIZE,
          distance: "Cosine",
        },
      })
    } else {
      throw err
    }
  }
}

/**
 * Upsert (insert/update) chunk embeddings and metadata into Qdrant.
 * @param chunks - Array of chunked documents with pageContent and metadata
 * @param embeddings - Array of embedding vectors (same order as chunks)
 */
export async function upsertChunksToQdrant(
  chunks: Array<{ pageContent: string; metadata: Record<string, unknown> }>,
  embeddings: number[][]
) {
  await initializeRagCollection()
  const points = chunks.map((chunk, idx) => {
    const { ...metadataWithoutLoc } = chunk.metadata || {}
    const url = (chunk.metadata?.source as string) || "unknown"
    const title = (chunk.metadata?.title as string) || ""
    const id = chunkId(url, idx)
    return {
      id,
      vector: embeddings[idx],
      payload: {
        ...metadataWithoutLoc,
        url,
        title,
        pageContent: chunk.pageContent.slice(0, MAX_CONTENT_LENGTH),
        chunkIndex: idx,
        timestamp: new Date().toISOString(),
      } as Record<string, unknown>,
    }
  })
  // Logging for debugging
  if (points.length > 0) {
    if (!isValidVector(points[0].vector, QDRANT_VECTOR_SIZE)) {
      console.warn("Sample vector contains NaN or non-number values!")
    }
  }
  try {
    for (let i = 0; i < points.length; i += BATCH_SIZE) {
      const batch = points.slice(i, i + BATCH_SIZE)
      await qdrantClient.upsert(QDRANT_COLLECTION, { points: batch })
    }
  } catch (err) {
    if (typeof err === "object" && err !== null && "data" in err) {
      console.error(
        "Qdrant error data:",
        JSON.stringify((err as QdrantError).data, null, 2)
      )
    }
    if (typeof err === "object" && err !== null && "response" in err) {
      console.error(
        "Qdrant error response:",
        JSON.stringify((err as QdrantError).response, null, 2)
      )
    }
    throw err
  }
}

/**
 * Search Qdrant for similar chunks given a query string.
 * @param query - The query string to embed and search
 * @param limit - Max number of results
 * @returns Array of matching payloads and scores
 */
export async function searchChunksInQdrant(
  query: string,
  limit = 5
): Promise<Array<{ score: number; payload?: Record<string, unknown> | null }>> {
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  })
  const queryEmbedding = embeddingResponse.data[0].embedding
  const results = await qdrantClient.search(QDRANT_COLLECTION, {
    vector: queryEmbedding,
    limit,
    with_payload: true,
  })
  return results.map(
    (r: { score: number; payload?: Record<string, unknown> | null }) => ({
      score: r.score,
      payload: r.payload,
    })
  )
}

function isValidVector(vec: unknown, expectedLength: number): vec is number[] {
  return (
    Array.isArray(vec) &&
    vec.length === expectedLength &&
    vec.every((v) => typeof v === "number")
  )
}
