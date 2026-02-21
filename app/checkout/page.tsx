import { Suspense } from "react"

import { requirePageUser } from "@/lib/require-page-user"
import { CheckoutPageClient } from "./checkoutPageClient"

export default async function CheckoutPage() {
  const initialUser = await requirePageUser("/checkout")

  return (
    <Suspense fallback={null}>
      <CheckoutPageClient initialUser={initialUser} />
    </Suspense>
  )
}
