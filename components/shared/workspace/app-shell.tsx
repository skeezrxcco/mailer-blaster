"use client"

import { type ComponentType, type ReactNode, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, ChevronRight } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BotIcon } from "@/components/ui/bot"
import { CircleCheckIcon } from "@/components/ui/circle-check"
import { CogIcon } from "@/components/ui/cog"
import { FilePenLineIcon } from "@/components/ui/file-pen-line"
import { FileTextIcon } from "@/components/ui/file-text"
import { HandCoinsIcon } from "@/components/ui/hand-coins"
import { IdCardIcon } from "@/components/ui/id-card"
import { MenuIcon } from "@/components/ui/menu"
import { PanelLeftCloseIcon } from "@/components/ui/panel-left-close"
import { PanelLeftOpenIcon } from "@/components/ui/panel-left-open"
import { PartyPopperIcon } from "@/components/ui/party-popper"
import { RocketIcon } from "@/components/ui/rocket"
import { SparklesIcon } from "@/components/ui/sparkles"
import { UsersIcon } from "@/components/ui/users"
import { XIcon } from "@/components/ui/x"
import {
  pageTitleMap,
  settingsSectionFromParam,
  settingsSidebarItems,
  sidebarItems,
  workspaceStaticData,
  type SettingsSection,
  type WorkspaceIconKey,
} from "@/components/shared/workspace/workspace.data"
import { useAiCredits } from "@/hooks/use-ai-credits"
import { useCheckoutItem } from "@/hooks/use-checkout-item"
import { useSessionUser } from "@/hooks/use-session-user"
import { tabRoutes, type SidebarTab } from "@/hooks/use-workspace-tab"
import { type SessionUserSummary } from "@/types/session-user"
import { cn } from "@/lib/utils"

type AppIcon = ComponentType<{ className?: string; size?: number }>
type IconAnimationHandle = { startAnimation: () => void; stopAnimation: () => void }

type NavigationItem = {
  id: string
  label: string
  icon: AppIcon
  active: boolean
  indicator?: string
  onSelect: () => void
}

const iconByKey: Record<WorkspaceIconKey, AppIcon> = {
  bot: BotIcon,
  filePenLine: FilePenLineIcon,
  fileText: FileTextIcon,
  users: UsersIcon,
  rocket: RocketIcon,
  sparkles: SparklesIcon,
  circleCheck: CircleCheckIcon,
  partyPopper: PartyPopperIcon,
  handCoins: HandCoinsIcon,
  idCard: IdCardIcon,
}

type ChatHistoryItem = {
  conversationId: string
  state?: string
  summary?: string | null
  context?: {
    goal?: string
  } | null
}

function chatHistoryTitle(item: ChatHistoryItem, index: number) {
  const goal = item.context?.goal?.trim()
  if (goal) return goal.slice(0, 42)
  const summary = item.summary?.replace(/\s+/g, " ").trim()
  if (summary) return summary.slice(0, 42)
  return `Chat ${index + 1}`
}

function HoverAnimatedIcon({
  icon: Icon,
  active,
  size,
  className,
}: {
  icon: AppIcon
  active: boolean
  size: number
  className?: string
}) {
  const iconRef = useRef<IconAnimationHandle | null>(null)

  useEffect(() => {
    if (active) {
      iconRef.current?.startAnimation?.()
      return
    }
    iconRef.current?.stopAnimation?.()
  }, [active])

  const IconComponent = Icon as unknown as ComponentType<any>

  return <IconComponent ref={iconRef} size={size} className={cn("inline-flex items-center justify-center", className)} />
}

function QuotaMeter({
  quotaPercent,
  isPaid,
  onUpgrade,
}: {
  quotaPercent: number
  isPaid: boolean
  onUpgrade?: () => void
}) {
  const barColor =
    quotaPercent > 40
      ? "bg-gradient-to-r from-emerald-400 to-sky-400"
      : quotaPercent > 15
        ? "bg-gradient-to-r from-amber-300 to-amber-400"
        : "bg-gradient-to-r from-rose-400 to-rose-500"

  return (
    <div className="rounded-2xl bg-zinc-900/70 px-3 py-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">Monthly quota</span>
        <span className={cn("font-medium", quotaPercent > 15 ? "text-zinc-200" : "text-rose-300")}>
          {quotaPercent}% left
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${quotaPercent}%` }} />
      </div>
      {!isPaid ? (
        <div className="mt-2.5 flex justify-start pl-0.5">
          <button
            type="button"
            onClick={onUpgrade}
            className="inline-flex h-6 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-900/70 px-2.5 text-[10px] font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          >
            Upgrade to Pro
          </button>
        </div>
      ) : null}
    </div>
  )
}

function accountTypeLabel(plan: string) {
  const normalized = String(plan ?? "")
    .trim()
    .toLowerCase()
  if (normalized === "premium") return "Premium"
  if (normalized === "pro") return "Pro"
  return "Free"
}

function isProPlan(plan: string) {
  const normalized = String(plan ?? "")
    .trim()
    .toLowerCase()
  return normalized === "pro" || normalized === "premium" || normalized === "enterprise"
}

function UserMenu({
  user,
  isPro,
  sidebarExpanded,
  onNavigateSettingsSection,
  onUpgrade,
  onSignOut,
}: {
  user: SessionUserSummary
  isPro: boolean
  sidebarExpanded: boolean
  onNavigateSettingsSection: (section: SettingsSection) => void
  onUpgrade: () => void
  onSignOut: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "transition",
            sidebarExpanded
              ? "flex w-full items-center gap-2.5 rounded-xl bg-zinc-900/70 px-2 py-2 text-left hover:bg-zinc-900"
              : "rounded-full bg-zinc-900 p-0.5",
          )}
          aria-label="Open user menu"
        >
          <Avatar className="size-7 !rounded-full ring-2 ring-sky-400/25">
            <AvatarImage src={user.avatarUrl ?? undefined} alt="User avatar" />
            <AvatarFallback className="bg-sky-500/20 text-sky-100">{user.initials}</AvatarFallback>
          </Avatar>
          {sidebarExpanded ? (
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-zinc-100">{user.name}</span>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-400">{accountTypeLabel(user.plan)}</span>
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 border-zinc-700 bg-zinc-950 text-zinc-100" align={sidebarExpanded ? "start" : "end"}>
        <DropdownMenuLabel className="space-y-1.5 py-2">
          <p className="text-sm font-medium text-zinc-100">{user.name}</p>
          <p className="text-xs text-zinc-400">{accountTypeLabel(user.plan)}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem className="focus:bg-zinc-800" onClick={() => onNavigateSettingsSection("profile")}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="focus:bg-zinc-800" onClick={() => onNavigateSettingsSection("plan")}>
          Plan
        </DropdownMenuItem>
        <DropdownMenuItem className="focus:bg-zinc-800" onClick={() => onNavigateSettingsSection("referals")}>
          Referals
        </DropdownMenuItem>
        {!isPro ? (
          <DropdownMenuItem className="text-cyan-300 focus:bg-zinc-800 focus:text-cyan-200" onClick={onUpgrade}>
            Upgrade to Pro
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem className="focus:bg-zinc-800" onClick={onSignOut}>
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SidebarNavigationButton({
  item,
  sidebarExpanded,
}: {
  item: NavigationItem
  sidebarExpanded: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={item.onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group relative flex rounded-xl text-sm transition",
        sidebarExpanded ? "w-full items-center gap-3 px-3 py-2.5 text-left" : "size-10 items-center justify-center p-0",
        item.active ? "bg-sky-500/15 text-sky-100" : "text-zinc-400 hover:text-zinc-100",
      )}
    >
      <HoverAnimatedIcon icon={item.icon} active={hovered || item.active} size={16} className="h-4 w-4 shrink-0" />
      <span
        className={cn(
          "inline-flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-200",
          sidebarExpanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0",
        )}
      >
        {item.label}
        {item.indicator ? <span className="rounded-full bg-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-900">{item.indicator}</span> : null}
      </span>
      {!sidebarExpanded && item.indicator ? <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-300" /> : null}
    </button>
  )
}

function DrawerNavigationButton({ item }: { item: NavigationItem }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={item.onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
        item.active ? "bg-sky-500/15 text-sky-100" : "text-zinc-300 hover:text-zinc-100",
      )}
    >
      <HoverAnimatedIcon icon={item.icon} active={hovered || item.active} size={14} className="h-3.5 w-3.5" />
      <span className="inline-flex items-center gap-2">
        {item.label}
        {item.indicator ? <span className="rounded-full bg-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-900">{item.indicator}</span> : null}
      </span>
    </button>
  )
}

export function WorkspaceShell({
  tab,
  children,
  pageTitle,
  user,
}: {
  tab: SidebarTab
  children: ReactNode
  pageTitle?: string
  user?: SessionUserSummary
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { hasCheckoutItem } = useCheckoutItem()
  const contentRegionRef = useRef<HTMLDivElement | null>(null)

  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarToggleHovered, setSidebarToggleHovered] = useState(false)
  const [topSettingsHovered, setTopSettingsHovered] = useState(false)
  const [topExitHovered, setTopExitHovered] = useState(false)
  const [showTopTitle, setShowTopTitle] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [isChatHistoryLoading, setIsChatHistoryLoading] = useState(false)
  const [chatHistoryCollapsed, setChatHistoryCollapsed] = useState(false)
  const [mobileChatHistoryCollapsed, setMobileChatHistoryCollapsed] = useState(false)

  const sessionUser = useSessionUser(
    user ?? {
      name: workspaceStaticData.user.name,
      email: workspaceStaticData.user.email,
      plan: workspaceStaticData.user.plan,
      initials: workspaceStaticData.user.initials,
      avatarUrl: workspaceStaticData.user.avatarUrl,
    },
  )
  const aiQuota = useAiCredits()

  const isPaidUser = isProPlan(sessionUser.plan)

  const isSettingsSuiteRoute = tab === "settings" || tab === "pricing" || tab === "checkout"
  const activeSettingsSection = settingsSectionFromParam(searchParams.get("section"))
  const activeConversationId = searchParams.get("conversationId")
  const activePageTitle = pageTitle ?? pageTitleMap[tab]

  useEffect(() => {
    const contentRegion = contentRegionRef.current
    if (!contentRegion) return

    const scrollElement = contentRegion.querySelector<HTMLElement>("[data-workspace-scroll]")
    if (!scrollElement) {
      setShowTopTitle(false)
      return
    }

    const onScroll = () => {
      setShowTopTitle(scrollElement.scrollTop > 36)
    }

    onScroll()
    scrollElement.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      scrollElement.removeEventListener("scroll", onScroll)
    }
  }, [tab, pageTitle])

  useEffect(() => {
    if (isSettingsSuiteRoute) return
    let cancelled = false

    const loadChatHistory = async () => {
      try {
        if (!cancelled) setIsChatHistoryLoading(true)
        const response = await fetch("/api/ai/session", {
          method: "GET",
          cache: "no-store",
        })
        if (!response.ok) return

        const payload = (await response.json()) as {
          sessions?: ChatHistoryItem[]
        }
        if (!cancelled) {
          setChatHistory(payload.sessions ?? [])
        }
      } catch {
        // Ignore history refresh failures.
      } finally {
        if (!cancelled) setIsChatHistoryLoading(false)
      }
    }

    void loadChatHistory()
    const interval = window.setInterval(loadChatHistory, 45_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [isSettingsSuiteRoute, tab, activeConversationId])

  const navigateToTab = (nextTab: SidebarTab) => {
    router.push(tabRoutes[nextTab])
    setMobileMenuOpen(false)
  }

  const navigateToSettingsSection = (section: SettingsSection) => {
    router.push(`/settings?section=${section}`)
    setMobileMenuOpen(false)
  }

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  const navigationItems: NavigationItem[] = isSettingsSuiteRoute
    ? settingsSidebarItems
        .filter((item) => item.id !== "checkout" || hasCheckoutItem)
        .map((item) => ({
          id: item.id,
          label: item.label,
          icon: iconByKey[item.icon],
          indicator: item.id === "checkout" && hasCheckoutItem ? "1" : undefined,
          active:
            item.id === "pricing" || item.id === "checkout"
              ? tab === item.id
              : tab === "settings" && activeSettingsSection === item.id,
          onSelect: () => {
            if (item.id === "pricing" || item.id === "checkout") {
              navigateToTab(item.id)
              return
            }
            navigateToSettingsSection(item.id)
          },
        }))
    : sidebarItems
        .map((item) => ({
          id: item.id,
          label: item.label,
          icon: iconByKey[item.icon],
          indicator: item.id === "campaigns" && !isPaidUser ? "PRO" : undefined,
          active: tab === item.id,
          onSelect: () => {
            if (item.id === "chat") {
              router.push("/chat?newChat=1")
              setMobileMenuOpen(false)
              return
            }
            navigateToTab(item.id)
          },
        }))

  const drawerDescription = isSettingsSuiteRoute ? workspaceStaticData.settingsDrawerDescription : workspaceStaticData.workspaceDrawerDescription

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#1f2937_0%,#09090b_42%,#030712_100%)] text-zinc-100">
      <div className="h-full p-0">
        <div className="flex h-full overflow-hidden bg-zinc-950/80 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <aside
            className={cn(
              "hidden h-full shrink-0 flex-col overflow-hidden border-r border-zinc-800/90 bg-zinc-950/92 p-3 transition-[width] duration-300 ease-in-out lg:flex",
              sidebarExpanded ? "lg:w-56" : "lg:w-20",
            )}
          >
            <div className={cn("mb-3 flex items-center", sidebarExpanded ? "justify-between" : "justify-center")}>
              {sidebarExpanded ? <p className="text-sm font-semibold text-zinc-200">{isSettingsSuiteRoute ? workspaceStaticData.settingsTitle : workspaceStaticData.expandedTitle}</p> : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarExpanded((prev) => !prev)}
                onMouseEnter={() => setSidebarToggleHovered(true)}
                onMouseLeave={() => setSidebarToggleHovered(false)}
                className="size-9 rounded-full p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                {sidebarExpanded ? (
                  <HoverAnimatedIcon icon={PanelLeftCloseIcon} active={sidebarToggleHovered} size={16} className="h-4 w-4" />
                ) : (
                  <HoverAnimatedIcon icon={PanelLeftOpenIcon} active={sidebarToggleHovered} size={16} className="h-4 w-4" />
                )}
              </Button>
            </div>

            <nav className={cn("space-y-1.5", sidebarExpanded ? "" : "flex flex-col items-center")}>
              {navigationItems.map((item) => (
                <SidebarNavigationButton key={item.id} item={item} sidebarExpanded={sidebarExpanded} />
              ))}
            </nav>

            {!isSettingsSuiteRoute && sidebarExpanded ? (
              <div className="mt-4 min-h-0">
                <button
                  type="button"
                  onClick={() => setChatHistoryCollapsed((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-[13px] font-medium text-zinc-500 transition hover:text-zinc-300"
                >
                  <span>Your chats</span>
                  {chatHistoryCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {!chatHistoryCollapsed ? (
                  <div className="scrollbar-hide mt-1 max-h-44 space-y-0.5 overflow-y-auto pr-1">
                    {chatHistory.length ? (
                      chatHistory.slice(0, 10).map((item, index) => {
                        const isActive = tab === "chat" && activeConversationId === item.conversationId
                        return (
                          <button
                            key={item.conversationId}
                            type="button"
                            onClick={() => {
                              router.push(`/chat?conversationId=${encodeURIComponent(item.conversationId)}`)
                            }}
                            className={cn(
                              "w-full rounded-md px-2.5 py-2 text-left transition",
                              isActive ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-200",
                            )}
                          >
                            <p className="truncate text-[12px] font-medium leading-5">{chatHistoryTitle(item, index)}</p>
                          </button>
                        )
                      })
                    ) : (
                      <p className="px-2.5 py-1.5 text-xs text-zinc-600">{isChatHistoryLoading ? "Loading..." : "No chats yet"}</p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={cn("mt-auto", sidebarExpanded ? "space-y-3 pt-4" : "flex flex-col items-center gap-3 pt-3")}>
              <div className={cn("w-full overflow-hidden transition-all duration-300", sidebarExpanded ? "max-h-20 opacity-100" : "max-h-0 opacity-0")}>
                <QuotaMeter quotaPercent={aiQuota.quotaPercent} isPaid={isPaidUser} onUpgrade={() => navigateToTab("pricing")} />
              </div>
              <UserMenu
                user={sessionUser}
                isPro={isPaidUser}
                sidebarExpanded={sidebarExpanded}
                onNavigateSettingsSection={navigateToSettingsSection}
                onUpgrade={() => navigateToTab("pricing")}
                onSignOut={handleSignOut}
              />
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Drawer direction="left" open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <DrawerTrigger asChild>
                    <Button variant="outline" size="icon-sm" className="border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-800 lg:hidden">
                      <MenuIcon size={16} className="h-4 w-4" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                    <DrawerHeader>
                      <DrawerTitle>{workspaceStaticData.drawerNavigationTitle}</DrawerTitle>
                      <DrawerDescription>{drawerDescription}</DrawerDescription>
                    </DrawerHeader>
                    <div className="space-y-2 px-4 pb-4">
                      <QuotaMeter quotaPercent={aiQuota.quotaPercent} isPaid={isPaidUser} onUpgrade={() => navigateToTab("pricing")} />
                      {navigationItems.map((item) => (
                        <DrawerNavigationButton key={item.id} item={item} />
                      ))}
                      {!isSettingsSuiteRoute ? (
                        <div>
                          <button
                            type="button"
                            onClick={() => setMobileChatHistoryCollapsed((prev) => !prev)}
                            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-[13px] font-medium text-zinc-500 transition hover:text-zinc-300"
                          >
                            <span>Your chats</span>
                            {mobileChatHistoryCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          {!mobileChatHistoryCollapsed ? (
                            <div className="scrollbar-hide mt-1 max-h-40 space-y-0.5 overflow-y-auto pr-1">
                              {chatHistory.length ? (
                                chatHistory.slice(0, 8).map((item, index) => (
                                  <button
                                    key={item.conversationId}
                                    type="button"
                                    onClick={() => {
                                      router.push(`/chat?conversationId=${encodeURIComponent(item.conversationId)}`)
                                      setMobileMenuOpen(false)
                                    }}
                                    className={cn(
                                      "w-full rounded-md px-2.5 py-2 text-left transition",
                                      tab === "chat" && activeConversationId === item.conversationId ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-200",
                                    )}
                                  >
                                    <p className="truncate text-[12px] font-medium leading-5">{chatHistoryTitle(item, index)}</p>
                                  </button>
                                ))
                              ) : (
                                <p className="px-2.5 py-1.5 text-xs text-zinc-600">{isChatHistoryLoading ? "Loading..." : "No chats yet"}</p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <Button variant="outline" className="mt-2 w-full border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800" onClick={handleSignOut}>
                        Logout
                      </Button>
                    </div>
                  </DrawerContent>
                </Drawer>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    showTopTitle ? "max-w-[360px] opacity-100" : "max-w-0 opacity-0",
                  )}
                >
                  <div
                    className={cn(
                      "translate-y-0 rounded-full bg-zinc-950/70 px-3 py-1 text-sm font-medium text-zinc-200 transition duration-300",
                      showTopTitle ? "translate-y-0" : "-translate-y-1",
                    )}
                  >
                    <span className="block truncate">{activePageTitle}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSettingsSuiteRoute ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full bg-zinc-900/75 p-0 text-zinc-100 hover:bg-zinc-800"
                    onClick={() => navigateToTab("chat")}
                    onMouseEnter={() => setTopExitHovered(true)}
                    onMouseLeave={() => setTopExitHovered(false)}
                    aria-label="Exit settings"
                  >
                    <HoverAnimatedIcon icon={XIcon} active={topExitHovered} size={20} className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full bg-zinc-900/75 p-0 text-zinc-100 hover:bg-zinc-800"
                    onClick={() => navigateToSettingsSection("profile")}
                    onMouseEnter={() => setTopSettingsHovered(true)}
                    onMouseLeave={() => setTopSettingsHovered(false)}
                    aria-label="Open settings"
                  >
                    <HoverAnimatedIcon icon={CogIcon} active={topSettingsHovered} size={20} className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
            <div ref={contentRegionRef} className="min-h-0 flex-1 overflow-hidden">
              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
