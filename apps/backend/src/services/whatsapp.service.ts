import jwt from 'jsonwebtoken'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://alphaq.duckdns.org'
const JWT_SECRET = process.env.JWT_SECRET || 'gridlocksecret'

/**
 * Generates a signed, short-lived JWT embedded in the WhatsApp accept link.
 * The token carries { assignmentId, userId } so only the correct officer
 * can trigger the accept-order endpoint.
 */
export function generateAcceptToken(assignmentId: string, userId: string): string {
  return jwt.sign({ assignmentId, userId }, JWT_SECRET, { expiresIn: '2h' })
}

/**
 * Verifies and decodes an accept token. Returns the payload or throws on
 * invalid/expired tokens.
 */
export function verifyAcceptToken(token: string): { assignmentId: string; userId: string } {
  return jwt.verify(token, JWT_SECRET) as { assignmentId: string; userId: string }
}

export interface DispatchAlertPayload {
  /** WhatsApp recipient number in E.164, e.g. "+917709861898" */
  phone: string
  officerName: string
  assignmentId: string
  userId: string
  junctionName: string
  role: string
  priority: string
  eventName: string
  deployByTime: string
}

/**
 * Sends a WhatsApp dispatch alert via the Twilio REST API.
 *
 * Uses a free-form body — no content template required for the sandbox.
 * Graceful: logs errors but does NOT throw, so a Twilio failure never
 * blocks the fleet dispatch response.
 */
export async function sendDispatchAlert(payload: DispatchAlertPayload): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('[WhatsApp] Twilio credentials not configured — skipping alert')
    return
  }

  const token = generateAcceptToken(payload.assignmentId, payload.userId)
  const acceptUrl = `${APP_BASE_URL}/fleet/accept?token=${encodeURIComponent(token)}`

  const deployTime = new Date(payload.deployByTime).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })

  const body = [
    `🚨 *GridLock Dispatch Alert*`,
    ``,
    `Officer *${payload.officerName}*, you have been deployed!`,
    ``,
    `📍 *Report to:* ${payload.junctionName}`,
    `🎯 *Role:* ${payload.role.replace(/_/g, ' ')}`,
    `⚡ *Priority:* ${payload.priority}`,
    `📋 *Event:* ${payload.eventName}`,
    `⏰ *Deploy by:* ${deployTime} IST`,
    ``,
    `✅ *Accept & View Mission:*`,
    acceptUrl,
    ``,
    `Tap the link to confirm and see full details.`,
    `— GridLock Command Center`,
  ].join('\n')

  const toNumber = payload.phone.startsWith('whatsapp:')
    ? payload.phone
    : `whatsapp:${payload.phone}`

  const params = new URLSearchParams()
  params.append('To', toNumber)
  params.append('From', TWILIO_WHATSAPP_FROM)
  params.append('Body', body)

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (res.ok) {
      const data = (await res.json()) as { sid: string }
      console.log(`[WhatsApp] Alert sent to ${toNumber} — SID: ${data.sid}`)
    } else {
      const err = await res.text()
      console.error(`[WhatsApp] Twilio API error (${res.status}):`, err)
    }
  } catch (err) {
    console.error('[WhatsApp] Failed to reach Twilio API:', (err as Error).message)
  }
}
