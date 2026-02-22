export type ChatMessageSeed = {
  id: number
  role: "bot" | "user"
  text: string
  kind?: "suggestions" | "templateReview" | "emailRequest" | "validation"
}

export const initialChatMessages: ChatMessageSeed[] = []

export const chatHeroTitle = "What are you sending today?"
export const chatHeroSubtitle = "Describe your campaign goal and audience — I'll guide you from template to send."

export const chatCopy = {
  suggestionsIntro: "Here are some templates that match your campaign. Pick one to preview and customize, or tell me more about what you're looking for.",
  emailRequestIntro: "Now let's build your recipient list. Paste emails directly in the chat, or click + to upload a CSV file with an email column. I'll validate everything automatically.",
  promptPlaceholder: "Tell me about your email campaign...",
  emailInputPlaceholder: "Paste email addresses or CSV rows here...",
}

export function selectedTemplateNotice(templateName: string) {
  return `${templateName} selected! You can preview it, edit the content, or continue to add your recipients.`
}

export function confirmedTemplateNotice(templateName: string) {
  return `${templateName} is locked in and ready to go. When you're ready, we'll move on to collecting your mailing list.`
}
