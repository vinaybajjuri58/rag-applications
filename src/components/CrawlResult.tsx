import React from "react"
import type { TCrawlResponse } from "@/types/crawl"
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"

interface CrawlResultProps {
  crawlResult: TCrawlResponse | null
  crawlLoading: boolean
  crawlError: string | null
}

export const CrawlResult: React.FC<CrawlResultProps> = ({
  crawlResult,
  crawlLoading,
  crawlError,
}) => {
  if (!crawlLoading && !crawlError && !crawlResult) return null

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Website Crawl Result</CardTitle>
        <CardDescription>
          This section shows the URLs and titles of all chunks scraped from the
          submitted website.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {crawlLoading && (
          <div className="text-sm text-primary flex items-center gap-2">
            <span className="animate-pulse">
              Crawling and chunking website...
            </span>
          </div>
        )}
        {crawlError && (
          <div className="text-sm bg-destructive/10 text-destructive rounded p-2">
            Error: {crawlError}
          </div>
        )}
        {crawlResult && "chunks" in crawlResult && (
          <div className="text-sm">
            <div className="mb-2 font-medium text-green-700">
              Chunks received: {crawlResult.chunks.length}
            </div>
            <ul className="divide-y divide-border bg-muted rounded">
              {crawlResult.chunks.map((chunk, idx) => (
                <li
                  key={idx}
                  className="py-2 px-2 flex flex-col md:flex-row md:items-center gap-1 md:gap-4"
                >
                  <span
                    className="truncate text-xs text-primary font-mono"
                    title={chunk.metadata?.source || ""}
                  >
                    {chunk.metadata?.source || "(no url)"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {chunk.metadata?.title ? `— ${chunk.metadata.title}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
