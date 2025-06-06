import { QdrantClient } from "@qdrant/js-client-rest"
import { CohereEmbeddings } from "@langchain/cohere"

const QDRANT_COLLECTION = "rag_chunks"
const QDRANT_VECTOR_SIZE = 1024 // Cohere v3.0 returns 1024-dim vectors

// Initialize Qdrant client
export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
  timeout: 8000,
  checkCompatibility: false,
})

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
    console.log(`Qdrant collection '${QDRANT_COLLECTION}' created`)
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
  const points = chunks.map((chunk, idx) => ({
    id: `${chunk.metadata?.source || "chunk"}-${idx}`,
    vector: embeddings[idx],
    payload: {
      ...chunk.metadata,
      pageContent: chunk.pageContent,
      chunkIndex: idx,
      timestamp: new Date().toISOString(),
    } as Record<string, unknown>,
  }))
  await qdrantClient.upsert(QDRANT_COLLECTION, { points })
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
  const embedder = new CohereEmbeddings({
    apiKey: process.env.COHERE_API_KEY,
    model: "embed-english-v3.0",
  })
  const [queryEmbedding] = await embedder.embedDocuments([query])
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
