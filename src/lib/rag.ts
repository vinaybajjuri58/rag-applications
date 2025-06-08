import { RecursiveUrlLoader } from "@langchain/community/document_loaders/web/recursive_url"
import { compile } from "html-to-text"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { QdrantClient } from "@qdrant/js-client-rest"
import OpenAI from "openai"
import crypto from "crypto"

// Constants
export const QDRANT_COLLECTION = "supabase_rag"
const QDRANT_VECTOR_SIZE = 1536
const BATCH_SIZE = 25 // Reduced batch size for reliability
const MAX_CONTENT_LENGTH = 8000
export const EMBEDDING_MODEL = "text-embedding-3-small"
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// Initialize clients
export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
  timeout: 30000, // Increased timeout
  checkCompatibility: false,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Types
interface Document {
  pageContent: string
  metadata: Record<string, unknown>
}

export interface SearchResult {
  score: number
  content: string
  url: string
  title: string
  chunkIndex: number
}

interface QdrantPoint {
  id: string
  vector: number[]
  payload: Record<string, unknown>
}

export interface CrawlOptions {
  maxDepth?: number
  excludeDirs?: string[]
  extractorOptions?: Parameters<typeof compile>[0]
  chunkSize?: number
  chunkOverlap?: number
}

// Utility functions
function generateValidId(
  url: string,
  chunkIndex: number,
  content: string
): string {
  const contentHash = crypto
    .createHash("md5")
    .update(content.slice(0, 100))
    .digest("hex")
    .slice(0, 8)

  const baseId = `${url}:${chunkIndex}:${contentHash}`

  // Create a valid UUID-like string
  const hash = crypto.createHash("sha256").update(baseId).digest("hex")
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

function isValidVector(vec: unknown): vec is number[] {
  if (!Array.isArray(vec)) return false
  if (vec.length !== QDRANT_VECTOR_SIZE) return false
  return vec.every((v) => typeof v === "number" && !isNaN(v) && isFinite(v))
}

function sanitizePayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    // Skip undefined, null, or function values
    if (value === undefined || value === null || typeof value === "function") {
      continue
    }

    // Handle different data types
    if (typeof value === "string") {
      sanitized[key] = value.slice(0, MAX_CONTENT_LENGTH) // Truncate long strings
    } else if (typeof value === "number" && isFinite(value)) {
      sanitized[key] = value
    } else if (typeof value === "boolean") {
      sanitized[key] = value
    } else if (Array.isArray(value)) {
      sanitized[key] = value.slice(0, 100) // Limit array size
    } else if (typeof value === "object") {
      sanitized[key] = JSON.stringify(value).slice(0, 1000) // Stringify objects
    } else {
      sanitized[key] = String(value).slice(0, 1000) // Convert to string as fallback
    }
  }

  return sanitized
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Enhanced website crawler with better error handling
 */
export async function crawlWebsite(
  baseUrl: string,
  options: CrawlOptions = {}
): Promise<Document[]> {
  try {
    console.log(`[RAG] Starting crawl of: ${baseUrl}`)

    const compiledConvert = compile({
      wordwrap: 130,
      selectors: [
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" },
      ],
      preserveNewlines: true,
      ...options.extractorOptions,
    })

    const loader = new RecursiveUrlLoader(baseUrl, {
      extractor: compiledConvert,
      maxDepth: options.maxDepth ?? 2,
      excludeDirs: options.excludeDirs ?? [
        "admin",
        "login",
        "api",
        "assets",
        "static",
        ".pdf",
        ".jpg",
        ".png",
        ".gif",
        ".css",
        ".js",
      ],
      timeout: 10000,
    })

    const docs = await loader.load()

    // Filter and clean documents
    const filteredDocs = docs
      .filter((doc) => doc.pageContent.trim().length > 100)
      .map((doc) => ({
        ...doc,
        pageContent: doc.pageContent.trim(),
        metadata: {
          ...doc.metadata,
          crawledAt: new Date().toISOString(),
        },
      }))

    console.log(`[RAG] Crawled documents: ${filteredDocs.length}`)
    return filteredDocs
  } catch (error) {
    console.error("[RAG] Error crawling website:", error)
    throw new Error(`Failed to crawl website: ${error}`)
  }
}

/**
 * Enhanced document chunking
 */
export async function chunkDocuments(
  docs: Document[],
  options: CrawlOptions = {}
): Promise<Document[]> {
  try {
    const chunkSize = options.chunkSize ?? 1000
    const chunkOverlap = options.chunkOverlap ?? 200

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: [
        "\n\n\n",
        "\n\n",
        "\n",
        ". ",
        "! ",
        "? ",
        "; ",
        ", ",
        " ",
        "",
      ],
      keepSeparator: true,
    })

    const allChunks: Document[] = []

    for (const doc of docs) {
      const chunks = await splitter.splitDocuments([doc])

      const enhancedChunks = chunks.map((chunk, index) => ({
        ...chunk,
        pageContent: chunk.pageContent.trim(),
        metadata: {
          ...chunk.metadata,
          chunkIndex: index,
          totalChunks: chunks.length,
          chunkSize: chunk.pageContent.length,
          wordCount: chunk.pageContent.split(/\s+/).length,
        },
      }))

      allChunks.push(...enhancedChunks)
    }

    // Remove duplicates and empty chunks
    const uniqueChunks = allChunks.filter((chunk, index, arr) => {
      if (chunk.pageContent.length < 50) return false

      const isDuplicate =
        arr.findIndex(
          (c) => c.pageContent.trim() === chunk.pageContent.trim()
        ) !== index

      return !isDuplicate
    })

    console.log(`[RAG] Generated chunks: ${uniqueChunks.length}`)
    return uniqueChunks
  } catch (error) {
    console.error("[RAG] Error chunking documents:", error)
    throw new Error(`Failed to chunk documents: ${error}`)
  }
}

/**
 * Generate embeddings with enhanced error handling
 */
export async function generateEmbeddings(
  docs: Document[]
): Promise<number[][]> {
  if (docs.length === 0) return []

  const embeddings: number[][] = []
  const batchSize = 20

  console.log(`[RAG] Generating embeddings for ${docs.length} chunks`)

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize)
    const texts = batch
      .map((doc) => doc.pageContent.slice(0, 8000).trim())
      .filter((text) => text.length > 0)

    if (texts.length === 0) continue

    let retries = 0
    while (retries < MAX_RETRIES) {
      try {
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: texts,
          encoding_format: "float",
        })

        const batchEmbeddings = response.data.map((item) => item.embedding)

        // Validate all embeddings
        for (const embedding of batchEmbeddings) {
          if (!Array.isArray(embedding)) {
            throw new Error("Embedding is not an array")
          }
          if (embedding.length !== QDRANT_VECTOR_SIZE) {
            throw new Error(
              `Invalid embedding length: ${embedding.length} (expected ${QDRANT_VECTOR_SIZE})`
            )
          }
          if (
            !embedding.every(
              (v) => typeof v === "number" && !isNaN(v) && isFinite(v)
            )
          ) {
            throw new Error("Embedding contains invalid values")
          }
        }

        embeddings.push(...batchEmbeddings)
        console.log(
          `[RAG] Generated embeddings batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(docs.length / batchSize)}`
        )
        break
      } catch (error) {
        retries++
        console.warn(
          `[RAG] Embedding batch failed (attempt ${retries}):`,
          error
        )

        if (retries >= MAX_RETRIES) {
          throw new Error(
            `Failed to generate embeddings after ${MAX_RETRIES} retries: ${error}`
          )
        }

        await sleep(RETRY_DELAY * retries)
      }
    }

    // Rate limiting
    if (i + batchSize < docs.length) {
      await sleep(200)
    }
  }

  console.log(`[RAG] Generated ${embeddings.length} embeddings`)
  return embeddings
}

/**
 * Initialize Qdrant collection with proper error handling
 */
export async function initializeCollection(): Promise<void> {
  try {
    // Check if collection exists
    try {
      await qdrantClient.getCollection(QDRANT_COLLECTION)
      console.log(`[RAG] Collection ${QDRANT_COLLECTION} already exists`)
      return
    } catch {
      // Collection doesn't exist, create it
      console.log(`[RAG] Creating collection: ${QDRANT_COLLECTION}`)
    }

    // Create collection
    await qdrantClient.createCollection(QDRANT_COLLECTION, {
      vectors: {
        size: QDRANT_VECTOR_SIZE,
        distance: "Cosine",
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      hnsw_config: {
        m: 16,
        ef_construct: 100,
      },
    })

    // Wait for collection to be ready
    await sleep(2000)

    // Create payload indexes for better search performance
    try {
      await qdrantClient.createPayloadIndex(QDRANT_COLLECTION, {
        field_name: "url",
        field_schema: "keyword",
      })

      await qdrantClient.createPayloadIndex(QDRANT_COLLECTION, {
        field_name: "chunkIndex",
        field_schema: "integer",
      })
    } catch (indexError) {
      console.warn(
        "[RAG] Warning: Could not create payload indexes:",
        indexError
      )
    }

    console.log(`[RAG] Successfully created collection: ${QDRANT_COLLECTION}`)
  } catch (error) {
    console.error("[RAG] Error initializing collection:", error)
    throw new Error(`Failed to initialize collection: ${error}`)
  }
}

/**
 * Store chunks in Qdrant with comprehensive validation
 */
export async function storeChunks(
  chunks: Document[],
  embeddings: number[][]
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `Chunks (${chunks.length}) and embeddings (${embeddings.length}) count mismatch`
    )
  }

  if (chunks.length === 0) {
    console.log("[RAG] No chunks to store")
    return
  }

  await initializeCollection()

  // Prepare and validate points
  const points: QdrantPoint[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = embeddings[i]

    // Validate embedding
    if (!isValidVector(embedding)) {
      console.warn(`[RAG] Skipping chunk ${i} due to invalid embedding`)
      continue
    }

    // Generate valid ID
    const url = (chunk.metadata?.source as string) || "unknown"
    const id = generateValidId(url, i, chunk.pageContent)

    // Prepare payload
    const rawPayload = {
      url,
      title: chunk.metadata?.title || "",
      pageContent: chunk.pageContent.slice(0, MAX_CONTENT_LENGTH),
      chunkIndex: i,
      totalChunks: chunks.length,
      chunkSize: chunk.pageContent.length,
      wordCount: chunk.pageContent.split(/\s+/).length,
      timestamp: new Date().toISOString(),
      ...chunk.metadata,
    }

    // Sanitize payload
    const payload = sanitizePayload(rawPayload)

    points.push({
      id,
      vector: embedding,
      payload,
    })
  }

  if (points.length === 0) {
    throw new Error("No valid points to store after validation")
  }

  console.log(`[RAG] Storing ${points.length} validated points`)

  // Store in batches with retry logic
  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    const batch = points.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(points.length / BATCH_SIZE)

    let retries = 0
    while (retries < MAX_RETRIES) {
      try {
        console.log(
          `[RAG] Storing batch ${batchNumber}/${totalBatches} (${batch.length} points)`
        )

        await qdrantClient.upsert(QDRANT_COLLECTION, {
          wait: true,
          points: batch,
        })

        console.log(
          `[RAG] Successfully stored batch ${batchNumber}/${totalBatches}`
        )
        break
      } catch (error) {
        retries++
        console.error(
          `[RAG] Batch ${batchNumber} failed (attempt ${retries}):`,
          error
        )

        // Log detailed error information
        if (error && typeof error === "object" && "data" in error) {
          console.error(
            "[RAG] Qdrant error details:",
            JSON.stringify(error.data, null, 2)
          )
        }

        if (retries >= MAX_RETRIES) {
          // Try to store points individually to identify problematic ones
          console.log(
            `[RAG] Attempting individual point storage for batch ${batchNumber}`
          )

          for (let j = 0; j < batch.length; j++) {
            try {
              await qdrantClient.upsert(QDRANT_COLLECTION, {
                wait: true,
                points: [batch[j]],
              })
            } catch (pointError) {
              console.error(`[RAG] Failed to store point ${i + j}:`, {
                id: batch[j].id,
                vectorLength: batch[j].vector.length,
                payloadKeys: Object.keys(batch[j].payload),
                error: pointError,
              })
            }
          }

          throw new Error(
            `Failed to store batch ${batchNumber} after ${MAX_RETRIES} retries: ${error}`
          )
        }

        await sleep(RETRY_DELAY * retries)
      }
    }

    // Rate limiting between batches
    if (i + BATCH_SIZE < points.length) {
      await sleep(500)
    }
  }

  console.log(`[RAG] Successfully stored all ${points.length} chunks`)
}
