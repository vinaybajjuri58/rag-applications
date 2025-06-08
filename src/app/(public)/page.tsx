import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LucideMessageSquarePlus } from "lucide-react"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">RAG-Powered AI Assistant</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Experience the power of an AI assistant enhanced with
          retrieval-augmented generation
        </p>

        <div className="max-w-md mx-auto bg-card border rounded-lg p-8 shadow-sm mt-12">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="p-6 bg-primary/5 rounded-full">
              <LucideMessageSquarePlus className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Try Our AI Assistant</h2>
            <p className="text-muted-foreground">
              Start a conversation with our AI assistant and experience how it
              can help answer your questions.
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href="/chat-web">Start Demo Chat</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="p-6 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold mb-2">Knowledge-Enhanced</h3>
            <p className="text-muted-foreground">
              Our assistant combines the power of large language models with
              specific knowledge retrieval.
            </p>
          </div>
          <div className="p-6 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold mb-2">Accurate Responses</h3>
            <p className="text-muted-foreground">
              Get more accurate and relevant answers based on up-to-date
              information.
            </p>
          </div>
          <div className="p-6 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
            <p className="text-muted-foreground">
              Create an account to save your conversations and access more
              features.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
