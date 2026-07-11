import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { formatEstimate } from '../lib/tasks'

interface Props {
  title: string
  estimatedMinutes?: number | null
  done?: boolean
  actions?: ReactNode
}

/**
 * Task card with the spec'd micro-interactions: spring entrance (scale-up
 * when appearing, e.g. after pulling into "Heute"), shrink-and-fade exit
 * when checked off. Parents must wrap lists in <AnimatePresence>.
 */
export default function TaskItem({ title, estimatedMinutes, done = false, actions }: Props) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="flex items-center gap-3 rounded-2xl border border-edge bg-card px-4 py-3"
    >
      <span
        className={`min-w-0 flex-1 break-words text-[15px] ${
          done ? 'text-accent/70 line-through' : 'text-ink'
        }`}
      >
        {title}
        {estimatedMinutes ? (
          <span className="ml-2 whitespace-nowrap text-xs text-ink-3">
            {formatEstimate(estimatedMinutes)}
          </span>
        ) : null}
      </span>
      {actions && <span className="flex shrink-0 items-center gap-1">{actions}</span>}
    </motion.li>
  )
}
