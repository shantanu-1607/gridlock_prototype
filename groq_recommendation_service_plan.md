# Groq OSS 120B Integration — Recommendation Service

Since you are using Groq with an Open Source 120B model (e.g., Llama-3.1-70B or similar large OSS models), the prompt engineering and API integration need to be optimized for strict JSON output adherence, as OSS models can sometimes struggle with exact schema matching compared to GPT-4/Claude. 

Below is the complete implementation plan, prompt design, and TypeScript code to drop into `apps/backend/src/services/recommendation.service.ts`.

## 1. Prompt Engineering for OSS Models
To get reliable JSON from an OSS model on Groq, we need a strong **System Prompt** that defines the persona and rules, and a **User Prompt** that injects the data. We also need to leverage Groq's JSON mode if available, but a strong schema definition in the prompt is crucial.

### System Prompt
```text
You are the AI Command Center for GridLock, a traffic management system in Bengaluru.
Your objective is to generate an actionable fleet dispatch plan based on real-time traffic data, historical precedents, and available fleet inventory.

You MUST respond ONLY with a valid, perfectly formatted JSON object. 
Do NOT wrap the JSON in markdown blocks (like ```json). Do NOT add any conversational text before or after the JSON.

The JSON must exactly match this schema:
{
  "total_fleet_required": <integer>,
  "rationale": "<string explaining the deployment strategy based on the forecast and precedents>",
  "deployments": [
    {
      "junction": "<string, exact name of the junction>",
      "fleet_count": <integer>,
      "role": "<string, choose from: 'traffic_direction', 'incident_clearance', 'diversion_management'>",
      "deploy_by_mins": <integer, negative for pre-staging, positive for future>,
      "priority": "<string, choose from: 'Critical', 'High', 'Medium', 'Low'>"
    }
  ]
}
```

### User Prompt
```text
EVENT DETAILS:
- Type: {event.type}
- Location: {event.lat}, {event.lon}
- Expected Crowd/Scale: {event.expected_crowd_size}
- ML Predicted Duration: {ml.duration} mins
- ML Severity Score: {ml.severity}

ACTIVE CONGESTION FORECAST (Predicted Spread):
- T+0 mins: {forecast.t0}
- T+15 mins: {forecast.t15}
- T+30 mins: {forecast.t30}

HISTORICAL PRECEDENTS (Similar past events):
{precedents.summary}

AVAILABLE FLEET INVENTORY:
Total Available: {fleet.length} personnel
Details: {fleet_details_json}

INSTRUCTIONS:
1. Review the congestion forecast to see where traffic will spread.
2. Review historical precedents to understand secondary risks.
3. Assign available fleet members to specific junctions to mitigate the impact. Do not assign more fleet than is available.
4. Return the response strictly as JSON.
```

---

## 2. Dependencies

You will need the Groq SDK for Node.js.
```bash
npm install groq-sdk
```

---

## 3. Implementation: `recommendation.service.ts`

Here is the exact code you can drop into your backend services directory to implement this using Groq.

```typescript
import Groq from 'groq-sdk';

// Initialize Groq client
// Ensure GROQ_API_KEY is set in your .env file
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface DispatchPlan {
  total_fleet_required: number;
  rationale: string;
  deployments: Array<{
    junction: string;
    fleet_count: number;
    role: 'traffic_direction' | 'incident_clearance' | 'diversion_management';
    deploy_by_mins: number;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
  }>;
}

export const generateDispatchPlan = async (
  event: any,
  ml: { duration: number; severity: number },
  forecast: { t0: string[]; t15: string[]; t30: string[] },
  precedents: { summary: string },
  availableFleet: any[]
): Promise<DispatchPlan> => {
  
  const systemPrompt = `You are the AI Command Center for GridLock, a traffic management system in Bengaluru.
Your objective is to generate an actionable fleet dispatch plan based on real-time traffic data, historical precedents, and available fleet inventory.

You MUST respond ONLY with a valid, perfectly formatted JSON object. 
Do NOT wrap the JSON in markdown blocks (like \`\`\`json). Do NOT add any conversational text before or after the JSON.

The JSON must exactly match this schema:
{
  "total_fleet_required": <integer>,
  "rationale": "<string>",
  "deployments": [
    {
      "junction": "<string>",
      "fleet_count": <integer>,
      "role": "<string: 'traffic_direction' | 'incident_clearance' | 'diversion_management'>",
      "deploy_by_mins": <integer>,
      "priority": "<string: 'Critical' | 'High' | 'Medium' | 'Low'>"
    }
  ]
}`;

  const userPrompt = `EVENT DETAILS:
- Type: ${event.type}
- Location: ${event.lat}, ${event.lon}
- Expected Crowd/Scale: ${event.expected_crowd_size || 'N/A'}
- ML Predicted Duration: ${ml.duration} mins
- ML Severity Score: ${ml.severity}

ACTIVE CONGESTION FORECAST (Predicted Spread):
- T+0 mins: ${forecast.t0.join(', ') || 'None'}
- T+15 mins: ${forecast.t15.join(', ') || 'None'}
- T+30 mins: ${forecast.t30.join(', ') || 'None'}

HISTORICAL PRECEDENTS:
${precedents.summary || 'No direct precedents found.'}

AVAILABLE FLEET INVENTORY:
Total Available: ${availableFleet.length} personnel
Details: ${JSON.stringify(availableFleet)}

INSTRUCTIONS:
Assign available fleet to specific junctions. Do not assign more fleet than the total available (${availableFleet.length}). Return strictly JSON.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      // Replace with your specific 120B model ID on Groq, e.g., 'llama3-70b-8192' or mixtral
      model: process.env.GROQ_MODEL_ID || 'llama3-70b-8192', 
      temperature: 0.2, // Low temperature for deterministic, structured output
      max_tokens: 1024,
      response_format: { type: 'json_object' } // Enforces JSON output from Groq
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || '{}';
    
    // Parse the JSON safely
    const parsedPlan: DispatchPlan = JSON.parse(rawContent);
    return parsedPlan;
    
  } catch (error) {
    console.error('[RecommendationService] Error generating dispatch plan via Groq:', error);
    throw new Error('Failed to generate dispatch plan');
  }
};
```

### Why this works well for Open Source Models:
1. **Low Temperature (`0.2`)**: OSS models can hallucinate fields if creative. Low temperature keeps them grounded to the schema.
2. **`response_format: { type: 'json_object' }`**: Groq's API supports JSON mode, which forces the model to output parsable JSON.
3. **Explicit Schema in System Prompt**: Even with JSON mode, the model needs to know the exact keys and types it's allowed to use.
4. **Anti-Markdown Rule**: We explicitly tell it not to use ```json blocks, as that breaks `JSON.parse()` if the SDK doesn't strip it automatically.
