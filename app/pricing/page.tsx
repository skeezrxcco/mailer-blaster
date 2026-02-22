import { Suspense } from "react"

import { WorkspacePageSkeleton } from "@/components/shared/workspace/workspace-page-skeleton"
import { requirePageUser } from "@/lib/require-page-user"
import { PricingPageClient } from "./pricingPageClient"

export default async function PricingPage() {
  const initialUser = await requirePageUser("/pricing")

  return (
    <Suspense fallback={<WorkspacePageSkeleton title="Loading plans..." compact />}>
      <PricingPageClient initialUser={initialUser} />
    </Suspense>
  )
}
