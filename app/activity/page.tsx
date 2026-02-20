import { Suspense } from "react"

import { ActivityPageClient } from "./activityPageClient"

export default function ActivityPage() {
  return (
    <Suspense fallback={null}>
      <ActivityPageClient />
    </Suspense>
  )
}
