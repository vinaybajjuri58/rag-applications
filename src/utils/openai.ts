import OpenAI from "openai"

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

/**
 * Generate an answer using OpenAI's chat completion API, given context and a user question.
 * @param context - The concatenated content of the top retrieved chunks.
 * @param question - The user's input question.
 * @returns The generated answer as a string.
 */
export async function generateAnswerWithOpenAI(
  context: string,
  question: string
): Promise<string> {
  console.log("Generating answer with OpenAI")
  console.log("Context:", context)
  console.log("Question:", question)
  const systemPrompt =
    "You are a helpful assistant. Use the provided context to answer the user's question. If the answer is not in the context, say you don't know."
  const userPrompt = `Context:\n${context}\n\nQuestion: ${question}`
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 300,
  })
  return response.choices[0]?.message?.content?.trim() || ""
}
