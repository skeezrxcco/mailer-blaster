"use client"

import { type ChangeEvent, useRef, useState } from "react"
import { Check, Pencil, Plus, Trash2, Upload, X } from "lucide-react"

import { contactsPageCopy, initialContacts, type ContactRecord } from "@/app/contacts/contacts-page.data"
import { WorkspaceShell } from "@/components/shared/workspace/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type SessionUserSummary } from "@/types/session-user"

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

function createContact(name: string, email: string, source: "import" | "manual"): ContactRecord {
  return {
    id: `ct-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    name: name.trim() || "Contact",
    email: email.trim().toLowerCase(),
    source,
    status: "subscribed",
    addedAt: new Date().toISOString().slice(0, 10),
  }
}

export function ContactsPageClient({ initialUser }: { initialUser: SessionUserSummary }) {
  const csvInputRef = useRef<HTMLInputElement | null>(null)

  const [contacts, setContacts] = useState<ContactRecord[]>(initialContacts)
  const [contactQuery, setContactQuery] = useState("")

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<"csv" | "manual">("csv")
  const [modalError, setModalError] = useState("")

  const [pendingCsvFile, setPendingCsvFile] = useState<File | null>(null)
  const [pendingCsvName, setPendingCsvName] = useState("")

  const [manualName, setManualName] = useState("")
  const [manualEmail, setManualEmail] = useState("")

  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingEmail, setEditingEmail] = useState("")
  const [editingError, setEditingError] = useState("")

  const resetAddModal = () => {
    setModalError("")
    setPendingCsvFile(null)
    setPendingCsvName("")
    setManualName("")
    setManualEmail("")
    setModalTab("csv")
  }

  const onOpenAddModalChange = (next: boolean) => {
    setIsAddModalOpen(next)
    if (!next) resetAddModal()
  }

  const addManualContact = () => {
    const normalizedEmail = manualEmail.trim().toLowerCase()
    const normalizedName = manualName.trim() || "Contact"

    if (!looksLikeEmail(normalizedEmail)) {
      setModalError("Please provide a valid email address.")
      return
    }

    if (contacts.some((contact) => contact.email.toLowerCase() === normalizedEmail)) {
      setModalError("This email already exists in your contact list.")
      return
    }

    setContacts((prev) => [createContact(normalizedName, normalizedEmail, "manual"), ...prev])
    onOpenAddModalChange(false)
  }

  const onSelectCsvFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setModalError("")
    setPendingCsvFile(file)
    setPendingCsvName(file?.name ?? "")
    event.currentTarget.value = ""
  }

  const importCsvContacts = async () => {
    if (!pendingCsvFile) {
      setModalError("Choose a CSV file first.")
      return
    }

    const text = await pendingCsvFile.text()
    const rows = parseContactsCsv(text)
    if (!rows.length) {
      setModalError("Could not find valid rows in this CSV file.")
      return
    }

    const seen = new Set(contacts.map((contact) => contact.email.toLowerCase()))
    const additions: ContactRecord[] = []

    for (const row of rows) {
      const normalizedEmail = row.email.trim().toLowerCase()
      if (!looksLikeEmail(normalizedEmail)) continue
      if (seen.has(normalizedEmail)) continue
      seen.add(normalizedEmail)
      additions.push(createContact(row.name, normalizedEmail, "import"))
    }

    if (!additions.length) {
      setModalError("No new contacts to import. All rows were invalid or duplicates.")
      return
    }

    setContacts((prev) => [...additions, ...prev])
    onOpenAddModalChange(false)
  }

  const removeContact = (id: string) => {
    setContacts((prev) => prev.filter((contact) => contact.id !== id))
    if (editingContactId === id) {
      setEditingContactId(null)
      setEditingError("")
      setEditingName("")
      setEditingEmail("")
    }
  }

  const startEditingContact = (contact: ContactRecord) => {
    setEditingContactId(contact.id)
    setEditingName(contact.name)
    setEditingEmail(contact.email)
    setEditingError("")
  }

  const cancelEditingContact = () => {
    setEditingContactId(null)
    setEditingName("")
    setEditingEmail("")
    setEditingError("")
  }

  const saveEditingContact = (id: string) => {
    const normalizedName = editingName.trim() || "Contact"
    const normalizedEmail = editingEmail.trim().toLowerCase()

    if (!looksLikeEmail(normalizedEmail)) {
      setEditingError("Enter a valid email address.")
      return
    }

    const duplicate = contacts.some((contact) => contact.id !== id && contact.email.toLowerCase() === normalizedEmail)
    if (duplicate) {
      setEditingError("Another contact already uses this email.")
      return
    }

    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === id
          ? {
              ...contact,
              name: normalizedName,
              email: normalizedEmail,
            }
          : contact,
      ),
    )
    cancelEditingContact()
  }

  const filteredContacts = contacts.filter(
    (contact) =>
      !contactQuery.trim() ||
      contact.email.toLowerCase().includes(contactQuery.toLowerCase()) ||
      contact.name.toLowerCase().includes(contactQuery.toLowerCase()),
  )

  return (
    <WorkspaceShell tab="contacts" pageTitle={contactsPageCopy.title} user={initialUser}>
      <div data-workspace-scroll className="scrollbar-hide min-h-0 h-full overflow-y-auto p-4 md:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">{contactsPageCopy.title}</h2>
          <p className="text-sm text-zinc-400">{contactsPageCopy.subtitle}</p>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button className="h-10 rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add contacts
          </Button>
          <Input
            value={contactQuery}
            onChange={(event) => setContactQuery(event.target.value)}
            placeholder="Search contact..."
            className="h-10 w-full max-w-sm border-zinc-700 bg-zinc-900 text-zinc-100"
          />
        </div>

        <Card className="rounded-2xl border-zinc-700/80 bg-zinc-950/80">
          <CardHeader>
            <CardTitle className="text-zinc-100">Contact list</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-300">Name</TableHead>
                  <TableHead className="text-zinc-300">Email</TableHead>
                  <TableHead className="text-zinc-300">Added</TableHead>
                  <TableHead className="text-right text-zinc-300">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => {
                  const isEditing = editingContactId === contact.id
                  return (
                    <TableRow key={contact.id} className="border-zinc-900 hover:bg-zinc-900/60">
                      <TableCell className="text-zinc-200">
                        {isEditing ? (
                          <Input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="h-8 border-zinc-700 bg-zinc-900 text-zinc-100"
                          />
                        ) : (
                          contact.name
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {isEditing ? (
                          <Input
                            value={editingEmail}
                            onChange={(event) => setEditingEmail(event.target.value)}
                            className="h-8 border-zinc-700 bg-zinc-900 text-zinc-100"
                          />
                        ) : (
                          contact.email
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-400">{contact.addedAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full text-emerald-300 hover:bg-zinc-800 hover:text-emerald-200"
                                onClick={() => saveEditingContact(contact.id)}
                                aria-label="Save contact"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                                onClick={cancelEditingContact}
                                aria-label="Cancel edit"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                                onClick={() => startEditingContact(contact)}
                                aria-label="Edit contact"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                                onClick={() => removeContact(contact.id)}
                                aria-label="Delete contact"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {editingError ? <p className="mt-2 text-xs text-rose-300">{editingError}</p> : null}
          </CardContent>
        </Card>

        <Dialog open={isAddModalOpen} onOpenChange={onOpenAddModalChange}>
          <DialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
            <DialogHeader>
              <DialogTitle>Add contacts</DialogTitle>
              <DialogDescription>Choose how to add contacts to your list.</DialogDescription>
            </DialogHeader>

            <Tabs value={modalTab} onValueChange={(value) => setModalTab(value as "csv" | "manual")}>
              <TabsList className="bg-zinc-900">
                <TabsTrigger value="csv" className="data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900">
                  Upload CSV
                </TabsTrigger>
                <TabsTrigger value="manual" className="data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-900">
                  Add manually
                </TabsTrigger>
              </TabsList>

              <TabsContent value="csv" className="space-y-3">
                <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onSelectCsvFile} />
                <Button
                  type="button"
                  className="w-full rounded-xl bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <Upload className="mr-1 h-4 w-4" />
                  Choose CSV file
                </Button>
                {pendingCsvName ? <p className="text-xs text-zinc-400">Selected: {pendingCsvName}</p> : <p className="text-xs text-zinc-500">No file selected.</p>}
                <Button
                  type="button"
                  className="w-full rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400"
                  onClick={importCsvContacts}
                  disabled={!pendingCsvFile}
                >
                  Import contacts
                </Button>
              </TabsContent>

              <TabsContent value="manual" className="space-y-3">
                <Input
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  placeholder="Full name"
                  className="h-10 border-zinc-700 bg-zinc-900 text-zinc-100"
                />
                <Input
                  value={manualEmail}
                  onChange={(event) => setManualEmail(event.target.value)}
                  placeholder="email@domain.com"
                  className="h-10 border-zinc-700 bg-zinc-900 text-zinc-100"
                />
                <Button type="button" className="w-full rounded-xl bg-sky-500 text-zinc-950 hover:bg-sky-400" onClick={addManualContact}>
                  Add contact
                </Button>
              </TabsContent>
            </Tabs>

            {modalError ? <p className="text-xs text-rose-300">{modalError}</p> : null}
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceShell>
  )
}
