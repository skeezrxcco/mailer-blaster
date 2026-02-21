import { Suspense } from "react"

import { requirePageUser } from "@/lib/require-page-user"
import { CampaignsPageClient } from "./campaignsPageClient"

export default async function CampaignsPage() {
  const initialUser = await requirePageUser("/campaigns")

  return (
    <Suspense fallback={null}>
      <CampaignsPageClient initialUser={initialUser} />
    </Suspense>
  )
}
