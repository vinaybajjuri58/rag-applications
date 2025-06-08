// Types for the /api/crawl endpoint

export type TCrawlRequestPayload = {
  url: string
  crawlOptions?: {
    maxDepth?: number
    excludeDirs?: string[]
    extractorOptions?: Record<string, unknown>
  }
  chunkOptions?: {
    chunkSize?: number
    chunkOverlap?: number
  }
}

export type TCrawlResponse =
  | {
      chunks: number
    }
  | { error: string }
