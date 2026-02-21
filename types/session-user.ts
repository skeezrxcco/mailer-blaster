export type SessionUserSummary = {
  name: string
  email: string
  plan: string
  initials: string
  avatarUrl: string | null
}

type SessionUserSource = {
  name?: string | null
  email?: string | null
  image?: string | null
  plan?: string | null
}

function buildInitials(name: string, email: string) {
  const normalizedName = name.trim()
  if (normalizedName) {
    const parts = normalizedName.split(/\s+/).filter(Boolean)
    const picked = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")
    if (picked) return picked.toUpperCase()
  }

  const emailPrefix = email.split("@")[0] ?? ""
  return emailPrefix.slice(0, 2).toUpperCase() || "BM"
}

export function buildSessionUserSummary(source: SessionUserSource, fallback?: SessionUserSummary): SessionUserSummary {
  const nextName = source.name?.trim() || fallback?.name || "Account"
  const nextEmail = source.email?.trim().toLowerCase() || fallback?.email || ""
  const nextPlan = source.plan?.trim().toLowerCase() || fallback?.plan || "starter"
  const nextAvatarUrl = source.image?.trim() || fallback?.avatarUrl || null

  return {
    name: nextName,
    email: nextEmail,
    plan: nextPlan,
    avatarUrl: nextAvatarUrl,
    initials: buildInitials(nextName, nextEmail),
  }
}
