export type GenerateAiTextInput = {
  prompt: string
  system?: string
  model?: string
  temperature?: number
}

export type GenerateAiTextResult = {
  text: string
  model: string
}

type AiProvider = "auto" | "openai" | "ollama"

function resolveProvider(): AiProvider {
  const raw = (process.env.AI_PROVIDER ?? "auto").trim().toLowerCase()
  if (raw === "openai" || raw === "ollama") return raw
  return "auto"
}

async function generateWithOpenAI(input: GenerateAiTextInput): Promise<GenerateAiTextResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY")
  }

  const model = input.model ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.4,
      input: [
        ...(input.system ? [{ role: "system", content: input.system }] : []),
        { role: "user", content: input.prompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI error (${response.status}): ${errorText}`)
  }

  const payload = (await response.json()) as {
    output_text?: string
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  }

  const fallbackText =
    payload.output
      ?.flatMap((block) => block.content ?? [])
      .filter((part) => part.type === "output_text" || part.type === "text")
      .map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? ""

  const text = (payload.output_text ?? fallbackText).trim()
  if (!text) {
    throw new Error("AI response did not include text")
  }

  return { text, model }
}

async function generateWithOllama(input: GenerateAiTextInput): Promise<GenerateAiTextResult> {
  const model = input.model ?? process.env.OLLAMA_MODEL ?? "llama3.2:3b"
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/$/, "")

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      options: {
        temperature: input.temperature ?? 0.4,
      },
      messages: [
        ...(input.system ? [{ role: "system", content: input.system }] : []),
        { role: "user", content: input.prompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ollama error (${response.status}): ${errorText}`)
  }

  const payload = (await response.json()) as {
    message?: { content?: string }
  }

  const text = (payload.message?.content ?? "").trim()
  if (!text) {
    throw new Error("Ollama response did not include text")
  }

  return { text, model }
}

export async function generateAiText(input: GenerateAiTextInput): Promise<GenerateAiTextResult> {
  const provider = resolveProvider()

  if (provider === "openai") {
    return generateWithOpenAI(input)
  }

  if (provider === "ollama") {
    return generateWithOllama(input)
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateWithOpenAI(input)
    } catch (openAiError) {
      const fallback = await generateWithOllama(input).catch(() => null)
      if (fallback) return fallback
      throw openAiError
    }
  }

  return generateWithOllama(input)
}
