import { Suspense } from "react"

import { WorkspacePageSkeleton } from "@/components/shared/workspace/workspace-page-skeleton"
import { requirePageUser } from "@/lib/require-page-user"
import { CheckoutPageClient } from "./checkoutPageClient"

export default async function CheckoutPage() {
  const initialUser = await requirePageUser("/checkout")

  return (
    <Suspense fallback={<WorkspacePageSkeleton title="Loading checkout..." compact />}>
      <CheckoutPageClient initialUser={initialUser} />
    </Suspense>
  )
}
