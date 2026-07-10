import type { ReactNode } from 'react'

interface Props {
  title: string
  done?: boolean
  actions?: ReactNode
}

export default function TaskItem({ title, done = false, actions }: Props) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <span
        className={`min-w-0 flex-1 break-words text-base ${
          done ? 'text-neutral-400 line-through' : 'text-neutral-900'
        }`}
      >
        {title}
      </span>
      {actions && <span className="flex shrink-0 items-center gap-1">{actions}</span>}
    </li>
  )
}
