import { Suspense } from "react"

import { WorkspacePageSkeleton } from "@/components/shared/workspace/workspace-page-skeleton"
import { requirePageUser } from "@/lib/require-page-user"
import { SettingsPageClient } from "./settingsPageClient"

export default async function SettingsPage() {
  const initialUser = await requirePageUser("/settings")

  return (
    <Suspense fallback={<WorkspacePageSkeleton title="Loading settings..." compact />}>
      <SettingsPageClient initialUser={initialUser} />
    </Suspense>
  )
}
