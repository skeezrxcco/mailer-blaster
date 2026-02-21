import { Suspense } from "react"

import { requirePageUser } from "@/lib/require-page-user"
import { ContactsPageClient } from "./contactsPageClient"

export default async function ContactsPage() {
  const initialUser = await requirePageUser("/contacts")

  return (
    <Suspense fallback={null}>
      <ContactsPageClient initialUser={initialUser} />
    </Suspense>
  )
}
