import { Suspense } from "react"

import { requirePageUser } from "@/lib/require-page-user"
import { PricingPageClient } from "./pricingPageClient"

export default async function PricingPage() {
  const initialUser = await requirePageUser("/pricing")

  return (
    <Suspense fallback={null}>
      <PricingPageClient initialUser={initialUser} />
    </Suspense>
  )
}
