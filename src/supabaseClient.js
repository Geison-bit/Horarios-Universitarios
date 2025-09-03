import { createClient } from '@supabase/supabase-js'

// Lee las variables de entorno de forma segura
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)