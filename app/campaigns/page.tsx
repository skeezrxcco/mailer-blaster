import { Suspense } from "react"

import { WorkspacePageSkeleton } from "@/components/shared/workspace/workspace-page-skeleton"
import { requirePageUser } from "@/lib/require-page-user"
import { CampaignsPageClient } from "./campaignsPageClient"

export default async function CampaignsPage() {
  const initialUser = await requirePageUser("/campaigns")

  return (
    <Suspense fallback={<WorkspacePageSkeleton title="Loading campaigns workspace..." />}>
      <CampaignsPageClient initialUser={initialUser} />
    </Suspense>
  )
}
