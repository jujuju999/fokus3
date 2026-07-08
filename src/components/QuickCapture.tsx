import { useState } from 'react'

interface Props {
  onAdd: (title: string) => void
}

export default function QuickCapture({ onAdd }: Props) {
  const [title, setTitle] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onAdd(title)
    setTitle('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Was hast du im Kopf?"
        aria-label="Neue Aufgabe erfassen"
        autoFocus
        enterKeyHint="done"
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </form>
  )
}
