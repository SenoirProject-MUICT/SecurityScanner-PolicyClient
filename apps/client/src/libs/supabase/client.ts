import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''

export const supabaseSettings = {
  urlConfigured: url.length > 0,
  keyConfigured: publishableKey.length > 0,
  configured: url.length > 0 && publishableKey.length > 0,
}

export const supabase = supabaseSettings.configured
  ? createClient<Database>(url, publishableKey)
  : null
