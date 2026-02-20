"use client"

import { useRouter } from "next/navigation"
import { type DragEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { ArrowUpDown, Monitor, Pencil, Search, Smartphone, Sparkles, TabletSmartphone, Upload } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TemplatePreview } from "@/components/shared/newsletter/template-preview"
import {
  buildEditorData,
  templateOptions,
  type TemplateEditorData,
  type TemplateOption,
} from "@/components/shared/newsletter/template-data"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { useCheckoutItem } from "@/hooks/use-checkout-item"
import { useMyTemplates } from "@/hooks/use-my-templates"
import { cn } from "@/lib/utils"

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

type EditorChatMessage = {
  id: number
  role: "assistant" | "user"
  text: string
}

const viewportSpecs: Record<PreviewMode, { label: string; width: number; height: number }> = {
  desktop: { label: "Desktop", width: 1280, height: 900 },
  tablet: { label: "Tablet", width: 834, height: 1112 },
  mobile: { label: "Mobile", width: 390, height: 844 },
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

function ViewportSwitch({ mode, onChange }: { mode: PreviewMode; onChange: (mode: PreviewMode) => void }) {
  const options: Array<{ id: PreviewMode; icon: ReactNode }> = [
    { id: "desktop", icon: <Monitor className="h-4 w-4" /> },
    { id: "tablet", icon: <TabletSmartphone className="h-4 w-4" /> },
    { id: "mobile", icon: <Smartphone className="h-4 w-4" /> },
  ]

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-zinc-950/85 p-1">
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
            <button
              type="button"
              className="mt-4 inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: theme.ctaBg, color: theme.ctaText }}
            >
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
  onPrimaryAction,
}: {
  template: TemplateOption
  data: TemplateEditorData
  theme: EditorThemeState
  dishOrder: DishKey[]
  viewport: PreviewMode
  onViewportChange: (mode: PreviewMode) => void
  onClose: () => void
  onPrimaryAction: () => void
}) {
  const ctaLabel = template.priceUsd ? `Buy template - $${template.priceUsd}` : "Select template"

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full flex-col p-2 md:p-4" onClick={(event) => event.stopPropagation()}>
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <ViewportSwitch mode={viewport} onChange={onViewportChange} />
          <Button
            size="icon"
            onClick={onClose}
            className="size-10 rounded-full bg-zinc-950/80 p-0 text-zinc-100 hover:bg-zinc-900"
            aria-label="Close preview"
          >
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

        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-4">
          <Button
            type="button"
            onClick={onPrimaryAction}
            className={cn(
              "pointer-events-auto h-11 min-w-[220px] rounded-full px-6",
              template.priceUsd ? "bg-emerald-400 text-zinc-950 hover:bg-emerald-300" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
            )}
          >
            {ctaLabel}
          </Button>
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
      updates.push([
        "subheadline",
        "A refined seasonal experience crafted for guests who value precision, quality, and chef-led storytelling.",
      ])
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
            <Button
              size="icon"
              onClick={onClose}
              className="size-10 rounded-full bg-zinc-900 p-0 text-zinc-100 hover:bg-zinc-800"
              aria-label="Close editor"
            >
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
                  placeholder="Generate with AI prompt (e.g. burger macro shot)"
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

function TemplateLibraryCard({
  template,
  onPreview,
}: {
  template: TemplateOption
  onPreview: () => void
}) {
  const [cardHovered, setCardHovered] = useState(false)
  const priceLabel = template.priceUsd ? `$${template.priceUsd}` : "Free"
  const badgeClassName =
    template.libraryLabel === "DISCOUNT"
      ? "bg-emerald-400/20 text-emerald-200"
      : template.libraryLabel === "REDUCED"
        ? "bg-amber-400/20 text-amber-200"
        : "bg-sky-400/20 text-sky-100"

  return (
    <Card
      className="h-[352px] cursor-pointer rounded-[24px] border-0 bg-transparent p-0 shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45"
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      onClick={onPreview}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onPreview()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <CardContent className="relative flex h-full flex-col gap-3 rounded-[24px] bg-zinc-950/40 p-4">
        {template.libraryLabel ? (
          <span className={`absolute right-4 top-4 inline-flex rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${badgeClassName}`}>
            {template.libraryLabel}
          </span>
        ) : null}

        <TemplatePreview
          template={template}
          data={buildEditorData(template.theme, template)}
          heightClass="h-[236px]"
          scale={0.24}
          autoScroll={cardHovered}
        />

        <div className="mt-auto space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-semibold text-zinc-100">{template.name}</p>
            <Badge className="rounded-full bg-zinc-900/70 text-zinc-200">{priceLabel}</Badge>
          </div>
          <span className="inline-flex rounded-full bg-zinc-900/65 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-300">{template.domain}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function TemplatesPageClient() {
  const router = useRouter()
  const { setCheckoutItem } = useCheckoutItem()
  const { myTemplateIds, addTemplateId } = useMyTemplates()

  const [activeTemplate, setActiveTemplate] = useState<TemplateOption | null>(null)
  const [templateData, setTemplateData] = useState<TemplateEditorData | null>(null)
  const [themeState, setThemeState] = useState<EditorThemeState | null>(null)
  const [dishOrder, setDishOrder] = useState<DishKey[]>(["one", "two"])
  const [previewViewport, setPreviewViewport] = useState<PreviewMode>("desktop")
  const [editorViewport, setEditorViewport] = useState<PreviewMode>("desktop")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [domainFilter, setDomainFilter] = useState("all")
  const [priceFilter, setPriceFilter] = useState("all")
  const [sortBy, setSortBy] = useState("featured")
  const [libraryTab, setLibraryTab] = useState<"marketplace" | "myTemplates">("marketplace")

  const availableDomains = useMemo(() => {
    return Array.from(new Set(templateOptions.map((template) => template.domain))).sort((a, b) => a.localeCompare(b))
  }, [])
  const myTemplateIdSet = useMemo(() => new Set(myTemplateIds), [myTemplateIds])
  const myTemplatesCount = useMemo(() => templateOptions.filter((template) => myTemplateIdSet.has(template.id)).length, [myTemplateIdSet])

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase()

    const filtered = templateOptions.filter((template) => {
      const matchesSearch =
        !normalizedSearch ||
        template.name.toLowerCase().includes(normalizedSearch) ||
        template.theme.toLowerCase().includes(normalizedSearch) ||
        template.domain.toLowerCase().includes(normalizedSearch) ||
        template.description.toLowerCase().includes(normalizedSearch)

      const matchesDomain = domainFilter === "all" || template.domain === domainFilter
      const matchesPrice =
        priceFilter === "all" ||
        (priceFilter === "free" && !template.priceUsd) ||
        (priceFilter === "paid" && Boolean(template.priceUsd))

      return matchesSearch && matchesDomain && matchesPrice
    })

    if (sortBy === "name") {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    }
    if (sortBy === "price-low") {
      return [...filtered].sort((a, b) => (a.priceUsd ?? 0) - (b.priceUsd ?? 0))
    }
    if (sortBy === "price-high") {
      return [...filtered].sort((a, b) => (b.priceUsd ?? 0) - (a.priceUsd ?? 0))
    }
    return filtered
  }, [domainFilter, priceFilter, searchValue, sortBy])
  const visibleTemplates = useMemo(() => {
    if (libraryTab === "marketplace") return filteredTemplates
    return filteredTemplates.filter((template) => myTemplateIdSet.has(template.id))
  }, [filteredTemplates, libraryTab, myTemplateIdSet])

  const hydrateTemplate = (template: TemplateOption) => {
    setActiveTemplate(template)
    setTemplateData(buildEditorData(template.theme, template))
    setThemeState(createThemeState(template))
    setDishOrder(["one", "two"])
  }

  const openPreview = (template: TemplateOption) => {
    hydrateTemplate(template)
    setPreviewViewport("desktop")
    setIsPreviewOpen(true)
  }

  const selectTemplate = (template: TemplateOption) => {
    addTemplateId(template.id)
    setIsPreviewOpen(false)
    router.push(`/chat?template=${template.id}`)
  }

  const buyTemplate = (template: TemplateOption) => {
    if (!template.priceUsd) {
      selectTemplate(template)
      return
    }

    addTemplateId(template.id)
    setCheckoutItem({
      id: `tpl-${template.id}`,
      kind: "template",
      name: template.name,
      description: "Template license purchase",
      price: template.priceUsd,
      billing: "one-time",
    })
    setIsPreviewOpen(false)
    router.push("/checkout")
  }

  return (
    <WorkspaceShell tab="templates" pageTitle="Template library">
      <div data-workspace-scroll className="scrollbar-hide h-full min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-zinc-100">Template library</h2>
          <p className="text-sm text-zinc-400">Browse minimal template options, then open preview.</p>
        </div>

        <div className="mb-4 inline-flex items-center gap-1 rounded-xl bg-zinc-900/70 p-1">
          <button
            type="button"
            onClick={() => setLibraryTab("marketplace")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition",
              libraryTab === "marketplace" ? "bg-zinc-100 text-zinc-900" : "text-zinc-300 hover:bg-zinc-800/80",
            )}
          >
            Marketplace
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", libraryTab === "marketplace" ? "bg-zinc-900/10" : "bg-zinc-800 text-zinc-300")}>
              {templateOptions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setLibraryTab("myTemplates")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition",
              libraryTab === "myTemplates" ? "bg-zinc-100 text-zinc-900" : "text-zinc-300 hover:bg-zinc-800/80",
            )}
          >
            My Templates
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", libraryTab === "myTemplates" ? "bg-zinc-900/10" : "bg-zinc-800 text-zinc-300")}>
              {myTemplatesCount}
            </span>
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <label className="flex w-full items-center gap-2 rounded-xl bg-zinc-900/70 px-3 py-2.5">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search templates..."
              className="h-8 w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex w-fit items-center gap-2 rounded-xl bg-zinc-900/70 px-3 py-2 sm:max-w-[190px]">
              <ArrowUpDown className="h-4 w-4 text-zinc-400" />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-8 w-[132px] bg-transparent text-sm text-zinc-100 outline-none">
                <option value="featured" className="bg-zinc-950 text-zinc-100">
                  Featured
                </option>
                <option value="name" className="bg-zinc-950 text-zinc-100">
                  Name A-Z
                </option>
                <option value="price-low" className="bg-zinc-950 text-zinc-100">
                  Price low-high
                </option>
                <option value="price-high" className="bg-zinc-950 text-zinc-100">
                  Price high-low
                </option>
              </select>
            </label>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <label className="inline-flex w-fit items-center gap-2 rounded-xl bg-zinc-900/70 px-3 py-2">
                <span className="text-xs text-zinc-400">Domain</span>
                <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)} className="h-8 w-[122px] bg-transparent text-sm text-zinc-100 outline-none">
                  <option value="all" className="bg-zinc-950 text-zinc-100">
                    All
                  </option>
                  {availableDomains.map((domain) => (
                    <option key={domain} value={domain} className="bg-zinc-950 text-zinc-100">
                      {domain}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inline-flex w-fit items-center gap-2 rounded-xl bg-zinc-900/70 px-3 py-2">
                <span className="text-xs text-zinc-400">Price</span>
                <select value={priceFilter} onChange={(event) => setPriceFilter(event.target.value)} className="h-8 w-[96px] bg-transparent text-sm text-zinc-100 outline-none">
                  <option value="all" className="bg-zinc-950 text-zinc-100">
                    All
                  </option>
                  <option value="free" className="bg-zinc-950 text-zinc-100">
                    Free
                  </option>
                  <option value="paid" className="bg-zinc-950 text-zinc-100">
                    Paid
                  </option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleTemplates.map((template) => (
            <TemplateLibraryCard
              key={template.id}
              template={template}
              onPreview={() => openPreview(template)}
            />
          ))}
        </div>
        {!visibleTemplates.length && libraryTab === "marketplace" ? <p className="mt-6 text-sm text-zinc-400">No templates match your current filters.</p> : null}
        {!visibleTemplates.length && libraryTab === "myTemplates" ? (
          <p className="mt-6 text-sm text-zinc-400">No templates in your library yet. Select or buy one from marketplace.</p>
        ) : null}
      </div>

      {isPreviewOpen && activeTemplate && templateData && themeState ? (
        <TemplatePreviewModal
          template={activeTemplate}
          data={templateData}
          theme={themeState}
          dishOrder={dishOrder}
          viewport={previewViewport}
          onViewportChange={setPreviewViewport}
          onClose={() => setIsPreviewOpen(false)}
          onPrimaryAction={() => {
            if (!activeTemplate) return
            if (activeTemplate.priceUsd) {
              buyTemplate(activeTemplate)
              return
            }
            selectTemplate(activeTemplate)
          }}
        />
      ) : null}

      {isEditorOpen && activeTemplate && templateData && themeState ? (
        <TemplateEditorModal
          template={activeTemplate}
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
