import type React from "react"
import type { Metadata } from "next"
import MeshGradient from "@/components/mesh-gradient"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "Blastermailer",
  description: "AI-powered email campaign creation and orchestration",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <MeshGradient />
        {children}
        <Toaster position="bottom-left" theme="dark" richColors closeButton={false} duration={4000} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
