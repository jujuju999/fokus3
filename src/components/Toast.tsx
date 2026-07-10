interface Props {
  message: string | null
}

export default function Toast({ message }: Props) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      {message}
    </div>
  )
}
