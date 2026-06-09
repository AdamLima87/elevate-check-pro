import * as React from 'react'
import { render } from '@react-email/components'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { TEMPLATES } from '@/lib/email-templates/registry'

// Configuration baked in at scaffold time
const SITE_NAME = "Elevare Consultoria"
const SENDER_DOMAIN = "notify.elevareconsultoria.com"
const FROM_DOMAIN = "elevareconsultoria.com"

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const Route = createFileRoute("/lovable/email/transactional/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

          if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing required environment variables')
            return Response.json(
              { error: 'Server configuration error' },
              { status: 500 }
            )
          }

          // Parse request body
          let body: any;
          try {
            const rawBody = await request.text();
            console.log('Transactional send received raw body:', rawBody);
            body = JSON.parse(rawBody);
          } catch (e: any) {
            console.error('Failed to parse request body as JSON:', e);
            return Response.json(
              { error: 'Invalid JSON in request body' },
              { status: 400 }
            )
          }

          // Verify the caller has a valid Supabase auth token.
          const authHeader = request.headers.get('Authorization')
          if (!authHeader?.startsWith('Bearer ')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          const token = authHeader.slice('Bearer '.length).trim()
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          const { data: { user }, error: authError } = await supabase.auth.getUser(token)

          if (authError || !user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          // Parse request body data
          let templateName: string
          let recipientEmail: string
          let idempotencyKey: string
          let messageId: string
          let templateData: Record<string, any> = {}
          
          templateName = body.templateName || body.template_name
          recipientEmail = body.recipientEmail || body.recipient_email
          messageId = crypto.randomUUID()
          idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId
          if (body.templateData && typeof body.templateData === 'object') {
            templateData = body.templateData
          }

          if (!templateName) {
            return Response.json(
              { error: 'templateName is required' },
              { status: 400 }
            )
          }

          // 1. Look up template from registry
          const template = TEMPLATES[templateName]

          if (!template) {
            console.error('Template not found in registry', { templateName })
            return Response.json(
              {
                error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
              },
              { status: 404 }
            )
          }

          // Resolve effective recipient
          const effectiveRecipient = template.to || recipientEmail

          if (!effectiveRecipient) {
            return Response.json(
              {
                error: 'recipientEmail is required',
              },
              { status: 400 }
            )
          }

          // 2. Check suppression list
          const { data: suppressed, error: suppressionError } = await supabase
            .from('suppressed_emails')
            .select('id')
            .eq('email', effectiveRecipient.toLowerCase())
            .maybeSingle()

          if (suppressionError) {
            console.error('Suppression check failed', { error: suppressionError })
            return Response.json({ error: 'Failed to verify suppression status' }, { status: 500 })
          }

          if (suppressed) {
            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: templateName,
              recipient_email: effectiveRecipient,
              status: 'suppressed',
            })
            return Response.json({ success: false, reason: 'email_suppressed' })
          }

          // 3. Get or create unsubscribe token
          const normalizedEmail = effectiveRecipient.toLowerCase()
          let unsubscribeToken: string

          const { data: existingToken, error: tokenLookupError } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token, used_at')
            .eq('email', normalizedEmail)
            .maybeSingle()

          if (tokenLookupError) {
            console.error('Token lookup failed', { error: tokenLookupError })
            return Response.json({ error: 'Failed to prepare email' }, { status: 500 })
          }

          if (existingToken && !existingToken.used_at) {
            unsubscribeToken = existingToken.token
          } else {
            unsubscribeToken = generateToken()
            await supabase.from('email_unsubscribe_tokens').upsert(
              { token: unsubscribeToken, email: normalizedEmail },
              { onConflict: 'email', ignoreDuplicates: true }
            )
            
            // Re-read to ensure we have the token
            const { data: storedToken } = await supabase
              .from('email_unsubscribe_tokens')
              .select('token')
              .eq('email', normalizedEmail)
              .maybeSingle()
            
            unsubscribeToken = storedToken?.token || unsubscribeToken
          }

          // 4. Render React Email template
          const element = React.createElement(template.component, templateData)
          const html = await render(element)
          const plainText = await render(element, { plainText: true })

          const resolvedSubject =
            typeof template.subject === 'function'
              ? template.subject(templateData)
              : template.subject

          // 5. Enqueue
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'pending',
          })

          const { error: enqueueError } = await supabase.rpc('enqueue_email', {
            queue_name: 'transactional_emails',
            payload: {
              message_id: messageId,
              to: effectiveRecipient,
              from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
              sender_domain: SENDER_DOMAIN,
              subject: resolvedSubject || "Notificação",
              html,
              text: plainText,
              purpose: 'transactional',
              label: templateName,
              idempotency_key: idempotencyKey,
              unsubscribe_token: unsubscribeToken,
              queued_at: new Date().toISOString(),
            },
          })

          if (enqueueError) {
            console.error('Failed to enqueue email', { error: enqueueError })
            await supabase.from('email_send_log').update({
              status: 'failed',
              error_message: 'Failed to enqueue email',
            }).eq('message_id', messageId)

            return Response.json({ error: 'Failed to enqueue email' }, { status: 500 })
          }

          console.log('Transactional email enqueued successfully', { messageId });
          return Response.json({ success: true, queued: true })
        } catch (error: any) {
          console.error('Unhandled server error in transactional/send:', error);
          return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
        }
      },
    },
  },
})
