import { getSupabase } from './supabaseClient'

/**
 * Auth is password-based, on purpose:
 * - Magic links break in installed iOS PWAs (separate storage from Safari:
 *   a clicked link logs in Safari, the app stays logged out).
 * - Email OTP codes would work, but Supabase only allows editing the email
 *   template (to include {{ .Token }}) with custom SMTP — overkill here.
 * Password login needs neither emails nor redirect URLs at sign-in time.
 * Requires "Confirm email" to be disabled in the Supabase auth settings.
 */
export async function signUp(email: string, password: string): Promise<void> {
  const { data, error } = await getSupabase().auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  // With "Confirm email" still enabled there is no session yet — surface it.
  if (!data.session) {
    throw new Error('confirm-email-required')
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut()
  if (error) throw new Error(error.message)
}
