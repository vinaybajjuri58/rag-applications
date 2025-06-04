"use client"

import { LucideMessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function PublicChatPage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateChat() {
    try {
      setIsCreating(true)
      setError(null)

      // Generate a temporary ID for demo purposes
      const tempId = `demo-${Date.now()}`

      // Navigate to the public chat page
      router.push(`/chat-web/${tempId}`)
    } catch (err) {
      console.error("Error creating chat:", err)
      setError(err instanceof Error ? err.message : "Failed to create chat")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6">
        <div className="p-6 bg-primary/5 rounded-full">
          <LucideMessageSquarePlus className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Try a Demo Chat</h1>
        <p className="text-muted-foreground">
          Start a conversation with our AI assistant to see how it works.
          <br />
          <span className="text-sm text-yellow-600">
            Note: This is a public demo - conversations are not saved.
          </span>
        </p>
        {error && (
          <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">
            {error}
          </div>
        )}
        <Button size="lg" onClick={handleCreateChat} disabled={isCreating}>
          {isCreating ? "Creating..." : "Start Demo Chat"}
        </Button>
      </div>
    </div>
  )
}
