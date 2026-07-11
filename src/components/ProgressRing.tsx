import { motion } from 'framer-motion'

const R = 42
const CIRCUMFERENCE = 2 * Math.PI * R

interface Props {
  /** Completed today, 0–3. */
  done: number
}

/** Ring above "Heute": fills in accent as tasks get checked off. */
export default function ProgressRing({ done }: Props) {
  const progress = Math.min(done, 3) / 3
  return (
    <motion.div
      className="relative mx-auto h-28 w-28"
      // short pulse when the day is complete
      animate={done >= 3 ? { scale: [1, 1.07, 1] } : { scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-edge)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={false}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-metric text-2xl font-bold text-ink">{Math.min(done, 3)}/3</span>
      </div>
    </motion.div>
  )
}
