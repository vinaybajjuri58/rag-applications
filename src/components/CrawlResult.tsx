import React from "react"
import type { TCrawlResponse } from "@/types/crawl"
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Loader } from "lucide-react"

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
            <Loader className="h-4 w-4 animate-spin" />
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
              Chunks received: {crawlResult.chunks}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
