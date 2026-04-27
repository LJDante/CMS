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
    console.log('Function called with method:', req.method)
    const authHeader = req.headers.get('Authorization') || req.headers.get('x-supabase-access-token')
    console.log('Auth header present:', !!authHeader)
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header or x-supabase-access-token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    console.log('Token extracted, length:', token.length)
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          error: 'Missing SUPABASE_URL or SERVICE_ROLE_KEY in function environment',
          supabaseUrl: !!supabaseUrl,
          hasServiceRoleKey: !!supabaseServiceRoleKey
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('Validating token via auth endpoint...')
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseServiceRoleKey
      }
    })

    if (!authResponse.ok) {
      const authError = await authResponse.json().catch(() => ({}))
      console.log('Auth endpoint validation failed:', authResponse.status, authError)
      return new Response(
        JSON.stringify({ error: authError?.msg || authError?.message || 'Invalid JWT' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { id: userId } = await authResponse.json()
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
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
        JSON.stringify({ error: 'Only clinic admins can create staff accounts' }),
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
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
          role: role,
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
      JSON.stringify({
        success: true,
        message: `Staff account created successfully for ${fullName}`,
        userId: authData.user.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})