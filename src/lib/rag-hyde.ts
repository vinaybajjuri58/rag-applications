import OpenAI from "openai"
import { qdrantClient, QDRANT_COLLECTION } from "./rag"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const EMBEDDING_MODEL = "text-embedding-3-small"

export interface SearchResult {
  score: number
  content: string
  url: string
  title: string
  chunkIndex: number
}

/**
 * Generate a hypothetical document based on the query
 */
async function generateHypotheticalDocument(query: string): Promise<string> {
  const systemPrompt = `You are a helpful assistant that generates hypothetical document passages. 
Given a query, generate a detailed passage that would be a perfect answer to that query.
The passage should be factual, clear, and written in a documentation style.
Do not include any uncertainty or phrases like "I would" or "You could".
Keep the response focused and relevant to the query.`

  const userPrompt = `Generate a detailed passage that would perfectly answer this query: "${query}"`

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 500,
  })

  return response.choices[0].message.content?.trim() || ""
}

/**
 * Generate embedding for a text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.trim(),
    encoding_format: "float",
  })

  return response.data[0].embedding
}

/**
 * Search using HyDE approach
 */
export async function hydeSearch(
  query: string,
  limit = 5,
  scoreThreshold = 0.1
): Promise<SearchResult[]> {
  try {
    console.log(`[HyDE] Searching for: "${query}"`)

    // Step 1: Generate a hypothetical document
    const hypotheticalDoc = await generateHypotheticalDocument(query)
    console.log(
      "[HyDE] Generated hypothetical document:",
      hypotheticalDoc.slice(0, 200) + "..."
    )

    // Step 2: Generate embedding for the hypothetical document
    const hydeEmbedding = await generateEmbedding(hypotheticalDoc)

    // Step 3: Search using the hypothetical document embedding
    const searchLimit = Math.min(limit * 2, 20)
    const results = await qdrantClient.search(QDRANT_COLLECTION, {
      vector: hydeEmbedding,
      limit: searchLimit,
      with_payload: true,
      score_threshold: scoreThreshold,
    })

    // Log raw Qdrant results for debugging
    console.log(
      "[HyDE] Raw Qdrant results:",
      results.map((r) => ({
        score: r.score,
        id: r.id,
        title: r.payload?.title,
        url: r.payload?.url,
        contentPreview: (r.payload?.pageContent as string)?.slice(0, 100),
      }))
    )

    // Process and filter results
    const processedResults = results
      .map((r) => {
        const payload = r.payload ?? {}
        return {
          score: r.score,
          content: (payload.pageContent as string) || "",
          url: (payload.url as string) || "",
          title: (payload.title as string) || "",
          chunkIndex: (payload.chunkIndex as number) || 0,
        }
      })
      .filter((r: SearchResult) => r.content.length > 0)
      .slice(0, limit)

    // Log processed results for debugging
    console.log("[HyDE] Processed results:", processedResults)

    console.log(`[HyDE] Found ${processedResults.length} relevant chunks`)
    return processedResults
  } catch (error) {
    console.error("[HyDE] Error in search:", error)
    throw new Error(`HyDE search failed: ${error}`)
  }
}

/**
 * Enhanced context retrieval using HyDE
 */
export async function retrieveContextWithHyDE(
  query: string,
  maxResults = 10
): Promise<{
  results: SearchResult[]
  context: string
  sources: string[]
  hypotheticalDoc: string
}> {
  // Generate hypothetical document and search
  const hypotheticalDoc = await generateHypotheticalDocument(query)
  const results = await hydeSearch(query, maxResults)

  // Format context and gather sources
  const context = results
    .map((r, idx) => `[${idx + 1}] ${r.content}`)
    .join("\n\n")

  const sources = [...new Set(results.map((r) => r.url))]

  return {
    results,
    context,
    sources,
    hypotheticalDoc,
  }
}
