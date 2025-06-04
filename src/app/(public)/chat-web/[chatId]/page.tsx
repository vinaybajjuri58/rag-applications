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
import { RefreshCw, Link } from "lucide-react"

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

  const handleSubmitUrl = () => {
    if (!websiteUrl.trim()) return

    // Save the submitted URL to state
    setSubmittedUrl(websiteUrl)

    // Optionally, create a system message to indicate the URL was added
    const systemMessage: TMessage = {
      id: `system-${Date.now()}`,
      content: `Website URL added: ${websiteUrl}`,
      role: TMessageRole.Assistant,
      createdAt: new Date().toISOString(),
      chatId,
    }

    setMessages((prev) => [...prev, systemMessage])

    // Clear the input
    setWebsiteUrl("")
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

    // Simulate AI response delay
    setTimeout(() => {
      // Create a demo AI response
      const aiMessage: TMessage = {
        id: `assistant-${Date.now()}`,
        content: getDemoResponse(message, submittedUrl),
        role: TMessageRole.Assistant,
        createdAt: new Date().toISOString(),
        chatId,
      }

      // Add AI message to the chat
      setMessages((prev) => [...prev, aiMessage])
      setAiResponding(false)
    }, 1500)
  }

  // Demo response generator
  function getDemoResponse(
    userMessage: string,
    websiteUrl: string | null
  ): string {
    const lowerCaseMessage = userMessage.toLowerCase()

    // If a website URL has been submitted, mention it in some responses
    if (websiteUrl) {
      if (
        lowerCaseMessage.includes("website") ||
        lowerCaseMessage.includes("url") ||
        lowerCaseMessage.includes("link")
      ) {
        return `I see you've provided the website: ${websiteUrl}. In the full version of this application, I would analyze this website and answer questions based on its content. This demo is just showing the UI, but the actual implementation would connect to a backend that can scrape and analyze web content.`
      }

      if (
        lowerCaseMessage.includes("what") &&
        lowerCaseMessage.includes("about")
      ) {
        return `You've asked about ${websiteUrl}. In the complete version, I would provide information extracted from this website. For this demo, I'm just acknowledging that I've received the URL.`
      }
    }

    // Simple response patterns for demo
    if (lowerCaseMessage.includes("hello") || lowerCaseMessage.includes("hi")) {
      return "Hello there! How can I assist you today?"
    }

    if (lowerCaseMessage.includes("help")) {
      return "I'd be happy to help! This is a demo chat interface. You can ask me questions, and I'll provide pre-defined responses. You can also enter a website URL in the field above, and in the full implementation, I would be able to answer questions about that website."
    }

    if (
      lowerCaseMessage.includes("feature") ||
      lowerCaseMessage.includes("capabilities")
    ) {
      return "This demo showcases the chat UI functionality. In the full version, I can:\n\n- Answer questions using an LLM\n- Process and analyze websites that you provide\n- Extract information from web content\n- Provide information from a knowledge base\n- Remember conversation context"
    }

    if (lowerCaseMessage.includes("how are you")) {
      return "I'm just a demo AI, but I'm functioning perfectly! How are you doing today?"
    }

    // Default response
    return websiteUrl
      ? "This is a demo response. In the actual application, I would analyze the website you provided and give you information based on your query."
      : "This is a demo response. Try adding a website URL in the field above to see how I would interact with web content in the full version."
  }

  // Reset the chat
  const handleResetChat = () => {
    const welcomeMessage: TMessage = {
      id: `welcome-${Date.now()}`,
      content:
        "👋 Hello! I'm an AI assistant. How can I help you today? You can ask me questions about a website by entering its URL above.",
      role: TMessageRole.Assistant,
      createdAt: new Date().toISOString(),
      chatId,
    }

    setMessages([welcomeMessage])
    setSubmittedUrl(null)
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
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">
            {chat?.title || "Demo Chat"}
          </h1>
          {chat && (
            <p className="text-sm text-muted-foreground">
              {new Date(chat.createdAt).toLocaleDateString()}
            </p>
          )}
          <div className="text-xs mt-1 text-amber-500">
            Demo Mode - Conversations are not saved
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleResetChat}
          title="Reset chat"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Reset</span>
        </Button>
      </div>

      {/* Website URL input */}
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
