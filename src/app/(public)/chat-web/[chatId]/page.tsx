"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { TChat, TMessage, TMessageRole } from "@/types/chat"
import { Skeleton } from "@/components/ui/skeleton"
import { Message } from "@/components/Message"
import { TypingIndicator } from "@/components/TypingIndicator"
import { MessageInput } from "@/components/MessageInput"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link } from "lucide-react"
import type { TCrawlRequestPayload, TCrawlResponse } from "@/types/crawl"
import { postToApi } from "@/utils/api"
import { CrawlResult } from "@/components/CrawlResult"
import type { TChatSearchRequest, TChatSearchResult } from "@/types/chat-search"

export default function PublicChatDetailPage() {
  const params = useParams()
  const chatId = params?.chatId as string

  // Local state for the demo chat
  const [chat, setChat] = useState<TChat | null>(null)
  const [messages, setMessages] = useState<TMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [aiResponding, setAiResponding] = useState(false)
  const [error] = useState<string | null>(null)

  // Website URL state
  const [websiteUrl, setWebsiteUrl] = useState<string>("")
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null)

  const [crawlResult, setCrawlResult] = useState<TCrawlResponse | null>(null)
  const [crawlLoading, setCrawlLoading] = useState(false)
  const [crawlError, setCrawlError] = useState<string | null>(null)

  // Initialize the chat
  useEffect(() => {
    if (!chatId) return

    // Set up a demo chat with welcome message
    const demoChat: TChat = {
      id: chatId,
      title: "Demo Chat",
      userId: "demo-user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const welcomeMessage: TMessage = {
      id: `welcome-${Date.now()}`,
      content:
        "👋 Hello! I'm an AI assistant. How can I help you today? You can ask me questions about a website by entering its URL above.",
      role: TMessageRole.Assistant,
      createdAt: new Date().toISOString(),
      chatId,
    }

    setChat(demoChat)
    setMessages([welcomeMessage])
    setLoading(false)
  }, [chatId])

  const handleSubmitUrl = async () => {
    if (!websiteUrl.trim()) return

    setSubmittedUrl(websiteUrl)
    setCrawlResult(null)
    setCrawlError(null)
    setCrawlLoading(true)

    const systemMessage: TMessage = {
      id: `system-${Date.now()}`,
      content: `Website URL added: ${websiteUrl}`,
      role: TMessageRole.Assistant,
      createdAt: new Date().toISOString(),
      chatId,
    }
    setMessages((prev) => [...prev, systemMessage])
    setWebsiteUrl("")

    // --- API request to /api/crawl using postToApi ---
    const payload: TCrawlRequestPayload = {
      url: websiteUrl,
      crawlOptions: { maxDepth: 1 },
      chunkOptions: { chunkSize: 1000, chunkOverlap: 200 },
    }
    try {
      const data = await postToApi<TCrawlResponse, TCrawlRequestPayload>(
        "crawl",
        payload
      )
      setCrawlResult(data)
      if ("error" in data) {
        setCrawlError(data.error)
      }
    } catch (err) {
      setCrawlError((err as Error).message)
    } finally {
      setCrawlLoading(false)
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!chatId || !message.trim()) return

    // Create a user message
    const userMessage: TMessage = {
      id: `user-${Date.now()}`,
      content: message,
      role: TMessageRole.User,
      createdAt: new Date().toISOString(),
      chatId,
    }

    // Add user message to the chat
    setMessages((prev) => [...prev, userMessage])

    // Show AI typing indicator
    setAiResponding(true)

    try {
      // --- API request to /api/chat-search ---
      const payload: TChatSearchRequest = { query: message, limit: 5 }
      const data = await postToApi<TChatSearchResult, TChatSearchRequest>(
        "chat-search",
        payload
      )
      let aiContent = ""
      if (data && data.answer && data.answer.trim().length > 0) {
        aiContent = data.answer
      } else {
        aiContent =
          "Sorry, I couldn't find relevant information in the indexed website(s)."
      }
      const aiMessage: TMessage = {
        id: `assistant-${Date.now()}`,
        content: aiContent,
        role: TMessageRole.Assistant,
        createdAt: new Date().toISOString(),
        chatId,
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (err) {
      // Show error as AI message
      const aiMessage: TMessage = {
        id: `assistant-${Date.now()}`,
        content: (err as Error).message || "Error searching indexed content.",
        role: TMessageRole.Assistant,
        createdAt: new Date().toISOString(),
        chatId,
      }
      setMessages((prev) => [...prev, aiMessage])
    } finally {
      setAiResponding(false)
    }
  }

  if (loading && !chat) {
    return (
      <div className="w-full md:w-4/5 lg:w-3/5 mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="w-full md:w-4/5 lg:w-3/5 mx-auto p-4 border-b">
        <div className="flex items-center gap-2">
          <Link className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 flex gap-2">
            <Input
              type="url"
              placeholder="Enter website URL..."
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSubmitUrl} disabled={!websiteUrl.trim()}>
              Submit
            </Button>
          </div>
        </div>
        {submittedUrl && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center">
            <span className="font-semibold mr-1">Active URL:</span>{" "}
            {submittedUrl}
          </div>
        )}
        <CrawlResult
          crawlResult={crawlResult}
          crawlLoading={crawlLoading}
          crawlError={crawlError}
        />
      </div>

      <div className="w-full md:w-4/5 lg:w-3/5 mx-auto flex flex-col flex-1 overflow-hidden pt-2">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          {messages.length > 0 ? (
            <div className="space-y-2 pb-4">
              {messages.map((message, index) => (
                <Message
                  key={message.id}
                  message={message}
                  isLatest={index === messages.length - 1}
                />
              ))}
              {aiResponding && <TypingIndicator />}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground py-8">
              <div>
                <p className="mb-2">No messages yet.</p>
                <p className="text-sm">Start your conversation below.</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 my-2 px-3 py-2 text-sm bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}

        <MessageInput
          onSendMessage={handleSendMessage}
          isDisabled={aiResponding}
          className="border-t mt-auto px-4 sm:px-6 pb-2"
        />
      </div>
    </div>
  )
}
