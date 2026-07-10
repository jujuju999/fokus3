import { getSupabase } from './supabaseClient'

/**
 * Login is code-based (email OTP), NOT magic-link-based, on purpose:
 * installed PWAs on iOS have storage separate from Safari, so a clicked
 * magic link would create the session in Safari while the installed app
 * stays logged out. Typing the 6-digit code inside the PWA avoids that
 * entirely — and needs no redirect-URL configuration either.
 * Requires {{ .Token }} in the Supabase "Magic Link" email template.
 */
export async function sendLoginCode(email: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({ email })
  if (error) throw new Error(error.message)
}

export async function verifyLoginCode(email: string, code: string): Promise<void> {
  const { error } = await getSupabase().auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  })
  if (error) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut()
  if (error) throw new Error(error.message)
}
