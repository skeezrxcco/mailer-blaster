import { Suspense } from "react"

import { requirePageUser } from "@/lib/require-page-user"
import { ChatPageClient } from "./chatPageClient"

export default async function ChatPage() {
  const initialUser = await requirePageUser("/chat")

  return (
    <Suspense fallback={null}>
      <ChatPageClient initialUser={initialUser} />
    </Suspense>
  )
}
