import Groq from 'groq-sdk'

import { publishWsEvent } from './queue.service'

let groqClient: Groq | null = null

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return groqClient
}

/**
 * Generates an ambient "junior to senior" intel update using the LLM and
 * broadcasts it directly to the frontend via WebSockets.
 */
export async function generateAmbientUpdate(eventType: string, contextData: any) {
  try {
    const client = getGroqClient()
    if (!client) {
      console.warn('[AmbientService] Missing GROQ_API_KEY, skipping ambient update.')
      return
    }

    const systemPrompt = `You are a junior traffic intelligence officer reporting to the senior commander at the GridLock command center. You provide natural, 1-sentence situational updates (radio chatter style). Never use markdown formatting, asterisks, or quotes. Never introduce yourself. Just state the update directly.`

    const userPrompt = `System Event: ${eventType}
Context Data: ${JSON.stringify(contextData)}

Based on this data, write a brief, professional 1-sentence update summarizing the current situation. For example, if it's a sitrep: "Commander, the VIP movement has been active for 4 minutes and is currently impacting 3 junctions with peak intensity at 0.85."`

    const response = await client.chat.completions.create({
      model: process.env.GROQ_MODEL_ID || 'llama3-8b-8192',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 80,
    })

    const message = response.choices[0]?.message?.content?.trim()
    if (message) {
      await publishWsEvent('ambient:update', {
        message,
        eventType,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (err) {
    console.error('[AmbientService] Error generating ambient update:', err)
  }
}
