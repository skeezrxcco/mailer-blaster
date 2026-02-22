import { Suspense } from "react"

import { WorkspacePageSkeleton } from "@/components/shared/workspace/workspace-page-skeleton"
import { requirePageUser } from "@/lib/require-page-user"
import { TemplatesPageClient } from "./templatesPageClient"

export default async function TemplatesPage() {
  const initialUser = await requirePageUser("/templates")

  return (
    <Suspense fallback={<WorkspacePageSkeleton title="Loading template marketplace..." />}>
      <TemplatesPageClient initialUser={initialUser} />
    </Suspense>
  )
}
