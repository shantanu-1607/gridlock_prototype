import Groq from 'groq-sdk'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatContext {
  activeEvents: any[]
  fleetDeployments: any[]
  barricades: any[]
}

let groqClient: Groq | null = null

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return groqClient
}

function buildSystemPrompt(context: ChatContext): string {
  return `You are the GridLock AI Command Center Assistant. You are an expert system overseeing the traffic and resource deployment in Bengaluru.
  
You have access to the current system context:
Active Events: ${JSON.stringify(context.activeEvents, null, 2)}
Fleet Deployments: ${JSON.stringify(context.fleetDeployments, null, 2)}
Active Barricades: ${JSON.stringify(context.barricades, null, 2)}

Instructions:
1. Only answer queries relevant to traffic management, these events, or operations in Bengaluru.
2. If asked to run predictive scenarios, summarize the events and suggest that the user uses the "Run Predictive Pipeline" action.
3. Be concise, professional, and structure your responses using markdown lists or tables where appropriate.`
}

export const generateChatResponse = async (
  history: ChatMessage[],
  context: ChatContext,
): Promise<string> => {
  const client = getGroqClient()
  if (!client) {
    console.warn('GROQ_API_KEY is not set. Chatbot is disabled.')
    return 'Error: AI Assistant is not configured.'
  }

  const systemMessage: ChatMessage = {
    role: 'system',
    content: buildSystemPrompt(context),
  }

  try {
    const completion = await client.chat.completions.create({
      messages: [systemMessage, ...history],
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
      max_tokens: 1024,
    })
    return completion.choices[0]?.message?.content || 'Sorry, I am unable to respond at this time.'
  } catch (error) {
    console.error('[Chat Service] Error calling Groq:', error)
    throw error
  }
}
