import { Suspense } from "react"

import { requirePageUser } from "@/lib/require-page-user"
import { TemplatesPageClient } from "./templatesPageClient"

export default async function TemplatesPage() {
  const initialUser = await requirePageUser("/templates")

  return (
    <Suspense fallback={null}>
      <TemplatesPageClient initialUser={initialUser} />
    </Suspense>
  )
}
