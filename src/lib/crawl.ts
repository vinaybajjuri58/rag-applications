import { RecursiveUrlLoader } from "@langchain/community/document_loaders/web/recursive_url"
import { compile } from "html-to-text"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { CohereEmbeddings } from "@langchain/cohere"

/**
 * Crawl a website starting from the given base URL and return structured documents.
 * Uses RecursiveUrlLoader with html-to-text for fast, static extraction.
 *
 * @param baseUrl - The starting URL for crawling.
 * @param options - Optional settings for crawling (maxDepth, excludeDirs, etc).
 * @returns Array of documents with pageContent and metadata.
 */
export async function crawlWebsite(
  baseUrl: string,
  options?: {
    maxDepth?: number
    excludeDirs?: string[]
    extractorOptions?: Parameters<typeof compile>[0]
  }
) {
  const compiledConvert = compile(
    options?.extractorOptions ?? { wordwrap: 130 }
  )
  const loader = new RecursiveUrlLoader(baseUrl, {
    extractor: compiledConvert,
    maxDepth: options?.maxDepth ?? 1,
    excludeDirs: options?.excludeDirs ?? [],
  })
  const docs = await loader.load()
  return docs
}

/**
 * Split documents into smaller chunks using RecursiveCharacterTextSplitter.
 *
 * @param docs - Array of documents to split.
 * @param options - Chunking options (chunkSize, chunkOverlap, etc).
 * @returns Array of chunked documents.
 */
export async function chunkDocuments(
  docs: Array<{ pageContent: string; metadata: Record<string, unknown> }>,
  options?: {
    chunkSize?: number
    chunkOverlap?: number
  }
) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options?.chunkSize ?? 1000,
    chunkOverlap: options?.chunkOverlap ?? 200,
  })
  const splitDocs = await splitter.splitDocuments(docs)
  return splitDocs
}

/**
 * Generate embeddings for an array of documents using Cohere.
 * @param docs - Array of documents to embed (expects pageContent field).
 * @returns Array of embedding vectors (number[]).
 */
export async function embedDocumentsWithCohere(
  docs: Array<{ pageContent: string; metadata: Record<string, unknown> }>
): Promise<number[][]> {
  const embedder = new CohereEmbeddings({
    apiKey: process.env.COHERE_API_KEY,
    model: "embed-english-v3.0", // Default, can be changed
  })
  const texts = docs.map((doc) => doc.pageContent)
  const vectors = await embedder.embedDocuments(texts)
  console.log("Embedding length:", vectors[0].length)
  return vectors
}
