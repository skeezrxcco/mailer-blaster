import { Suspense } from "react"

import { WorkspacePageSkeleton } from "@/components/shared/workspace/workspace-page-skeleton"
import { requirePageUser } from "@/lib/require-page-user"
import { ChatPageClient } from "./chatPageClient"

export default async function ChatPage() {
  const initialUser = await requirePageUser("/chat")

  return (
    <Suspense fallback={<WorkspacePageSkeleton title="Loading chat workspace..." compact />}>
      <ChatPageClient initialUser={initialUser} />
    </Suspense>
  )
}
