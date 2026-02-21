import { Suspense } from "react"

import { requirePageUser } from "@/lib/require-page-user"
import { SettingsPageClient } from "./settingsPageClient"

export default async function SettingsPage() {
  const initialUser = await requirePageUser("/settings")

  return (
    <Suspense fallback={null}>
      <SettingsPageClient initialUser={initialUser} />
    </Suspense>
  )
}
