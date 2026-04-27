// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-supabase-access-token, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('x-supabase-access-token')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header or x-supabase-access-token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('ANON_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(
        JSON.stringify({
          error: 'Missing SERVICE_ROLE_KEY, ANON_KEY, or SUPABASE_URL in function environment',
          supabaseUrl: !!supabaseUrl,
          hasServiceRoleKey: !!serviceRoleKey,
          hasAnonKey: !!anonKey
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: userError?.message || 'Invalid JWT' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unable to resolve authenticated user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || profile?.role !== 'clinic_admin') {
      return new Response(
        JSON.stringify({ error: 'Only clinic administrators can create staff accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { fullName, email, password, role } = await req.json()
    if (!fullName || !email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['clinic_doctor', 'clinic_nurse', 'clinic_staff'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() }
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${authError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          full_name: fullName.trim(),
          email: email.trim(),
          role,
          created_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )

    if (profileInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: `Failed to create profile: ${profileInsertError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: `Staff account created successfully for ${fullName}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
