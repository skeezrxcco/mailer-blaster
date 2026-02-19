export type ChatMessageSeed = {
  id: number
  role: "bot" | "user"
  text: string
  kind?: "suggestions" | "templateReview" | "emailRequest" | "validation"
}

export const initialChatMessages: ChatMessageSeed[] = [
  {
    id: 1,
    role: "bot",
    text: "Tell me your campaign goal and I will generate four professional templates.",
  },
]

export const chatCopy = {
  suggestionsIntro: "Here are four themed templates. Scroll horizontally and pick one to continue.",
  emailRequestIntro: "Great. Paste emails in chat or click + to upload a CSV with an email header.",
  promptPlaceholder: "Describe your newsletter campaign...",
  emailInputPlaceholder: "Paste contacts emails or CSV rows here...",
}

export function selectedTemplateNotice(templateName: string) {
  return `${templateName} selected. Review it and continue to the audience step.`
}

export function confirmedTemplateNotice(templateName: string) {
  return `${templateName} is ready. Continue when you want to validate recipients.`
}
