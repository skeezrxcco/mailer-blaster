"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type VerificationCodeInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  invalid?: boolean
  className?: string
}

export function VerificationCodeInput({
  value,
  onChange,
  placeholder = "6-digit code",
  disabled,
  autoFocus,
  invalid,
  className,
}: VerificationCodeInputProps) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
      placeholder={placeholder}
      autoComplete="one-time-code"
      inputMode="numeric"
      maxLength={6}
      autoFocus={autoFocus}
      disabled={disabled}
      className={cn(
        "h-12 border-zinc-700 bg-zinc-900 text-center text-base tracking-[0.08em] text-zinc-100 placeholder:text-zinc-500",
        invalid ? "border-rose-400/70 focus-visible:ring-rose-400/40" : "",
        className,
      )}
    />
  )
}
