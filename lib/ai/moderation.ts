type ModerationAction = "allow" | "rewrite_scope" | "rewrite_safety"

export type ModerationResult = {
  action: ModerationAction
  sanitizedPrompt: string
  message: string
}

const SAFETY_SENSITIVE_HINTS = [
  "phishing",
  "steal password",
  "malware",
  "exploit",
  "fraud",
  "blackmail",
  "hate speech",
  "scam",
  "credential stuffing",
]

const COMPLETELY_OFF_TOPIC_HINTS = [
  "write me python code",
  "solve this math",
  "translate this to french",
  "what is the capital of",
  "explain quantum",
  "write a poem about",
  "tell me a joke",
]

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function isUnsafePrompt(prompt: string) {
  const candidate = normalize(prompt)
  return SAFETY_SENSITIVE_HINTS.some((hint) => candidate.includes(hint))
}

function isCompletelyOffTopic(prompt: string) {
  const candidate = normalize(prompt)
  return COMPLETELY_OFF_TOPIC_HINTS.some((hint) => candidate.startsWith(hint))
}

export function moderatePrompt(rawPrompt: string): ModerationResult {
  const prompt = rawPrompt.replace(/\u0000/g, "").trim().slice(0, 6000)
  if (!prompt) {
    return {
      action: "allow",
      sanitizedPrompt: "Help me create an email campaign.",
      message: "Starting in email mode.",
    }
  }

  if (isUnsafePrompt(prompt)) {
    return {
      action: "rewrite_safety",
      sanitizedPrompt:
        "Rewrite this request into a safe, lawful, professional email campaign brief that avoids harmful actions and keeps marketing compliance.",
      message: "I rewrote that into a safe email brief and will continue in compliant mode.",
    }
  }

  if (isCompletelyOffTopic(prompt)) {
    return {
      action: "rewrite_scope",
      sanitizedPrompt: prompt,
      message: "Redirected to email scope.",
    }
  }

  return {
    action: "allow",
    sanitizedPrompt: prompt,
    message: "Prompt accepted.",
  }
}
