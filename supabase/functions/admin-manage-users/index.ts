import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    let isAuthorized = false

    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
      if (!userError && user) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('perfil')
          .eq('id', user.id)
          .single()
        
        if (profile?.perfil === 'admin' || profile?.perfil === 'consultor') {
          isAuthorized = true
        }
      }
    }

    const { action, userData, queueId } = await req.json()

    // Internal system actions or admin actions
    if (action === 'create_client' || action === 'create') {
      const { email, password, nome, perfil, cnpj } = userData

      // 1. Create user in Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, perfil, cnpj, force_password_change: perfil === 'consultor' }
      })

      if (authError) {
        if (authError.message.includes('already has been registered')) {
          // If user exists, try to update profile if it's a client
          const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
          const user = existingUser.users.find(u => u.email === email)
          if (user && perfil === 'cliente') {
             await supabaseAdmin.from('profiles').update({ cnpj, senha_texto: password }).eq('id', user.id)
          }
          
          if (queueId) {
            await supabaseAdmin.from('client_user_queue').update({ status: 'completed', processed_at: new Date().toISOString() }).eq('id', queueId)
          }

          return new Response(JSON.stringify({ message: 'User already exists, updated profile if needed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        }
        throw authError
      }

      // 2. Update profile
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          nome, 
          email, 
          perfil, 
          cnpj: perfil === 'cliente' ? cnpj : null, 
          force_password_change: perfil === 'consultor',
          senha_texto: password
        })
        .eq('id', authUser.user.id)

      if (updateError) throw updateError

      if (queueId) {
        await supabaseAdmin.from('client_user_queue').update({ status: 'completed', processed_at: new Date().toISOString() }).eq('id', queueId)
      }

      return new Response(JSON.stringify({ user: authUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'list_with_auth') {
      if (!isAuthorized) throw new Error('Unauthorized')
      
      const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      if (authError) throw authError

      const { data: profiles, error: profError } = await supabaseAdmin
        .from('profiles')
        .select('*')
      
      if (profError) throw profError

      const merged = profiles.map(p => {
        const authUser = users.find(u => u.id === p.id)
        return {
          ...p,
          last_login: authUser?.last_sign_in_at || p.ultimo_acesso
        }
      })

      return new Response(JSON.stringify({ users: merged }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Invalid action or unauthorized')
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
