export default function SetupNotice() {
  return (
    <div className="grid min-h-dvh place-items-center bg-base px-6">
      <div className="w-full max-w-md rounded-2xl border border-edge bg-card p-6">
        <h1 className="mb-1 text-[22px] font-bold text-ink">Fokus3 einrichten</h1>
        <p className="mb-4 text-sm text-ink-2">
          Die Verbindung zu Supabase ist noch nicht konfiguriert.
        </p>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-ink-2">
          <li>
            Im Supabase-Dashboard unter{' '}
            <span className="font-medium text-ink">Project Settings → API</span> die Project-URL
            und den <span className="font-medium text-ink">anon</span>-Key kopieren.
          </li>
          <li>
            Beide Werte in <code className="rounded bg-edge px-1.5 py-0.5 text-ink">.env.local</code>{' '}
            eintragen:
            <pre className="mt-2 overflow-x-auto rounded-xl bg-base p-3 text-xs text-ink-2">
              {'VITE_SUPABASE_URL=https://…supabase.co\nVITE_SUPABASE_ANON_KEY=eyJ…'}
            </pre>
          </li>
          <li>Die Datei speichern – der Dev-Server startet automatisch neu.</li>
        </ol>
      </div>
    </div>
  )
}
