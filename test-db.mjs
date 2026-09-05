import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data, error } = await supabase.from('events').select('title, registration_open, registration_deadline, max_registrations, registration_mode').eq('title', 'test 123')
console.log(JSON.stringify(data, null, 2))
