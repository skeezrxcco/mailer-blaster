"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { contactsPageCopy, initialContacts, type ContactRecord } from "@/app/contacts/contacts-page.data"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { Plus, Trash2, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function parseContactsCsv(raw: string): Array<Pick<ContactRecord, "name" | "email">> {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return []

  const rows = lines.map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")))
  const headerLooksLikeHeader = rows[0]?.some((cell) => /email|name/i.test(cell))
  const dataRows = headerLooksLikeHeader ? rows.slice(1) : rows

  return dataRows
    .map((cells) => {
      const email = cells.find((cell) => looksLikeEmail(cell)) || ""
      const name = cells.find((cell) => cell && cell !== email) || "Contact"
      return { name, email }
    })
    .filter((row) => row.email)
}

export function ContactsPageClient() {
  const [contacts, setContacts] = useState<ContactRecord[]>(initialContacts)
  const [contactNameInput, setContactNameInput] = useState("")
  const [contactEmailInput, setContactEmailInput] = useState("")
  const [contactQuery, setContactQuery] = useState("")

  const addContact = (name: string, email: string, source: "import" | "manual") => {
    if (!looksLikeEmail(email)) return
    const normalized = email.trim().toLowerCase()
    setContacts((prev) => {
      if (prev.some((contact) => contact.email.toLowerCase() === normalized)) return prev
      return [
        {
          id: `ct-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          name: name.trim() || "Contact",
          email: normalized,
          source,
          status: "subscribed",
          addedAt: new Date().toISOString().slice(0, 10),
        },
        ...prev,
      ]
    })
  }

  const removeContact = (id: string) => {
    setContacts((prev) => prev.filter((contact) => contact.id !== id))
  }

  const onContactsCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const rows = parseContactsCsv(text)
    rows.forEach((row) => addContact(row.name, row.email, "import"))
    event.currentTarget.value = ""
  }

  const filteredContacts = contacts.filter(
    (contact) =>
      !contactQuery.trim() ||
      contact.email.toLowerCase().includes(contactQuery.toLowerCase()) ||
      contact.name.toLowerCase().includes(contactQuery.toLowerCase()),
  )

  return (
    <WorkspaceShell tab="contacts" pageTitle={contactsPageCopy.title}>
      <div data-workspace-scroll className="scrollbar-hide min-h-0 h-full overflow-y-auto p-4 md:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">{contactsPageCopy.title}</h2>
          <p className="text-sm text-zinc-400">{contactsPageCopy.subtitle}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-zinc-100">Total contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-zinc-100">{contacts.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-zinc-100">Subscribed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-emerald-300">{contacts.filter((contact) => contact.status === "subscribed").length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-zinc-100">Unsubscribed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-amber-300">{contacts.filter((contact) => contact.status === "unsubscribed").length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4 rounded-2xl border-zinc-700/80 bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="text-zinc-100">Manage contacts</CardTitle>
            <CardDescription>Import CSV or add contacts manually.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Input value={contactNameInput} onChange={(event) => setContactNameInput(event.target.value)} placeholder="Full name" className="h-10 border-zinc-700 bg-zinc-900 text-zinc-100" />
              <Input value={contactEmailInput} onChange={(event) => setContactEmailInput(event.target.value)} placeholder="email@domain.com" className="h-10 border-zinc-700 bg-zinc-900 text-zinc-100" />
              <Button
                className="h-10 rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400"
                onClick={() => {
                  addContact(contactNameInput, contactEmailInput, "manual")
                  setContactNameInput("")
                  setContactEmailInput("")
                }}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800">
                <Upload className="h-4 w-4" />
                Upload CSV
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={onContactsCsvUpload} />
              </label>
              <Input value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} placeholder="Search contact..." className="h-10 max-w-xs border-zinc-700 bg-zinc-900 text-zinc-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4 rounded-2xl border-zinc-700/80 bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="text-zinc-100">Contact list</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-300">Name</TableHead>
                  <TableHead className="text-zinc-300">Email</TableHead>
                  <TableHead className="text-zinc-300">Source</TableHead>
                  <TableHead className="text-zinc-300">Status</TableHead>
                  <TableHead className="text-zinc-300">Added</TableHead>
                  <TableHead className="text-right text-zinc-300">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id} className="border-zinc-900 hover:bg-zinc-900/60">
                    <TableCell className="text-zinc-200">{contact.name}</TableCell>
                    <TableCell className="text-zinc-300">{contact.email}</TableCell>
                    <TableCell className="text-zinc-400">{contact.source}</TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs", contact.status === "subscribed" ? "bg-emerald-400/20 text-emerald-200" : "bg-amber-400/20 text-amber-200")}>
                        {contact.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-400">{contact.addedAt}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" className="rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={() => removeContact(contact.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </WorkspaceShell>
  )
}
