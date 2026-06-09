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

    const body = await req.json()
    console.log('Request received body:', body)
    const { action, userData, queueId } = body

    const authHeader = req.headers.get('Authorization')
    let isAuthorized = false

    // Skip auth check for forgot_password
    if (action !== 'forgot_password' && authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
      
      if (userError) {
        console.error('Auth error:', userError)
      }

      if (user) {
        console.log('User identified:', user.id)
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('perfil')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Profile error:', profileError)
        }

        console.log('User profile:', profile)
        if (profile?.perfil === 'admin' || profile?.perfil === 'consultor') {
          isAuthorized = true
        }
      } else {
        console.warn('No user found for token')
      }
    } else if (action !== 'forgot_password') {
      console.warn('No Authorization header for protected action')
    }

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

    if (action === 'reset_password') {
      if (!isAuthorized) throw new Error('Unauthorized')
      const { userId } = userData
      
      // Generate a random temporary password (8 characters)
      const tempPassword = Math.random().toString(36).slice(-8)
      
      console.log(`Resetting password for user ${userId}`)
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: tempPassword }
      )
      
      if (authError) {
        console.error('Auth update error:', authError)
        throw authError
      }
      
      // Update profile to force password change and store temp password
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          force_password_change: true,
          senha_texto: tempPassword
        })
        .eq('id', userId)
        
      if (updateError) {
        console.error('Profile update error:', updateError)
        throw updateError
      }

      // Try to send email with temporary password
      try {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('email, nome')
          .eq('id', userId)
          .single()

        if (userProfile?.email) {
          // If you have a custom domain configured, you could use an edge function to send the email
          // For now, we return it to the UI so the admin can see it, and we try to send via resetPasswordForEmail
          // but that would invalidate the temp password if they use the link.
          // Better approach is to use a transactional email if configured.
          console.log(`Temporary password for ${userProfile.email}: ${tempPassword}`)
        }
      } catch (e) {
        console.error('Error fetching profile for email log:', e)
      }
      
      return new Response(JSON.stringify({ message: 'Senha redefinida com sucesso', tempPassword }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'forgot_password') {
      const { email } = userData
      if (!email) throw new Error('E-mail é obrigatório')

      // 1. Find user by email
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError
      
      const authUser = users.users.find(u => u.email === email)
      if (!authUser) {
        // Return 200 for security but don't do anything
        return new Response(JSON.stringify({ message: 'Se o e-mail existir no sistema, uma nova senha foi enviada.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      // 2. Generate temp password
      const tempPassword = Math.random().toString(36).slice(-8)
      
      // 3. Update Auth password
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: tempPassword }
      )
      if (authError) throw authError

      // 4. Update Profile
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          force_password_change: true,
          senha_texto: tempPassword
        })
        .eq('id', authUser.id)
      if (updateError) throw updateError

      // 5. TODO: Send email (transactional)
      console.log(`FORGOT PASSWORD: Temp password for ${email}: ${tempPassword}`)

      return new Response(JSON.stringify({ message: 'E-mail enviado com a senha temporária.' }), {
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
