export default function SetupNotice() {
  return (
    <div className="grid min-h-dvh place-items-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-neutral-900">Fokus3 einrichten</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Die Verbindung zu Supabase ist noch nicht konfiguriert.
        </p>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-neutral-700">
          <li>
            Im Supabase-Dashboard unter{' '}
            <span className="font-medium">Project Settings → API</span> die Project-URL und den{' '}
            <span className="font-medium">anon</span>-Key kopieren.
          </li>
          <li>
            Beide Werte in <code className="rounded bg-neutral-100 px-1.5 py-0.5">.env.local</code>{' '}
            eintragen:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100">
              {'VITE_SUPABASE_URL=https://…supabase.co\nVITE_SUPABASE_ANON_KEY=eyJ…'}
            </pre>
          </li>
          <li>Die Datei speichern – der Dev-Server startet automatisch neu.</li>
        </ol>
      </div>
    </div>
  )
}
