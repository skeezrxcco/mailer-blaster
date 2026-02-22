"use client"

import { type DragEvent, type ReactNode, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, ChevronDown, Monitor, Pencil, Smartphone, Sparkles, TabletSmartphone, Trash2, Upload } from "lucide-react"

import {
  chatHeroSubtitle,
  chatHeroTitle,
  chatCopy,
  confirmedTemplateNotice,
  initialChatMessages,
  selectedTemplateNotice,
  type ChatMessageSeed,
} from "@/app/chat/chat-page.data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EyeIcon } from "@/components/ui/eye"
import { TemplatePreview } from "@/components/shared/newsletter/template-preview"
import { buildEditorData, templateOptions, type TemplateEditorData, type TemplateOption } from "@/components/shared/newsletter/template-data"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { useAiCredits } from "@/hooks/use-ai-credits"
import { type SessionUserSummary } from "@/types/session-user"
import { cn } from "@/lib/utils"
import type { AiStreamEvent } from "@/lib/ai/types"

type ValidationStats = {
  total: number
  valid: number
  invalid: number
  duplicates: number
}

type EmailEntryStatus = "valid" | "invalid" | "duplicate"

type EmailEntry = {
  id: string
  value: string
  status: EmailEntryStatus
}

type PreviewMode = "desktop" | "tablet" | "mobile"
type DishKey = "one" | "two"
type ImageEditTarget = "hero" | "dishOne" | "dishTwo"

type EditorThemeState = {
  accentA: string
  accentB: string
  surface: string
  ctaBg: string
  ctaText: string
  dishOneImage: string
  dishTwoImage: string
}

type Message = ChatMessageSeed & {
  validationStats?: ValidationStats
  templateSuggestionIds?: string[]
  campaignId?: string
}

type EditorChatMessage = {
  id: number
  role: "assistant" | "user"
  text: string
}

type ModelChoice = {
  id: string
  label: string
  shortLabel: string
  mode: "essential" | "balanced" | "premium"
  requiresPro?: boolean
  quotaMultiplier: number
}

type ChatSessionSummary = {
  conversationId: string
  state: string
  intent: string
  selectedTemplateId?: string | null
  summary?: string | null
  context?: {
    goal?: string
  } | null
  lastActivityAt?: string
}

type CsvParseResult =
  | { ok: true; entries: EmailEntry[] }
  | { ok: false; error: string }

const viewportSpecs: Record<PreviewMode, { label: string; width: number; height: number }> = {
  desktop: { label: "Desktop", width: 1280, height: 900 },
  tablet: { label: "Tablet", width: 834, height: 1112 },
  mobile: { label: "Mobile", width: 390, height: 844 },
}

const modelChoices: ModelChoice[] = [
  { id: "essential", label: "Fast", shortLabel: "Fast", mode: "essential", quotaMultiplier: 1 },
  { id: "balanced", label: "Powerful", shortLabel: "Powerful", mode: "balanced", requiresPro: true, quotaMultiplier: 3 },
  { id: "premium", label: "Max", shortLabel: "Max", mode: "premium", requiresPro: true, quotaMultiplier: 8 },
]

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function computeValidationStats(entries: EmailEntry[]): ValidationStats {
  let valid = 0
  let invalid = 0
  let duplicates = 0

  for (const entry of entries) {
    if (entry.status === "valid") valid += 1
    if (entry.status === "invalid") invalid += 1
    if (entry.status === "duplicate") duplicates += 1
  }

  return {
    total: entries.length,
    valid,
    invalid,
    duplicates,
  }
}

function normalizeEmailEntries(entries: EmailEntry[]): EmailEntry[] {
  const seenValid = new Set<string>()

  return entries
    .map((entry) => ({
      ...entry,
      value: entry.value.trim().toLowerCase().replace(/^["']|["']$/g, ""),
    }))
    .filter((entry) => entry.value.includes("@"))
    .map((entry) => {
      if (!looksLikeEmail(entry.value)) {
        return { ...entry, status: "invalid" as const }
      }
      if (seenValid.has(entry.value)) {
        return { ...entry, status: "duplicate" as const }
      }
      seenValid.add(entry.value)
      return { ...entry, status: "valid" as const }
    })
}

function parseEmailEntries(raw: string): EmailEntry[] {
  const tokens = raw
    .split(/[;\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^["']|["']$/g, ""))
    .filter((item) => item.includes("@"))

  const entries = tokens.map((value, index) => ({
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    value,
    status: "invalid" as const,
  }))

  return normalizeEmailEntries(entries)
}

function detectCsvDelimiter(headerLine: string): "," | ";" | "\t" {
  const delimiters: Array<"," | ";" | "\t"> = [",", ";", "\t"]
  let selected: "," | ";" | "\t" = ","
  let highestCount = -1

  for (const delimiter of delimiters) {
    const count = headerLine.split(delimiter).length - 1
    if (count > highestCount) {
      highestCount = count
      selected = delimiter
    }
  }

  return selected
}

function parseCsvLine(line: string, delimiter: "," | ";" | "\t"): string[] | null {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ""
      continue
    }

    current += char
  }

  if (inQuotes) return null

  result.push(current)
  return result
}

function parseEmailEntriesFromCsvText(csvText: string): CsvParseResult {
  const normalized = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = normalized.split("\n")

  const headerIndex = lines.findIndex((line) => line.trim().length > 0)
  if (headerIndex < 0) {
    return { ok: false, error: "CSV file is empty." }
  }

  const headerLine = lines[headerIndex].replace(/^\uFEFF/, "")
  const delimiter = detectCsvDelimiter(headerLine)
  const headerCells = parseCsvLine(headerLine, delimiter)
  if (!headerCells) {
    return { ok: false, error: "CSV header is malformed (unclosed quotes)." }
  }

  const headerMap = headerCells.map((cell) => cell.trim().toLowerCase())
  const emailIndex = headerMap.findIndex((cell) => cell === "email")
  if (emailIndex < 0) {
    return { ok: false, error: 'CSV must contain an "email" header column.' }
  }

  const entries: EmailEntry[] = []
  for (let lineIndex = headerIndex + 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]
    if (!line.trim()) continue

    const cells = parseCsvLine(line, delimiter)
    if (!cells) {
      return { ok: false, error: `CSV row ${lineIndex + 1} is malformed (unclosed quotes).` }
    }

    if (emailIndex >= cells.length) {
      return { ok: false, error: `CSV row ${lineIndex + 1} does not include the email column.` }
    }

    const emailValue = (cells[emailIndex] ?? "").trim().replace(/^["']|["']$/g, "")
    if (!emailValue) {
      return { ok: false, error: `CSV row ${lineIndex + 1} has an empty email value.` }
    }

    entries.push({
      id: `${Date.now()}-${lineIndex}-${Math.random().toString(36).slice(2, 8)}`,
      value: emailValue,
      status: "invalid",
    })
  }

  if (!entries.length) {
    return { ok: false, error: 'No rows found under the "email" header.' }
  }

  return { ok: true, entries: normalizeEmailEntries(entries) }
}

function createThemeState(template: TemplateOption): EditorThemeState {
  return {
    accentA: template.accentA,
    accentB: template.accentB,
    surface: template.surface,
    ctaBg: template.ctaBg,
    ctaText: template.ctaText,
    dishOneImage: template.dishOneImage,
    dishTwoImage: template.dishTwoImage,
  }
}

function TemplateSuggestionCard({
  template,
  selected,
  onPreview,
  onSelect,
}: {
  template: TemplateOption
  selected: boolean
  onPreview: () => void
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [cardHovered, setCardHovered] = useState(false)
  const previewData = buildEditorData(template.theme, template)

  return (
    <Card
      className="h-[390px] w-[282px] shrink-0 rounded-[24px] border-0 bg-zinc-950/55 p-0 sm:w-[312px]"
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      <CardContent className="flex h-full flex-col p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-100">{template.name}</p>
            <p className="text-xs text-zinc-400">
              {template.theme} · {template.audience}
            </p>
          </div>
          {selected ? <Badge className="rounded-full bg-emerald-500/20 text-emerald-200">Selected</Badge> : null}
        </div>

        <TemplatePreview template={template} data={previewData} heightClass="h-44" autoScroll={cardHovered} />

        <p className="mt-2 text-xs leading-relaxed text-zinc-300">{template.description}</p>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">{template.tone}</p>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <Button
            size="sm"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800"
            onClick={onPreview}
          >
            <EyeIcon size={14} className={cn("h-3.5 w-3.5", hovered ? "text-zinc-100" : "text-zinc-300")} />
          </Button>
          <Button
            size="sm"
            onClick={onSelect}
            className={cn(
              "rounded-xl",
              selected ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-800" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
            )}
          >
            {selected ? "Selected" : "Select"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SelectedTemplateReviewCard({
  template,
  data,
  onEdit,
  onChange,
  onContinue,
}: {
  template: TemplateOption
  data: TemplateEditorData
  onEdit: () => void
  onChange: () => void
  onContinue: () => void
}) {
  const [cardHovered, setCardHovered] = useState(false)

  return (
    <Card
      className="h-[398px] w-[282px] shrink-0 rounded-[24px] border-0 bg-zinc-950/55 p-0 sm:w-[312px]"
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      <CardContent className="flex h-full flex-col p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-100">{template.name}</p>
            <p className="text-xs text-zinc-400">
              {template.theme} · {template.audience}
            </p>
          </div>
          <Badge className="rounded-full bg-emerald-500/20 text-emerald-200">Selected</Badge>
        </div>

        <TemplatePreview template={template} data={data} heightClass="h-44" autoScroll={cardHovered} />

        <p className="mt-2 text-xs leading-relaxed text-zinc-300">{template.description}</p>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">{template.tone}</p>

        <div className="mt-auto grid grid-cols-3 gap-2 pt-2">
          <Button size="sm" className="rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" className="rounded-xl bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800" onClick={onChange}>
            Change
          </Button>
          <Button size="sm" className="rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ValidationTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card className="rounded-xl border-0 bg-zinc-900/70">
      <CardContent className="p-2.5">
        <p className="text-[11px] text-zinc-400">{label}</p>
        <p className={cn("text-sm font-semibold", tone)}>{value}</p>
      </CardContent>
    </Card>
  )
}

function EmailValidationPanel({
  entries,
  onEditEntry,
  onRemoveEntry,
  onConfirmSend,
}: {
  entries: EmailEntry[]
  onEditEntry: (id: string, value: string) => void
  onRemoveEntry: (id: string) => void
  onConfirmSend: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState("")

  const stats = computeValidationStats(entries)

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-2 md:grid-cols-4">
        <ValidationTile label="Total" value={String(stats.total)} tone="text-zinc-100" />
        <ValidationTile label="Valid" value={String(stats.valid)} tone="text-emerald-300" />
        <ValidationTile label="Invalid" value={String(stats.invalid)} tone="text-rose-300" />
        <ValidationTile label="Duplicates" value={String(stats.duplicates)} tone="text-amber-300" />
      </div>

      <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl bg-zinc-950/65 p-2">
        {entries.map((entry) => {
          const isEditing = editingId === entry.id

          return (
            <div key={entry.id} className="flex items-center gap-2 rounded-lg bg-zinc-900/80 px-2 py-1.5">
              {isEditing ? (
                <input
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      onEditEntry(entry.id, draftValue)
                      setEditingId(null)
                    }
                  }}
                  className="h-8 w-full rounded-lg bg-zinc-950/80 px-2 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-sky-500/45"
                />
              ) : (
                <p
                  className={cn(
                    "w-full truncate text-xs",
                    entry.status === "valid"
                      ? "text-zinc-200"
                      : entry.status === "duplicate"
                        ? "text-amber-300"
                        : "text-rose-300",
                  )}
                >
                  {entry.value}
                </p>
              )}

              {!isEditing ? (
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                  onClick={() => {
                    setEditingId(entry.id)
                    setDraftValue(entry.value)
                  }}
                  aria-label="Edit email"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-emerald-300 transition hover:bg-zinc-800"
                  onClick={() => {
                    onEditEntry(entry.id, draftValue)
                    setEditingId(null)
                  }}
                  aria-label="Apply email edit"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-300"
                onClick={() => onRemoveEntry(entry.id)}
                aria-label="Remove email"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={onConfirmSend}
          disabled={stats.valid === 0}
          className="rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          Confirm and send
        </Button>
      </div>
    </div>
  )
}

function formatAssistantText(text: string) {
  return text
    .replace(/\s(\d+\.)\s/g, "\n$1 ")
    .replace(/:\s(\d+\.)\s/g, ":\n$1 ")
    .replace(/([?!])\s([A-Z])/g, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function AnimatedBotText({ text }: { text: string }) {
  const formattedText = formatAssistantText(text)
  const [visible, setVisible] = useState("")
  const [isTyping, setIsTyping] = useState(true)
  const animatedRef = useRef(false)

  useEffect(() => {
    if (animatedRef.current) {
      setVisible(formattedText)
      setIsTyping(false)
      return
    }

    animatedRef.current = true
    setVisible("")
    setIsTyping(true)

    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setVisible(formattedText.slice(0, index))
      if (index >= formattedText.length) {
        window.clearInterval(timer)
        setIsTyping(false)
      }
    }, 10)

    return () => window.clearInterval(timer)
  }, [formattedText])

  return (
    <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">
      {visible}
      {isTyping ? <span className="ml-0.5 inline-block h-4 w-[1px] animate-pulse bg-zinc-300 align-middle" /> : null}
    </p>
  )
}

function AssistantSignal() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900/70 px-3 py-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300/35" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-300/85" />
        </span>
        <span className="h-1.5 w-12 animate-pulse rounded-full bg-zinc-700" />
      </div>
    </div>
  )
}

function CsvSheetSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[96%] rounded-2xl bg-zinc-900/80 p-3">
        <p className="mb-2 text-xs text-zinc-400">Processing CSV file...</p>
        <div className="animate-pulse space-y-2 rounded-xl bg-zinc-950/70 p-2.5">
          <div className="grid grid-cols-3 gap-2">
            <div className="h-3 rounded bg-zinc-800" />
            <div className="h-3 rounded bg-zinc-800" />
            <div className="h-3 rounded bg-zinc-800" />
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-3 gap-2">
              <div className="h-2.5 rounded bg-zinc-800/90" />
              <div className="h-2.5 rounded bg-zinc-800/90" />
              <div className="h-2.5 rounded bg-zinc-800/90" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ViewportSwitch({ mode, onChange }: { mode: PreviewMode; onChange: (mode: PreviewMode) => void }) {
  const options: Array<{ id: PreviewMode; icon: ReactNode }> = [
    { id: "desktop", icon: <Monitor className="h-4 w-4" /> },
    { id: "tablet", icon: <TabletSmartphone className="h-4 w-4" /> },
    { id: "mobile", icon: <Smartphone className="h-4 w-4" /> },
  ]

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-zinc-950/80 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full transition",
            mode === option.id ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
          )}
          aria-label={viewportSpecs[option.id].label}
        >
          {option.icon}
        </button>
      ))}
    </div>
  )
}

function DevicePreviewFrame({ mode, children }: { mode: PreviewMode; children: ReactNode }) {
  const spec = viewportSpecs[mode]
  const widthCap = mode === "desktop" ? 980 : mode === "tablet" ? 720 : 390
  const ratio = spec.width / spec.height
  const displayWidth = Math.min(spec.width, widthCap)
  const displayHeight = Math.round(displayWidth / ratio)

  return (
    <div className="rounded-[28px] bg-zinc-900/50 p-2 shadow-2xl">
      <div
        className="scrollbar-hide overflow-y-auto overflow-x-hidden rounded-[18px] bg-zinc-950/45"
        style={{
          width: `min(${displayWidth}px, calc(100vw - 48px))`,
          height: `min(${displayHeight}px, calc(100vh - 170px))`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function EditableCopy({
  fieldId,
  value,
  editable,
  activeTextField,
  onStartEdit,
  onStopEdit,
  onChange,
  className,
  multiline = false,
  tag = "p",
  showEditIcon = true,
}: {
  fieldId: keyof TemplateEditorData
  value: string
  editable: boolean
  activeTextField: keyof TemplateEditorData | null
  onStartEdit: (field: keyof TemplateEditorData) => void
  onStopEdit: () => void
  onChange: (value: string) => void
  className?: string
  multiline?: boolean
  tag?: "p" | "h2" | "h3" | "span"
  showEditIcon?: boolean
}) {
  const Tag = tag
  const isEditing = editable && activeTextField === fieldId
  const Wrapper = tag === "span" ? "span" : "div"

  if (!editable) {
    return <Tag className={className}>{value}</Tag>
  }

  return (
    <Wrapper className={cn("group relative", tag === "span" ? "inline-flex items-center gap-1" : "")}>
      <Tag
        className={cn(
          className,
          "-mx-1 rounded px-1 outline-none",
          isEditing ? "ring-2 ring-sky-500/45" : "",
          multiline ? "whitespace-pre-line" : "whitespace-normal",
        )}
        contentEditable={isEditing}
        suppressContentEditableWarning
        spellCheck={false}
        onBlur={(event) => {
          const next = (multiline ? event.currentTarget.innerText : event.currentTarget.textContent)?.trim() ?? ""
          if (!next) {
            event.currentTarget.textContent = value
            onStopEdit()
            return
          }
          if (next !== value) onChange(next)
          onStopEdit()
        }}
        onKeyDown={(event) => {
          if (!multiline && event.key === "Enter") {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
      >
        {value}
      </Tag>
      {showEditIcon ? (
        <button
          type="button"
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 transition hover:bg-black/10 hover:text-zinc-900",
            tag === "span" ? "" : "absolute -right-1 -top-1",
          )}
          onClick={() => onStartEdit(fieldId)}
          aria-label="Edit text"
        >
          <Pencil className="h-3 w-3" />
        </button>
      ) : null}
    </Wrapper>
  )
}

function TemplateCanvas({
  template,
  data,
  theme,
  dishOrder,
  editable,
  activeTextField,
  onStartTextEdit,
  onStopTextEdit,
  onEditImage,
  onDataChange,
  onThemeChange,
  onSwapDish,
}: {
  template: TemplateOption
  data: TemplateEditorData
  theme: EditorThemeState
  dishOrder: DishKey[]
  editable: boolean
  activeTextField: keyof TemplateEditorData | null
  onStartTextEdit: (field: keyof TemplateEditorData) => void
  onStopTextEdit: () => void
  onEditImage: (target: ImageEditTarget) => void
  onDataChange: (field: keyof TemplateEditorData, value: string) => void
  onThemeChange: (patch: Partial<EditorThemeState>) => void
  onSwapDish: (source: DishKey, target: DishKey) => void
}) {
  const commit = (field: keyof TemplateEditorData, value: string) => {
    const next = value.trim()
    if (!next) return
    onDataChange(field, next)
  }

  const updateImageFromFile = (file: File, target: "hero" | "dishOne" | "dishTwo") => {
    if (!file.type.startsWith("image/")) return
    const url = URL.createObjectURL(file)
    if (target === "hero") {
      onDataChange("heroImage", url)
      return
    }
    if (target === "dishOne") {
      onThemeChange({ dishOneImage: url })
      return
    }
    onThemeChange({ dishTwoImage: url })
  }

  const handleDrop = (event: DragEvent<HTMLElement>, target: "hero" | "dishOne" | "dishTwo") => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    updateImageFromFile(file, target)
  }

  const dishDataMap = {
    one: {
      title: data.dishOneTitle,
      description: data.dishOneDescription,
      image: theme.dishOneImage,
      titleField: "dishOneTitle" as const,
      descriptionField: "dishOneDescription" as const,
    },
    two: {
      title: data.dishTwoTitle,
      description: data.dishTwoDescription,
      image: theme.dishTwoImage,
      titleField: "dishTwoTitle" as const,
      descriptionField: "dishTwoDescription" as const,
    },
  }

  return (
    <div className="min-h-full w-full bg-transparent px-1 py-4 sm:px-2">
      <article className="mx-auto w-full max-w-[640px] overflow-hidden rounded-[26px] bg-zinc-50 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        <div
          className="relative h-[290px]"
          onDragOver={(event) => editable && event.preventDefault()}
          onDrop={(event) => editable && handleDrop(event, "hero")}
        >
          <img src={data.heroImage} alt={data.headline} className="h-full w-full object-cover" />
          {editable ? (
            <button
              type="button"
              onClick={() => onEditImage("hero")}
              className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
              aria-label="Edit hero image"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(125deg, ${theme.accentA}dd 0%, ${theme.accentB}88 52%, #0000006f 100%)`,
            }}
          />

          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <EditableCopy
              fieldId="preheader"
              value={data.preheader}
              editable={editable}
              activeTextField={activeTextField}
              onStartEdit={onStartTextEdit}
              onStopEdit={onStopTextEdit}
              onChange={(value) => commit("preheader", value)}
              className="text-xs uppercase tracking-[0.14em] text-white/85"
            />
            <EditableCopy
              fieldId="headline"
              tag="h2"
              value={data.headline}
              editable={editable}
              activeTextField={activeTextField}
              onStartEdit={onStartTextEdit}
              onStopEdit={onStopTextEdit}
              onChange={(value) => commit("headline", value)}
              className="mt-2 text-3xl font-semibold leading-tight"
            />
            <EditableCopy
              fieldId="subheadline"
              value={data.subheadline}
              editable={editable}
              activeTextField={activeTextField}
              onStartEdit={onStartTextEdit}
              onStopEdit={onStopTextEdit}
              multiline
              onChange={(value) => commit("subheadline", value)}
              className="mt-2 max-w-[560px] text-sm leading-relaxed text-white/90"
            />
          </div>
        </div>

        <div className="space-y-6 px-5 py-6" style={{ backgroundColor: theme.surface }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <EditableCopy
                fieldId="restaurantName"
                tag="p"
                value={data.restaurantName}
                editable={editable}
                activeTextField={activeTextField}
                onStartEdit={onStartTextEdit}
                onStopEdit={onStopTextEdit}
                onChange={(value) => commit("restaurantName", value)}
                className="text-xl font-semibold text-zinc-900"
              />
              <EditableCopy
                fieldId="subjectLine"
                value={data.subjectLine}
                editable={editable}
                activeTextField={activeTextField}
                onStartEdit={onStartTextEdit}
                onStopEdit={onStopTextEdit}
                onChange={(value) => commit("subjectLine", value)}
                className="text-sm text-zinc-600"
              />
            </div>
            <Badge className="rounded-full bg-white/80 px-3 py-1 text-[11px] uppercase tracking-wide text-zinc-700">{template.theme}</Badge>
          </div>

          <div className="rounded-2xl bg-white/75 p-4">
            <EditableCopy
              fieldId="offerTitle"
              tag="h3"
              value={data.offerTitle}
              editable={editable}
              activeTextField={activeTextField}
              onStartEdit={onStartTextEdit}
              onStopEdit={onStopTextEdit}
              onChange={(value) => commit("offerTitle", value)}
              className="text-lg font-semibold text-zinc-900"
            />
            <EditableCopy
              fieldId="offerDescription"
              value={data.offerDescription}
              editable={editable}
              activeTextField={activeTextField}
              onStartEdit={onStartTextEdit}
              onStopEdit={onStopTextEdit}
              multiline
              onChange={(value) => commit("offerDescription", value)}
              className="mt-2 text-sm leading-relaxed text-zinc-600"
            />
            <button type="button" className="mt-4 inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold" style={{ backgroundColor: theme.ctaBg, color: theme.ctaText }}>
              <EditableCopy
                fieldId="ctaText"
                tag="span"
                value={data.ctaText}
                editable={editable}
                activeTextField={activeTextField}
                onStartEdit={onStartTextEdit}
                onStopEdit={onStopTextEdit}
                onChange={(value) => commit("ctaText", value)}
                className="text-sm"
                showEditIcon={false}
              />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {dishOrder.map((dishKey) => {
              const dish = dishDataMap[dishKey]
              const target = dishKey === "one" ? "dishOne" : "dishTwo"
              return (
                <div
                  key={dishKey}
                  className="relative overflow-hidden rounded-2xl bg-white"
                  draggable={editable}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", dishKey)
                  }}
                  onDragOver={(event) => editable && event.preventDefault()}
                  onDrop={(event) => {
                    if (!editable) return
                    event.preventDefault()
                    const source = event.dataTransfer.getData("text/plain") as DishKey
                    if (source && source !== dishKey) {
                      onSwapDish(source, dishKey)
                      return
                    }
                    const file = event.dataTransfer.files?.[0]
                    if (file) handleDrop(event, target)
                  }}
                >
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => onEditImage(target)}
                      className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
                      aria-label="Edit dish image"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  ) : null}
                  <img src={dish.image} alt={dish.title} className="h-32 w-full object-cover" />
                  <div className="space-y-1 p-3">
                    <EditableCopy
                      fieldId={dish.titleField}
                      tag="p"
                      value={dish.title}
                      editable={editable}
                      activeTextField={activeTextField}
                      onStartEdit={onStartTextEdit}
                      onStopEdit={onStopTextEdit}
                      onChange={(value) => commit(dish.titleField, value)}
                      className="text-sm font-semibold text-zinc-900"
                    />
                    <EditableCopy
                      fieldId={dish.descriptionField}
                      value={dish.description}
                      editable={editable}
                      activeTextField={activeTextField}
                      onStartEdit={onStartTextEdit}
                      onStopEdit={onStopTextEdit}
                      multiline
                      onChange={(value) => commit(dish.descriptionField, value)}
                      className="text-xs leading-relaxed text-zinc-600"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <footer className="bg-white px-5 py-4">
          <EditableCopy
            fieldId="footerNote"
            value={data.footerNote}
            editable={editable}
            activeTextField={activeTextField}
            onStartEdit={onStartTextEdit}
            onStopEdit={onStopTextEdit}
            multiline
            onChange={(value) => commit("footerNote", value)}
            className="text-xs leading-relaxed text-zinc-500"
          />
        </footer>
      </article>
    </div>
  )
}

function TemplatePreviewModal({
  template,
  data,
  theme,
  dishOrder,
  viewport,
  onViewportChange,
  onClose,
}: {
  template: TemplateOption
  data: TemplateEditorData
  theme: EditorThemeState
  dishOrder: DishKey[]
  viewport: PreviewMode
  onViewportChange: (mode: PreviewMode) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full flex-col p-2 md:p-4" onClick={(event) => event.stopPropagation()}>
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <ViewportSwitch mode={viewport} onChange={onViewportChange} />
          <Button size="icon" onClick={onClose} className="size-10 rounded-full bg-zinc-950/80 p-0 text-zinc-100 hover:bg-zinc-900" aria-label="Close preview">
            ×
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 md:p-4">
          <DevicePreviewFrame mode={viewport}>
            <TemplateCanvas
              template={template}
              data={data}
              theme={theme}
              dishOrder={dishOrder}
              editable={false}
              activeTextField={null}
              onStartTextEdit={() => undefined}
              onStopTextEdit={() => undefined}
              onEditImage={() => undefined}
              onDataChange={() => undefined}
              onThemeChange={() => undefined}
              onSwapDish={() => undefined}
            />
          </DevicePreviewFrame>
        </div>
      </div>
    </div>
  )
}

function TemplateEditorModal({
  template,
  data,
  onDataChange,
  theme,
  onThemeChange,
  dishOrder,
  onSwapDish,
  viewport,
  onViewportChange,
  onClose,
}: {
  template: TemplateOption
  data: TemplateEditorData
  onDataChange: (field: keyof TemplateEditorData, value: string) => void
  theme: EditorThemeState
  onThemeChange: (patch: Partial<EditorThemeState>) => void
  dishOrder: DishKey[]
  onSwapDish: (source: DishKey, target: DishKey) => void
  viewport: PreviewMode
  onViewportChange: (mode: PreviewMode) => void
  onClose: () => void
}) {
  const chatScrollRef = useRef<HTMLDivElement | null>(null)
  const imageFileInputRef = useRef<HTMLInputElement | null>(null)
  const [chatInput, setChatInput] = useState("")
  const [activeTextField, setActiveTextField] = useState<keyof TemplateEditorData | null>(null)
  const [imageTarget, setImageTarget] = useState<ImageEditTarget | null>(null)
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [aiImagePrompt, setAiImagePrompt] = useState("")
  const [chatMessages, setChatMessages] = useState<EditorChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Describe a change and I will update the template inline. Example: make the headline shorter and premium.",
    },
  ])

  useEffect(() => {
    if (!chatScrollRef.current) return
    chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" })
  }, [chatMessages])

  const applyPrompt = (prompt: string) => {
    const value = prompt.toLowerCase()
    const updates: Array<[keyof TemplateEditorData, string]> = []
    const themePatch: Partial<EditorThemeState> = {}

    if (value.includes("short") && value.includes("headline")) {
      updates.push(["headline", "New Seasonal Menu Is Live"])
    }
    if (value.includes("premium") || value.includes("luxury") || value.includes("elegant")) {
      updates.push(["subheadline", "A refined seasonal experience crafted for guests who value precision, quality, and chef-led storytelling."])
      themePatch.accentA = "#111827"
      themePatch.accentB = "#9a3412"
    }
    if (value.includes("green") || value.includes("vegan")) {
      themePatch.accentA = "#14532d"
      themePatch.accentB = "#22c55e"
      themePatch.surface = "#f0fdf4"
    }
    if (value.includes("cta")) {
      updates.push(["ctaText", "Book Your Table"])
    }

    updates.forEach(([field, next]) => onDataChange(field, next))
    if (Object.keys(themePatch).length) onThemeChange(themePatch)

    if (!updates.length && !Object.keys(themePatch).length) {
      return "Applied minor copy polish and spacing adjustments."
    }

    return "Updated. Review the preview and continue refining if needed."
  }

  const sendEditorPrompt = () => {
    const prompt = chatInput.trim()
    if (!prompt) return

    const userMessage: EditorChatMessage = { id: Date.now(), role: "user", text: prompt }
    const assistantReply = applyPrompt(prompt)
    const assistantMessage: EditorChatMessage = { id: Date.now() + 1, role: "assistant", text: assistantReply }

    setChatMessages((prev) => [...prev, userMessage, assistantMessage])
    setChatInput("")
  }

  const getImageByTarget = (target: ImageEditTarget) => {
    if (target === "hero") return data.heroImage
    if (target === "dishOne") return theme.dishOneImage
    return theme.dishTwoImage
  }

  const setImageByTarget = (target: ImageEditTarget, value: string) => {
    if (!value.trim()) return
    if (target === "hero") {
      onDataChange("heroImage", value)
      return
    }
    if (target === "dishOne") {
      onThemeChange({ dishOneImage: value })
      return
    }
    onThemeChange({ dishTwoImage: value })
  }

  const openImageEditor = (target: ImageEditTarget) => {
    setImageTarget(target)
    setImageUrlInput(getImageByTarget(target))
    setAiImagePrompt("")
  }

  const closeImageEditor = () => {
    setImageTarget(null)
    setImageUrlInput("")
    setAiImagePrompt("")
  }

  const applyImageUrl = () => {
    if (!imageTarget) return
    setImageByTarget(imageTarget, imageUrlInput)
    closeImageEditor()
  }

  const generateAiImage = () => {
    if (!imageTarget || !aiImagePrompt.trim()) return
    const generatedUrl = `https://source.unsplash.com/1200x900/?${encodeURIComponent(aiImagePrompt.trim())}`
    setImageByTarget(imageTarget, generatedUrl)
    closeImageEditor()
  }

  const onUploadImageFile = (file: File | null) => {
    if (!file || !imageTarget || !file.type.startsWith("image/")) return
    const url = URL.createObjectURL(file)
    setImageByTarget(imageTarget, url)
    closeImageEditor()
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100">
      <div className="flex h-full flex-col px-3 pb-3 pt-2 md:px-4 md:pb-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="truncate text-xs uppercase tracking-[0.14em] text-zinc-400">{template.name}</div>
          <div className="flex items-center gap-2">
            <ViewportSwitch mode={viewport} onChange={onViewportChange} />
            <Button size="icon" onClick={onClose} className="size-10 rounded-full bg-zinc-900 p-0 text-zinc-100 hover:bg-zinc-800" aria-label="Close editor">
              ×
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-0 rounded-3xl bg-zinc-900/55 p-2">
            <div className="flex h-full min-h-0 items-start justify-center overflow-hidden rounded-2xl bg-zinc-950/85 p-3">
              <DevicePreviewFrame mode={viewport}>
                <TemplateCanvas
                  template={template}
                  data={data}
                  theme={theme}
                  dishOrder={dishOrder}
                  editable
                  activeTextField={activeTextField}
                  onStartTextEdit={setActiveTextField}
                  onStopTextEdit={() => setActiveTextField(null)}
                  onEditImage={openImageEditor}
                  onDataChange={onDataChange}
                  onThemeChange={onThemeChange}
                  onSwapDish={onSwapDish}
                />
              </DevicePreviewFrame>
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-3xl bg-zinc-900/65 p-2.5">
            <div className="mb-2 text-xs text-zinc-300">AI editor chat</div>
            <div ref={chatScrollRef} className="scrollbar-hide min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-zinc-950/75 p-2">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                    message.role === "assistant" ? "bg-zinc-900 text-zinc-200" : "ml-auto bg-sky-500/20 text-sky-100",
                  )}
                >
                  {message.text}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-2xl bg-zinc-950/75 p-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    sendEditorPrompt()
                  }
                }}
                placeholder="Tell AI what to change..."
                className="h-10 w-full rounded-xl bg-zinc-900/80 px-3 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-sky-500/45"
              />
            </div>
          </div>
        </div>
      </div>
      {imageTarget ? (
        <div className="fixed inset-0 z-[60] bg-black/70 p-4 backdrop-blur-sm" onClick={closeImageEditor}>
          <div className="mx-auto mt-16 w-full max-w-lg rounded-2xl bg-zinc-950/95 p-4" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm font-medium text-zinc-100">Update image</p>
            <p className="mt-1 text-xs text-zinc-400">Upload a file, paste an image URL, or generate with AI prompt.</p>

            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onUploadImageFile(event.target.files?.[0] ?? null)}
            />

            <div className="mt-3 grid gap-2">
              <Button
                type="button"
                onClick={() => imageFileInputRef.current?.click()}
                className="rounded-xl bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload image
              </Button>

              <div className="flex items-center gap-2">
                <input
                  value={imageUrlInput}
                  onChange={(event) => setImageUrlInput(event.target.value)}
                  placeholder="Paste image URL"
                  className="h-10 w-full rounded-xl bg-zinc-900/90 px-3 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-sky-500/45"
                />
                <Button type="button" onClick={applyImageUrl} className="rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                  Apply
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={aiImagePrompt}
                  onChange={(event) => setAiImagePrompt(event.target.value)}
                  placeholder="Generate with AI prompt (e.g. sushi close-up)"
                  className="h-10 w-full rounded-xl bg-zinc-900/90 px-3 text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500/45"
                />
                <Button type="button" onClick={generateAiImage} className="rounded-xl bg-violet-500 text-zinc-100 hover:bg-violet-400">
                  <Sparkles className="mr-1 h-4 w-4" />
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ChatPageClient({ initialUser }: { initialUser: SessionUserSummary }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const csvFileInputRef = useRef<HTMLInputElement | null>(null)
  const initializedFromTemplateRef = useRef(false)

  const [messages, setMessages] = useState<Message[]>(initialChatMessages)
  const [prompt, setPrompt] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null)
  const [templateData, setTemplateData] = useState<TemplateEditorData | null>(null)
  const [themeState, setThemeState] = useState<EditorThemeState | null>(null)
  const [dishOrder, setDishOrder] = useState<DishKey[]>(["one", "two"])
  const [previewViewport, setPreviewViewport] = useState<PreviewMode>("desktop")
  const [editorViewport, setEditorViewport] = useState<PreviewMode>("desktop")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [composerMode, setComposerMode] = useState<"prompt" | "emails">("prompt")
  const [emailEntries, setEmailEntries] = useState<EmailEntry[]>([])
  const [isCsvProcessing, setIsCsvProcessing] = useState(false)
  const [isAiResponding, setIsAiResponding] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [workflowState, setWorkflowState] = useState<string>("INTENT_CAPTURE")
  const [selectedModelChoice, setSelectedModelChoice] = useState<string>("essential")
  const [isComposerStacked, setIsComposerStacked] = useState(false)
  const isPaidPlan = initialUser.plan === "pro" || initialUser.plan === "premium" || initialUser.plan === "enterprise"
  const aiQuota = useAiCredits()
  const isOutOfCredits = aiQuota.exhausted
  const templateParam = searchParams.get("template")
  const newChatParam = searchParams.get("newChat")
  const conversationIdParam = searchParams.get("conversationId")

  const resizeTextarea = () => {
    const element = textareaRef.current
    if (!element) return
    const minHeight = 28
    const maxHeight = 132
    element.style.height = "0px"
    const nextHeight = Math.min(element.scrollHeight, maxHeight)
    element.style.height = `${Math.max(nextHeight, minHeight)}px`
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden"
    setIsComposerStacked(element.value.includes("\n") || nextHeight > 44)
  }

  const handlePromptChange = (value: string) => {
    setPrompt(value)
    requestAnimationFrame(() => resizeTextarea())
  }

  const applyTemplateSelection = (template: TemplateOption, announce = true) => {
    setSelectedTemplate(template)
    setTemplateData(buildEditorData(template.theme, template))
    setThemeState(createThemeState(template))
    setDishOrder(["one", "two"])
    setEmailEntries([])
    setComposerMode("prompt")
    if (announce) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "bot", text: confirmedTemplateNotice(template.name), kind: "templateReview" },
      ])
    }
  }

  const clearConversationWorkspace = () => {
    setMessages([])
    setPrompt("")
    setSelectedTemplate(null)
    setTemplateData(null)
    setThemeState(null)
    setDishOrder(["one", "two"])
    setEmailEntries([])
    setComposerMode("prompt")
    setWorkflowState("INTENT_CAPTURE")
    setIsPreviewOpen(false)
    setIsEditorOpen(false)
  }

  const applySessionToUi = (session: ChatSessionSummary, options?: { injectSummaryMessage?: boolean }) => {
    setConversationId(session.conversationId)
    setWorkflowState(session.state || "INTENT_CAPTURE")
    setComposerMode(session.state === "AUDIENCE_COLLECTION" || session.state === "VALIDATION_REVIEW" ? "emails" : "prompt")

    if (session.selectedTemplateId) {
      const template = templateOptions.find((entry) => entry.id === session.selectedTemplateId)
      if (template) {
        applyTemplateSelection(template, false)
      }
    } else {
      setSelectedTemplate(null)
      setTemplateData(null)
      setThemeState(null)
    }

    if (options?.injectSummaryMessage) {
      const summary = session.summary?.trim()
      setMessages(
        summary
          ? [{ id: Date.now(), role: "bot", text: summary }]
          : [{ id: Date.now(), role: "bot", text: "Conversation loaded. Tell me what you want to do next." }],
      )
    }
  }

  useEffect(() => {
    resizeTextarea()
  }, [prompt])

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, isAiResponding, isCsvProcessing, emailEntries.length])

  useEffect(() => {
    if (initializedFromTemplateRef.current) return
    if (!templateParam) return
    const template = templateOptions.find((item) => item.id === templateParam)
    if (!template) return

    initializedFromTemplateRef.current = true
    applyTemplateSelection(template, false)
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "bot", text: selectedTemplateNotice(template.name), kind: "templateReview" },
    ])
  }, [templateParam])

  useEffect(() => {
    if (!conversationId) return
    try {
      window.sessionStorage.setItem("bm_ai_conversation_id", conversationId)
    } catch {
      // Ignore storage failures in private mode.
    }
  }, [conversationId])

  const loadSessionSnapshot = async (targetConversationId?: string | null) => {
    const query = targetConversationId ? `?conversationId=${encodeURIComponent(targetConversationId)}` : ""
    const response = await fetch(`/api/ai/session${query}`, {
      method: "GET",
      cache: "no-store",
    })
    if (!response.ok) return null

    const payload = (await response.json()) as {
      session?: ChatSessionSummary | null
    }

    return payload.session ?? null
  }

  const startNewConversation = async () => {
    if (isAiResponding) return
    const newConversationId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `conv-${Date.now().toString(36)}`

    const response = await fetch("/api/ai/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: newConversationId,
      }),
    })

    if (!response.ok) return
    const payload = (await response.json()) as {
      session?: ChatSessionSummary | null
    }
    clearConversationWorkspace()
    if (payload.session) {
      applySessionToUi(payload.session)
    } else {
      setConversationId(newConversationId)
    }
    router.replace("/chat")
  }

  useEffect(() => {
    let cancelled = false

    const hydrateSession = async () => {
      try {
        const fromStorage = window.sessionStorage.getItem("bm_ai_conversation_id")
        const preferredConversationId = conversationIdParam || fromStorage || null
        const shouldCreateNewChat = newChatParam === "1"

        if (shouldCreateNewChat) {
          await startNewConversation()
          return
        }

        let session: ChatSessionSummary | null = null
        if (!templateParam) {
          session = await loadSessionSnapshot(preferredConversationId)
          if (!session && preferredConversationId) {
            session = await loadSessionSnapshot(null)
          }
        } else {
          await loadSessionSnapshot(preferredConversationId)
        }

        if (session && !cancelled) {
          applySessionToUi(session)
        }
      } catch {
        // Ignore hydration failures.
      }
    }

    void hydrateSession()

    return () => {
      cancelled = true
    }
  }, [conversationIdParam, newChatParam, templateParam])

  const sendPrompt = async () => {
    const value = prompt.trim()
    if (!value) return
    if (isAiResponding) return
    if (isOutOfCredits) {
      const creditsMessage = isPaidPlan
        ? "You've used your monthly quota. It resets at the start of next month."
        : "You've used your monthly quota. Upgrade to Pro for a larger allowance."
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage?.role === "bot" && lastMessage.text === creditsMessage) return prev
        return [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            text: creditsMessage,
          },
        ]
      })
      return
    }

    if (composerMode === "emails") {
      const parsed = parseEmailEntries(value)

      if (!parsed.length) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            text: "No email addresses detected. Paste plain emails or a CSV containing an email column.",
          },
        ])
        setPrompt("")
        return
      }

      appendEmailEntries(parsed, `Added ${parsed.length} recipients`)
      setPrompt("")
      return
    }

    const userMessage: Message = { id: Date.now(), role: "user", text: value }
    const assistantMessageId = Date.now() + 1
    setMessages((prev) => [...prev, userMessage, { id: assistantMessageId, role: "bot", text: "" }])
    setPrompt("")

    const chosenModel = modelChoices.find((option) => option.id === selectedModelChoice) ?? modelChoices[0]
    const resolvedMode = !isPaidPlan && chosenModel.requiresPro ? "essential" : chosenModel.mode
    let activeConversationId = conversationId

    setIsAiResponding(true)
    try {
      const response = await fetch("/api/ai/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: value,
          conversationId: conversationId ?? undefined,
          mode: resolvedMode,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "AI request failed")
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("AI stream did not return a readable body.")
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let streamedText = ""
      let assistantKind: Message["kind"] | undefined
      let suggestionIds: string[] | undefined
      let pendingCampaignId: string | undefined
      let doneState: string | undefined

      const updateAssistant = (patch: Partial<Message>) => {
        setMessages((prev) =>
          prev.map((message) => (message.id === assistantMessageId ? { ...message, ...patch } : message)),
        )
      }

      while (true) {
        const { value: chunk, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(chunk, { stream: true })
        const frames = buffer.split("\n\n")
        buffer = frames.pop() ?? ""

        for (const frame of frames) {
          const lines = frame.split("\n").map((line) => line.trim())
          const dataLine = lines.find((line) => line.startsWith("data:"))
          if (!dataLine) continue

          let event: AiStreamEvent | null = null
          try {
            event = JSON.parse(dataLine.slice(5).trim()) as AiStreamEvent
          } catch {
            event = null
          }
          if (!event) continue

          if (event.type === "session") {
            activeConversationId = event.conversationId
            setConversationId(event.conversationId)
            setWorkflowState(event.state)
            continue
          }

          if (event.type === "state_patch") {
            setWorkflowState(event.state)
            if (event.state === "AUDIENCE_COLLECTION" || event.state === "VALIDATION_REVIEW") {
              setComposerMode("emails")
            }
            if (event.selectedTemplateId) {
              const template = templateOptions.find((entry) => entry.id === event.selectedTemplateId)
              if (template) {
                applyTemplateSelection(template, false)
                assistantKind = "templateReview"
              }
            }
            continue
          }

          if (event.type === "tool_result") {
            if (event.result.templateSuggestions?.length) {
              suggestionIds = event.result.templateSuggestions.map((template) => template.id)
              assistantKind = "suggestions"
            }
            if (event.result.campaignId) {
              pendingCampaignId = event.result.campaignId
            }
            continue
          }

          if (event.type === "token") {
            streamedText += event.token
            updateAssistant({
              text: streamedText,
              kind: assistantKind,
              templateSuggestionIds: suggestionIds,
              campaignId: pendingCampaignId,
            })
            continue
          }

          if (event.type === "moderation") {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 3,
                role: "bot",
                text: event.message,
              },
            ])
            continue
          }

          if (event.type === "done") {
            doneState = event.state
            activeConversationId = event.conversationId
            setConversationId(event.conversationId)
            setWorkflowState(event.state)

            if (event.selectedTemplateId) {
              const template = templateOptions.find((entry) => entry.id === event.selectedTemplateId)
              if (template) {
                applyTemplateSelection(template, false)
                assistantKind = "templateReview"
              }
            }

            if (event.templateSuggestions?.length) {
              suggestionIds = event.templateSuggestions.map((template) => template.id)
              assistantKind = "suggestions"
            }

            if (event.state === "AUDIENCE_COLLECTION") {
              setComposerMode("emails")
              assistantKind = assistantKind ?? "emailRequest"
            }

            if (event.state === "VALIDATION_REVIEW") {
              setComposerMode("emails")
              assistantKind = assistantKind ?? "validation"
            }

            pendingCampaignId = event.campaignId ?? pendingCampaignId
            streamedText = event.text || streamedText
            updateAssistant({
              text: streamedText || "Done.",
              kind: assistantKind,
              templateSuggestionIds: suggestionIds,
              campaignId: pendingCampaignId,
            })
            continue
          }

          if (event.type === "error") {
            throw new Error(event.error)
          }
        }
      }

      if (doneState === "QUEUED") {
        const campaignId = pendingCampaignId ?? `cmp-${Date.now().toString().slice(-8)}`
        const validAudience = computeValidationStats(emailEntries).valid
        router.push(
          `/campaigns?campaign=${campaignId}&template=${encodeURIComponent(
            selectedTemplate?.name ?? "Campaign",
          )}&audience=${validAudience}`,
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate an AI response."
      setMessages((prev) => {
        let replaced = false
        const next = prev.map((entry) => {
          if (entry.id !== assistantMessageId) return entry
          replaced = true
          return {
            ...entry,
            text: `AI error: ${message}`,
          }
        })
        if (replaced) return next
        return [
          ...next,
          {
            id: Date.now() + 2,
            role: "bot",
            text: `AI error: ${message}`,
          },
        ]
      })
    } finally {
      setIsAiResponding(false)
    }
  }

  const appendEmailEntries = (incoming: EmailEntry[], prefix: string) => {
    let mergedEntries: EmailEntry[] = []
    setEmailEntries((prev) => {
      mergedEntries = normalizeEmailEntries([...prev, ...incoming])
      return mergedEntries
    })

    const stats = computeValidationStats(mergedEntries)
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: `${prefix} (total ${mergedEntries.length})` },
      {
        id: Date.now() + 1,
        role: "bot",
        text: `Validation complete: ${stats.valid} valid, ${stats.invalid} invalid, ${stats.duplicates} duplicates.`,
        kind: "validation",
        validationStats: stats,
      },
    ])
  }

  const processCsvFile = async (file: File | null) => {
    if (!file || composerMode !== "emails") return

    setIsCsvProcessing(true)
    try {
      const csvText = await file.text()
      await new Promise((resolve) => window.setTimeout(resolve, 650))
      const parsed = parseEmailEntriesFromCsvText(csvText)

      if (!parsed.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "bot",
            text: `CSV error: ${parsed.error}`,
          },
        ])
        return
      }

      appendEmailEntries(parsed.entries, `CSV ${file.name} imported ${parsed.entries.length} recipients`)
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "bot",
          text: "Could not read CSV file. Please upload a valid .csv file.",
        },
      ])
    } finally {
      setIsCsvProcessing(false)
      if (csvFileInputRef.current) csvFileInputRef.current.value = ""
    }
  }

  const scrollToExistingSuggestions = () => {
    const container = containerRef.current
    if (!container) return false
    const suggestionNodes = container.querySelectorAll<HTMLElement>('[data-message-kind="suggestions"]')
    const lastSuggestion = suggestionNodes[suggestionNodes.length - 1]
    if (!lastSuggestion) return false
    lastSuggestion.scrollIntoView({ behavior: "smooth", block: "start" })
    return true
  }

  const requestEmails = () => {
    setComposerMode("emails")
    setMessages((prev) => {
      if (prev.some((item) => item.kind === "emailRequest")) return prev
      return [
        ...prev,
        {
          id: Date.now(),
          role: "bot",
          text: chatCopy.emailRequestIntro,
          kind: "emailRequest",
        },
      ]
    })
  }

  const updateEmailEntry = (id: string, nextValue: string) => {
    setEmailEntries((prev) => normalizeEmailEntries(prev.map((entry) => (entry.id === id ? { ...entry, value: nextValue } : entry))))
  }

  const removeEmailEntry = (id: string) => {
    setEmailEntries((prev) => normalizeEmailEntries(prev.filter((entry) => entry.id !== id)))
  }

  const confirmSendCampaign = () => {
    if (!selectedTemplate) return
    const stats = computeValidationStats(emailEntries)
    if (stats.valid === 0) return

    const campaignId = `cmp-${Date.now().toString().slice(-8)}`

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "bot",
        text: `Campaign queued. Opening campaigns workspace. Queue ID: ${campaignId}`,
      },
    ])
    setComposerMode("prompt")
    router.push(`/campaigns?campaign=${campaignId}&template=${encodeURIComponent(selectedTemplate.name)}&audience=${stats.valid}`)
  }

  const showHero = messages.length === 0 && workflowState === "INTENT_CAPTURE" && !isAiResponding
  const canUploadCsv = composerMode === "emails" && !isCsvProcessing && !isOutOfCredits

  const renderUploadButton = (disabled: boolean) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => csvFileInputRef.current?.click()}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none transition",
        !disabled ? "bg-zinc-950 text-zinc-100 hover:bg-zinc-900" : "cursor-not-allowed bg-zinc-950/55 text-zinc-600",
      )}
      aria-label="Upload CSV recipients"
    >
      +
    </button>
  )

  const renderModeSelector = () => {
    const activeChoice = modelChoices.find((c) => c.id === selectedModelChoice) ?? modelChoices[0]

    return (
      <div className="relative shrink-0">
        <select
          value={isPaidPlan ? selectedModelChoice : "essential"}
          onChange={(event) => {
            const nextId = event.target.value
            const nextChoice = modelChoices.find((choice) => choice.id === nextId)
            if (nextChoice?.requiresPro && !isPaidPlan) {
              setSelectedModelChoice("essential")
              return
            }
            setSelectedModelChoice(nextId)
          }}
          disabled={isOutOfCredits}
          className="h-9 max-w-[46vw] appearance-none rounded-full bg-zinc-950/80 pl-3.5 pr-10 text-[11px] font-medium text-zinc-200 outline-none transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-500 sm:max-w-[200px]"
          aria-label="AI model"
        >
          {modelChoices.map((choice) => {
            const locked = !isPaidPlan && choice.requiresPro
            return (
              <option key={choice.id} value={choice.id} disabled={locked} className="bg-zinc-950 text-zinc-100">
                {choice.label} · {choice.quotaMultiplier}x{locked ? " (Pro)" : ""}
              </option>
            )
          })}
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full bg-zinc-800/80 px-1.5 py-1">
          <span className="text-[10px] font-medium text-zinc-400">{activeChoice.quotaMultiplier}x</span>
          <ChevronDown className="h-3 w-3 text-zinc-400" />
        </span>
      </div>
    )
  }

  const renderUpgradeCta = () => {
    if (isPaidPlan) return null
    return (
      <Button
        type="button"
        onClick={() => router.push("/pricing")}
        className="h-9 shrink-0 rounded-full bg-zinc-100 px-4 text-xs font-semibold text-zinc-900 hover:bg-zinc-200"
      >
        {isOutOfCredits ? "Upgrade" : "Unlock Pro"}
      </Button>
    )
  }

  const composer = (
    <div
      className={cn(
        "rounded-[30px] bg-zinc-900/55 px-4 py-3 shadow-[0_18px_44px_-24px_rgba(0,0,0,0.9)] ring-1 ring-zinc-700/60 backdrop-blur-xl",
        showHero ? "w-full max-w-4xl" : "",
      )}
    >
      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => processCsvFile(event.target.files?.[0] ?? null)}
      />
      <div className={cn("flex gap-3 transition-all duration-300 ease-out", isComposerStacked ? "items-start" : "items-center")}>
        {!isComposerStacked ? renderUploadButton(!canUploadCsv) : null}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => handlePromptChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              sendPrompt()
            }
          }}
          placeholder={
            isOutOfCredits
              ? "Monthly quota used up. Resets next month."
              : composerMode === "emails"
                ? chatCopy.emailInputPlaceholder
                : chatCopy.promptPlaceholder
          }
          rows={1}
          disabled={isOutOfCredits}
          className="scrollbar-hide min-h-[28px] max-h-[132px] w-full resize-none bg-transparent py-2.5 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:text-zinc-500 md:text-[15px]"
        />
        {!isComposerStacked ? renderModeSelector() : null}
        {!isComposerStacked ? renderUpgradeCta() : null}
      </div>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isComposerStacked ? "mt-2 max-h-12 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {renderUploadButton(!canUploadCsv)}
            {renderModeSelector()}
          </div>
          {renderUpgradeCta()}
        </div>
      </div>
      {isOutOfCredits ? (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-zinc-950/70 px-3 py-2 text-xs">
          <span className="text-zinc-400">Monthly quota used up.</span>
          {!isPaidPlan ? (
            <button
              type="button"
              onClick={() => router.push("/pricing")}
              className="font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              Upgrade Plan
            </button>
          ) : (
            <span className="text-zinc-500">Resets next month</span>
          )}
        </div>
      ) : null}
    </div>
  )

  return (
    <WorkspaceShell tab="chat" pageTitle="Chat" user={initialUser}>
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden" data-workflow-state={workflowState}>
        {showHero ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
            <h1 className="text-center text-3xl font-medium text-zinc-100 md:text-5xl">{chatHeroTitle}</h1>
            <p className="mt-4 max-w-2xl text-center text-sm text-zinc-400 md:text-base">{chatHeroSubtitle}</p>
            <div className="mt-8 w-full max-w-4xl">{composer}</div>
          </div>
        ) : (
          <>
            <div data-workspace-scroll className="scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-6 md:py-6" ref={containerRef}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  data-message-kind={message.kind ?? "plain"}
                  className={cn(
                    "animate-in fade-in slide-in-from-bottom-1 duration-300 flex",
                    message.role === "bot" ? "justify-start" : "justify-end",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[96%] rounded-2xl px-3.5 py-3 text-sm",
                      message.role === "bot" ? "bg-zinc-900/80 text-zinc-100" : "bg-sky-500/20 text-sky-100",
                    )}
                  >
                    {message.role === "bot" ? <AnimatedBotText text={message.text} /> : <p className="leading-relaxed">{message.text}</p>}

                    {message.kind === "suggestions" ? (
                      <div className="mt-3">
                        <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2 pr-1">
                          {(message.templateSuggestionIds?.length
                            ? message.templateSuggestionIds
                                .map((id) => templateOptions.find((template) => template.id === id))
                                .filter((template): template is TemplateOption => Boolean(template))
                            : templateOptions
                          )
                            .filter((template) => isPaidPlan || template.accessTier !== "pro")
                            .map((template) => {
                            const selected = selectedTemplate?.id === template.id
                            return (
                              <TemplateSuggestionCard
                                key={template.id}
                                template={template}
                                selected={selected}
                                onPreview={() => {
                                  applyTemplateSelection(template, false)
                                  setPreviewViewport("desktop")
                                  setIsPreviewOpen(true)
                                }}
                                onSelect={() => applyTemplateSelection(template, true)}
                              />
                            )
                          })}
                        </div>
                      </div>
                    ) : null}

                    {message.kind === "templateReview" && selectedTemplate && templateData ? (
                      <div className="mt-3">
                        <SelectedTemplateReviewCard
                          template={selectedTemplate}
                          data={templateData}
                          onEdit={() => {
                            setEditorViewport("desktop")
                            setIsEditorOpen(true)
                          }}
                          onChange={() => {
                            setSelectedTemplate(null)
                            setTemplateData(null)
                            setThemeState(null)
                            setEmailEntries([])
                            setComposerMode("prompt")
                            const hasSuggestions = messages.some((entry) => entry.kind === "suggestions")
                            if (!hasSuggestions) {
                              setMessages((prev) => [
                                ...prev,
                                {
                                  id: Date.now(),
                                  role: "bot",
                                  text: "No problem. Pick another template below.",
                                  kind: "suggestions",
                                },
                              ])
                              return
                            }
                            window.setTimeout(() => {
                              scrollToExistingSuggestions()
                            }, 60)
                          }}
                          onContinue={requestEmails}
                        />
                      </div>
                    ) : null}

                    {message.kind === "emailRequest" ? (
                      <p className="mt-3 text-xs text-zinc-400">Use + to upload CSV, or paste emails directly in chat input and press Enter.</p>
                    ) : null}

                    {message.kind === "validation" ? (
                      <EmailValidationPanel
                        entries={emailEntries}
                        onEditEntry={updateEmailEntry}
                        onRemoveEntry={removeEmailEntry}
                        onConfirmSend={confirmSendCampaign}
                      />
                    ) : null}
                  </div>
                </div>
              ))}

              {isCsvProcessing ? <CsvSheetSkeleton /> : null}
              {isAiResponding ? <AssistantSignal /> : null}
            </div>

            <div className="p-3 pt-0 md:p-4 md:pt-0">{composer}</div>
          </>
        )}
      </div>

      {isPreviewOpen && selectedTemplate && templateData && themeState ? (
        <TemplatePreviewModal
          template={selectedTemplate}
          data={templateData}
          theme={themeState}
          dishOrder={dishOrder}
          viewport={previewViewport}
          onViewportChange={setPreviewViewport}
          onClose={() => setIsPreviewOpen(false)}
        />
      ) : null}

      {isEditorOpen && selectedTemplate && templateData && themeState ? (
        <TemplateEditorModal
          template={selectedTemplate}
          data={templateData}
          onDataChange={(field, value) => setTemplateData((prev) => (prev ? { ...prev, [field]: value } : prev))}
          theme={themeState}
          onThemeChange={(patch) => setThemeState((prev) => (prev ? { ...prev, ...patch } : prev))}
          dishOrder={dishOrder}
          onSwapDish={(source, target) => {
            setDishOrder((prev) => {
              const sourceIndex = prev.indexOf(source)
              const targetIndex = prev.indexOf(target)
              if (sourceIndex < 0 || targetIndex < 0) return prev
              const next = [...prev]
              ;[next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]]
              return next
            })
          }}
          viewport={editorViewport}
          onViewportChange={setEditorViewport}
          onClose={() => setIsEditorOpen(false)}
        />
      ) : null}
    </WorkspaceShell>
  )
}
