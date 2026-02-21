import { Suspense } from "react"

import { requirePageUser } from "@/lib/require-page-user"
import { ActivityPageClient } from "./activityPageClient"

export default async function ActivityPage() {
  const initialUser = await requirePageUser("/activity")

  return (
    <Suspense fallback={null}>
      <ActivityPageClient initialUser={initialUser} />
    </Suspense>
  )
}
