"use client"

import { type ComponentType, type ReactNode, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import { useCheckoutItem } from "@/hooks/use-checkout-item"
import { tabRoutes, type SidebarTab } from "@/hooks/use-workspace-tab"
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
  fileText: FileTextIcon,
  users: UsersIcon,
  rocket: RocketIcon,
  sparkles: SparklesIcon,
  circleCheck: CircleCheckIcon,
  partyPopper: PartyPopperIcon,
  handCoins: HandCoinsIcon,
  idCard: IdCardIcon,
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

function CreditsMeter({ credits, maxCredits }: { credits: number; maxCredits: number }) {
  const percentage = Math.max(0, Math.min(100, (credits / maxCredits) * 100))

  return (
    <div className="rounded-2xl bg-zinc-900/70 px-3 py-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="inline-flex items-center gap-1.5 text-zinc-300">
          <HandCoinsIcon size={14} className="h-3.5 w-3.5 text-amber-300" />
          AI Credits
        </div>
        <span className="font-medium text-amber-200">
          {credits}/{maxCredits}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function UserMenu({
  credits,
  maxCredits,
  sidebarExpanded,
  onNavigateSettingsSection,
  onSignOut,
}: {
  credits: number
  maxCredits: number
  sidebarExpanded: boolean
  onNavigateSettingsSection: (section: SettingsSection) => void
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
              ? "flex w-full items-center gap-2 rounded-xl bg-zinc-900/70 px-2 py-2 text-left hover:bg-zinc-900"
              : "rounded-full bg-zinc-900 p-0.5",
          )}
          aria-label="Open user menu"
        >
          <Avatar className="size-7 !rounded-full ring-2 ring-sky-400/25">
            <AvatarImage src={workspaceStaticData.user.avatarUrl} alt="User avatar" />
            <AvatarFallback className="bg-sky-500/20 text-sky-100">{workspaceStaticData.user.initials}</AvatarFallback>
          </Avatar>
          {sidebarExpanded ? (
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-zinc-100">{workspaceStaticData.user.name}</span>
              <span className="block truncate text-[11px] text-zinc-400">Account menu</span>
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 border-zinc-700 bg-zinc-950 text-zinc-100" align={sidebarExpanded ? "start" : "end"}>
        <DropdownMenuLabel className="space-y-1">
          <p className="text-sm font-medium text-zinc-100">{workspaceStaticData.user.name}</p>
          <p className="text-xs text-zinc-400">{workspaceStaticData.user.email}</p>
          <Badge className="mt-1 rounded-full border border-amber-300/20 bg-amber-400/10 text-amber-200">
            <HandCoinsIcon size={14} className="mr-1 h-3.5 w-3.5" />
            {credits}/{maxCredits}
          </Badge>
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
}: {
  tab: SidebarTab
  children: ReactNode
  pageTitle?: string
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

  const credits = workspaceStaticData.credits
  const maxCredits = workspaceStaticData.maxCredits
  const isProUser = workspaceStaticData.user.plan === "pro"

  const isSettingsSuiteRoute = tab === "settings" || tab === "pricing" || tab === "checkout"
  const activeSettingsSection = settingsSectionFromParam(searchParams.get("section"))
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
        .filter((item) => item.id !== "campaigns" || isProUser)
        .map((item) => ({
          id: item.id,
          label: item.label,
          icon: iconByKey[item.icon],
          indicator: item.id === "campaigns" ? "PRO" : undefined,
          active: tab === item.id,
          onSelect: () => navigateToTab(item.id),
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

            <div className={cn("mt-auto", sidebarExpanded ? "space-y-3 pt-4" : "flex flex-col items-center gap-3 pt-3")}>
              <div className={cn("w-full overflow-hidden transition-all duration-300", sidebarExpanded ? "max-h-20 opacity-100" : "max-h-0 opacity-0")}>
                <CreditsMeter credits={credits} maxCredits={maxCredits} />
              </div>
              <UserMenu
                credits={credits}
                maxCredits={maxCredits}
                sidebarExpanded={sidebarExpanded}
                onNavigateSettingsSection={navigateToSettingsSection}
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
                      <CreditsMeter credits={credits} maxCredits={maxCredits} />
                      {navigationItems.map((item) => (
                        <DrawerNavigationButton key={item.id} item={item} />
                      ))}
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
