interface Props {
  message: string | null
  /** 'warn' (muted amber) is reserved for the capacity warning. */
  variant?: 'error' | 'warn'
}

export default function Toast({ message, variant = 'error' }: Props) {
  if (!message) return null
  return (
    <div
      role="alert"
      className={`fixed bottom-6 left-1/2 z-50 w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 rounded-2xl px-4 py-3 text-sm shadow-[0_4px_12px_rgba(0,0,0,0.3)] ${
        variant === 'warn'
          ? 'bg-warn font-medium text-base'
          : 'border border-edge bg-card text-ink'
      }`}
    >
      {message}
    </div>
  )
}
