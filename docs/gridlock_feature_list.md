# GridLock — Complete Feature List
> AI-Powered Traffic Command Center | Hackathon Build | 5-Day Scope

---

## Table of Contents

1. [Role-Based Access Control](#1-role-based-access-control)
2. [Event Management](#2-event-management)
3. [ML Prediction Engine](#3-ml-prediction-engine)
4. [Event Fingerprinting](#4-event-fingerprinting)
5. [Congestion Propagation Engine](#5-congestion-propagation-engine)
6. [Temporal Heatmap](#6-temporal-heatmap)
7. [Fleet Dispatch Engine](#7-fleet-dispatch-engine)
8. [Barricade Recommendation Engine](#8-barricade-recommendation-engine)
9. [Pre-Staging Window & Controller Alerts](#9-pre-staging-window--controller-alerts)
10. [Multi-Event Conflict Detection](#10-multi-event-conflict-detection)
11. [AI Chatbot Assistant](#11-ai-chatbot-assistant)
12. [Fleet Member Interface](#12-fleet-member-interface)
13. [Post-Event Accuracy Report](#13-post-event-accuracy-report)
14. [Ambient AI Engine](#14-ambient-ai-engine)
15. [Real-Time Monitoring Dashboard](#15-real-time-monitoring-dashboard)

---

## 1. Role-Based Access Control

### Overview
Two roles with clearly separated capabilities. No complex permissions framework — two hardcoded role types with JWT-based sessions.

### Controller
- Full dashboard access: map, heatmap, event management, AI chat
- Create, edit, and close events (planned and unplanned)
- View fleet positions and dispatch assignments
- Place and confirm barricade recommendations
- Access post-event accuracy reports
- Interact with AI chatbot

### Fleet Member
- Receive dispatch assignments with location and priority
- Mark tasks as in-progress, completed, or blocked
- Report new incidents from the field (with lat/lon auto-detected)
- View assigned route and instructions
- Send status updates visible to controller in real time

### Implementation Notes
- JWT issued on login, role embedded in payload
- Middleware guards `/controller/*` and `/fleet/*` route groups
- Frontend conditionally renders UI based on decoded role
- Two seed accounts: `controller@gridlock.in` / `fleet@gridlock.in`

---

## 2. Event Management

### Overview
The entry point for the entire system. Creating an event triggers the full prediction and recommendation pipeline.

### Planned Events
Types: `public_event`, `procession`, `vip_movement`, `construction`, `protest`

Fields:
- Event name and type
- Location (lat/lon via map click or address search)
- Expected crowd size
- Start datetime and expected end datetime
- Affected corridors (multi-select from known corridor list)
- Requires road closure (boolean)
- Priority override (auto-set from ML, manually adjustable)

### Unplanned Events
Types: `vehicle_breakdown`, `accident`, `water_logging`, `tree_fall`, `pot_holes`, `others`

Fields:
- Event type
- Location (lat/lon)
- Vehicle type (if applicable)
- Corridor
- Brief description
- Requires road closure (boolean)

### Post-Creation Pipeline
When an event is created, the following triggers fire in sequence:

```
Event saved to DB
        ↓
ML Prediction endpoint called → returns (duration_mins, severity_score)
        ↓
Fingerprint query runs → returns similar historical events
        ↓
Propagation engine seeds congestion node
        ↓
Fleet and barricade recommendations generated via LLM
        ↓
Pre-staging timeline computed
        ↓
WebSocket broadcast: all connected controllers receive update
        ↓
BullMQ job scheduled: run propagation ticks every 30s
```

### Event Lifecycle States
`created → active → monitoring → closed → reported`

---

## 3. ML Prediction Engine

### Overview
A trained model (XGBoost or RandomForest) that predicts incident duration and severity using 8000+ real Bengaluru traffic incidents provided in the dataset. This is what separates GridLock from teams that just wrap an LLM.

### Training Data
Source: Provided dataset (8173 records, Bengaluru 2023–2024)
Filtered to: 2460 records with valid `closed_datetime` (ground truth duration labels)

### Features
| Feature | Type | Source |
|---|---|---|
| `event_cause` | Categorical (encoded) | Dataset |
| `corridor` | Categorical (encoded) | Dataset |
| `hour_of_day` | Integer (0–23) | Derived from `start_datetime` |
| `day_of_week` | Integer (0–6) | Derived from `start_datetime` |
| `priority` | Binary | Dataset |
| `requires_road_closure` | Binary | Dataset |
| `veh_type` | Categorical (encoded) | Dataset (nullable) |

### Target Variable
`duration_mins` = `(closed_datetime - start_datetime)` in minutes
Capped at 1440 mins (24 hours) to remove outliers.

### Model Output
```json
{
  "predicted_duration_mins": 87,
  "severity_score": 0.74,
  "severity_label": "High",
  "confidence": 0.81
}
```

### Serving
- Exported as a FastAPI endpoint: `POST /api/ml/predict`
- Called synchronously at event creation
- Response stored in the `events` table alongside event metadata

### Severity Scoring
| severity_score | Label |
|---|---|
| 0.0 – 0.3 | Low |
| 0.3 – 0.6 | Medium |
| 0.6 – 0.85 | High |
| 0.85 – 1.0 | Critical |

---

## 4. Event Fingerprinting

### Overview
When a new event is created, the system finds historically similar events from the dataset and surfaces their outcomes — affected junctions, actual duration, secondary incidents. Grounds predictions in real precedent rather than pure model output.

### How It Works
1. New event has: `(event_cause, lat, lon, hour_of_day, corridor)`
2. Query historical events within:
   - Same `event_cause`
   - Within 2km radius of lat/lon
   - Within ±2 hours of `hour_of_day`
3. Return top 3–5 matches ranked by similarity score
4. Aggregate their outcomes: avg duration, affected junctions, secondary incident count

### Similarity Score
```
similarity = 0.4 * (1 / distance_km) + 0.3 * (1 - |hour_delta| / 24) + 0.3 * (cause_match)
```

### Output
```json
{
  "matched_events": [
    {
      "event_id": "FKID003421",
      "cause": "vehicle_breakdown",
      "corridor": "Tumkur Road",
      "hour": 8,
      "actual_duration_mins": 52,
      "junctions_affected": ["JalahalliCross", "SMCircle"],
      "secondary_incidents": 2,
      "similarity_score": 0.87
    }
  ],
  "aggregated": {
    "avg_duration_mins": 47,
    "common_junctions": ["JalahalliCross"],
    "avg_secondary_incidents": 1.3
  }
}
```

### UI Display
In the controller dashboard, shown as a "Historical Precedents" card:
> *"3 similar incidents on Tumkur Road at this hour. Average resolution: 47 mins. JalahalliCross was affected in all 3 cases."*

---

## 5. Congestion Propagation Engine

### Overview
Simulates how congestion spreads from the event epicenter through the road network over time. Calibrated against real cascade patterns extracted from the dataset.

### Road Network Representation
- Nodes: named junctions from the dataset (`junction` column) + known Bengaluru junctions
- Edges: corridor connections between adjacent junctions (pre-built adjacency list)
- Edge weights: historical incident frequency between two nodes in the dataset

### Cascade Calibration from Dataset
Pre-computed offline:
- For each primary incident, find secondary incidents within 30 mins and 5km
- Build `cascade_probability[corridor][hour_bucket]` — probability that congestion at node A propagates to node B
- Stored as a lookup table in Postgres

This means the propagation isn't physics BFS — it's **data-calibrated BFS** where edge weights represent real observed cascade probabilities.

### Propagation Algorithm
```
seed_node = event location (nearest junction)
seed_intensity = severity_score from ML model (0–1)
decay_factor = f(duration_mins) — intensity decays as predicted resolution approaches

for each time_tick (every 5 mins):
  for each active_node:
    propagate to neighbors weighted by cascade_probability
    reduce intensity by decay_factor
    if intensity < 0.05: remove node from active set
```

### Congestion Intensity Levels
| Intensity | Label | Color |
|---|---|---|
| 0.7 – 1.0 | Severe | 🔴 Red |
| 0.4 – 0.7 | Moderate | 🟡 Yellow |
| 0.1 – 0.4 | Low | 🟠 Orange |
| < 0.1 | Clear | 🟢 Green |

### Output
Per tick, emits a list of active congestion nodes with intensity values. Published via WebSocket to all connected controller clients.

### BullMQ Integration
- One BullMQ job per active event: `propagation-job:{event_id}`
- Runs every 30 seconds
- Publishes result to Redis pub/sub channel
- API server subscribes and broadcasts via WebSocket

---

## 6. Temporal Heatmap

### Overview
The primary visual on the controller dashboard. Shows congestion state across the road network with a time slider for +5, +15, and +30 minute forecasts.

### Layers
1. **Historical Risk Layer** (static): Pre-aggregated incident density from full dataset per junction. Always visible as a background heat layer. Shows which junctions are historically dangerous.

2. **Live Propagation Layer** (dynamic): Current tick output from the propagation engine. Updates every 30 seconds via WebSocket.

3. **Forecast Layer** (on-demand): Pre-computed propagation ticks for +5, +15, +30 mins. Controller toggles between them using the time slider.

### Time Slider
```
[ NOW ] ----[ +5 MIN ]----[ +15 MIN ]----[ +30 MIN ]
```
- Sliding updates the heatmap overlay in real time
- Fleet and barricade recommendation overlay also updates per time step
- Plays as an animation if "Play" is pressed (auto-advances every 2 seconds)

### Map Implementation
- Leaflet.js with OpenStreetMap tiles (Bengaluru coordinates)
- Junction markers: clickable, shows incident history tooltip
- Heatmap: Leaflet.heat plugin or custom canvas overlay
- Congestion polygons: rendered around junction nodes with radius proportional to intensity

### Data Source for Historical Layer
Directly from dataset: group by `junction`, count incidents, normalize 0–1. No ML required.

---

## 7. Fleet Dispatch Engine

### Overview
Generates actionable fleet deployment recommendations based on ML prediction output, propagation state, and available fleet inventory. Output is LLM-reasoned but numerically grounded.

### Input to LLM Prompt
```
- Event type and description
- ML predicted duration: 87 mins
- ML severity: High (0.74)
- Active congestion nodes at T+0, T+15, T+30
- Historical precedent: avg 1.3 secondary incidents nearby
- Available fleet: 12 members, current positions
- Corridors affected: Tumkur Road, Bellary Road 1
```

### LLM Output (structured JSON)
```json
{
  "total_fleet_required": 8,
  "deployments": [
    {
      "junction": "JalahalliCross",
      "fleet_count": 3,
      "role": "traffic_direction",
      "deploy_by": "T-15 mins",
      "priority": "Critical"
    },
    {
      "junction": "SMCircle",
      "fleet_count": 2,
      "role": "incident_clearance",
      "deploy_by": "T-5 mins",
      "priority": "High"
    },
    {
      "junction": "PeenyaIndustrial",
      "fleet_count": 3,
      "role": "diversion_management",
      "deploy_by": "T+10 mins",
      "priority": "Medium"
    }
  ],
  "rationale": "Tumkur Road inbound will saturate at JalahalliCross by T+12 based on historical cascade data. Pre-positioning 3 members there prevents spillover to SMCircle."
}
```

### Controller Interaction
- Recommendations shown as cards on dashboard sidebar
- Controller can accept, reject, or modify each deployment
- Accepted deployments create tasks dispatched to fleet member accounts via WebSocket

### Dynamic Reassignment
If a fleet member reports a new secondary incident during the event, BullMQ job re-triggers the recommendation engine with updated state.

---

## 8. Barricade Recommendation Engine

### Overview
Recommends where to place barricades to contain congestion spillover and enforce diversions. Simpler than fleet dispatch — rule-based with LLM explanation layer.

### Rules (derived from dataset patterns)
- If `requires_road_closure = true`: recommend barricades at both ends of the affected road segment
- If severity ≥ High: recommend barricades at junction entry points on the propagation path at T+15
- If `event_cause = public_event` and crowd > 10,000: recommend perimeter barricades 500m from venue

### LLM Output
```json
{
  "barricades": [
    {
      "location": "JalahalliCross North Entry",
      "lat": 13.040,
      "lon": 77.518,
      "type": "hard_closure",
      "activate_at": "T-20 mins",
      "purpose": "Block inbound Tumkur Road traffic to prevent venue approach congestion"
    },
    {
      "location": "SMCircle East Exit",
      "lat": 13.039,
      "lon": 77.519,
      "type": "diversion_sign",
      "activate_at": "T-10 mins",
      "purpose": "Redirect ORR North traffic to Bellary Road alternate"
    }
  ]
}
```

### Map Display
Barricade recommendations shown as orange polygon markers on the map. Controller clicks to confirm → marker turns red (confirmed) → fleet member assigned to that location.

---

## 9. Pre-Staging Window & Controller Alerts

### Overview
For planned events, the system generates a preparation timeline that tells the controller what to do and when — before the event starts. This is the key differentiator: proactive deployment vs reactive response.

### Timeline Generation
Given event start at T=0 and ML-predicted impact window:

```
T - 60 min : Alert generated, recommendations available for review
T - 30 min : "Begin fleet deployment to primary junctions"
T - 20 min : "Activate barricades at road closure points"
T - 10 min : "Confirm all fleet members at assigned positions"
T + 0      : Event starts, live monitoring begins
T + 15 min : "Check propagation — secondary zones may activate"
T + 30 min : "Peak congestion window — all resources should be active"
T + predicted_duration : "Begin clearance phase, prepare to stand down"
```

### Alert Delivery
- In-dashboard notification panel (WebSocket push)
- Each alert is actionable: links directly to the relevant fleet/barricade card
- Alert marked complete when controller takes the corresponding action

### Alert Priority
| Alert Type | Urgency |
|---|---|
| Pre-positioning reminder | Info |
| Barricade activation due | Warning |
| Secondary incident detected | Critical |
| Fleet shortage detected | Critical |
| Predicted peak approaching | Warning |

---

## 10. Multi-Event Conflict Detection

### Overview
When two or more planned events overlap in time and geography, the system detects the conflict and flags resource contention before it becomes a problem.

### Conflict Conditions
A conflict is raised when:
1. Two events have overlapping time windows (any overlap)
2. Their predicted congestion zones intersect (junction overlap in propagation output)
3. OR they share the same corridor

### Conflict Report Output
```
⚠️ RESOURCE CONFLICT DETECTED

Event A: IPL Match — Chinnaswamy Stadium — Sunday 7:00 PM
Event B: Political Rally — Vidhana Soudha — Sunday 6:30 PM

Overlap window    : 6:30 PM – 9:00 PM
Shared junctions  : [Anil Kumble Circle, Queens Statue Circle, MG Road]
Shared corridor   : Old Madras Road

Fleet required (A): 8 members
Fleet required (B): 6 members
Total required    : 14 members
Available         : 10 members
Shortfall         : 4 members

Recommendation    : Request 4 additional personnel by 5:00 PM.
                    Prioritize Event A (higher crowd density).
                    Merge barricade zones at Anil Kumble Circle.
```

### UI
- Shown as a modal alert when the second conflicting event is created
- Persistent conflict badge in dashboard header until resolved
- Controller can mark conflict as "acknowledged" or "resolved"

---

## 11. AI Chatbot Assistant

### Overview
Natural language interface for controllers to query the system, run scenarios, and get explanations. Backed by LLM with full event context injected into every prompt.

### Context Injected Per Message
Every LLM call receives:
- Active events and their ML predictions
- Current propagation state (which junctions are congested, at what intensity)
- Fleet deployment status
- Barricade status
- Historical fingerprint results
- Pre-staging timeline progress

### Example Interactions

**Scenario queries:**
> "What happens if the IPL match runs 2 hours over?"
→ Re-runs propagation with extended `duration_mins`, returns updated fleet and barricade recommendations

> "What if it starts raining during the rally?"
→ LLM adjusts severity estimate upward, notes that `water_logging` events in the dataset have median 112 min resolution, recommends pre-emptive secondary junction coverage

> "Which roads should I divert Bellary Road traffic to?"
→ LLM queries affected corridors, suggests alternates based on current non-congested junctions

**Status queries:**
> "How many fleet members do I still need to deploy?"
→ Reads current fleet dispatch state, returns count delta

> "Is JalahalliCross going to clear before the match ends?"
→ Checks propagation decay curve, returns estimated clear time

**Historical queries:**
> "Have we handled something like this before?"
→ Returns fingerprint results in natural language

### Constraints
- Responses always cite whether they are based on ML prediction, historical data, or LLM reasoning
- LLM does not make up junction names or road names — it only uses names from the dataset and known Bengaluru geography
- Structured outputs (fleet counts, timings) are rendered as cards, not inline text

---

## 12. Fleet Member Interface

### Overview
Minimal mobile-friendly interface for on-ground personnel. Receives assignments, sends updates.

### Assignment Card
Each fleet member sees:
- Junction name and Google Maps link
- Role: `traffic_direction` / `incident_clearance` / `diversion_management`
- Deploy by time
- Priority badge
- Status buttons: `En Route` → `On Site` → `Completed`

### Incident Reporting
Fleet member can report a new unplanned incident:
- Event type dropdown
- Auto-captured lat/lon
- Brief description field
- Submits to API → creates new unplanned event → triggers full pipeline

### Real-Time Updates
- Controller messages pushed via WebSocket to fleet interface
- If reassignment happens, fleet member sees updated card with push notification-style toast

---

## 13. Post-Event Accuracy Report

### Overview
After an event is closed, the system auto-generates an accuracy report comparing predicted vs actual outcomes. Demonstrates that the system is measurable and improvable — not a black box.

### Metrics Compared

| Metric | Predicted | Actual | Delta |
|---|---|---|---|
| Disruption duration | 87 mins | 102 mins | +17% |
| Junctions affected | 4 | 3 | -25% |
| Fleet deployed | 8 | 6 | — |
| Secondary incidents | 1–2 | 1 | ✓ |
| Peak congestion time | T+18 mins | T+22 mins | +4 mins |

### Accuracy Score
```
accuracy = 1 - mean_absolute_percentage_error(predicted_values, actual_values)
```
Shown as: **Model accuracy this event: 83%**

### Narrative Summary (LLM-generated)
> "Duration was underestimated by 17%. The vehicle breakdown on Tumkur Road cleared faster than the secondary water-logging event at ORR North, which persisted for an additional 34 minutes. Recommend adjusting water_logging weight in future predictions for this corridor."

### Storage
Each report stored in Postgres. Accuracy scores aggregated over time to show system-level trend. Displayed as a small chart on the main dashboard.

---

## 14. Ambient AI Engine

### Overview
A BullMQ-based background process that continuously monitors active events, watches for anomalies, and triggers alerts without controller input.

### Jobs Running Continuously

**`propagation-tick` job** (every 30s per active event):
- Advances congestion simulation by one tick
- Publishes heatmap update via WebSocket

**`anomaly-detector` job** (every 60s):
- Checks if any active event's actual observed fleet reports suggest worse-than-predicted severity
- If fleet member reports secondary incident: re-triggers full recommendation pipeline
- If event exceeds predicted duration by >20%: fires "Duration Overrun" alert to controller

**`idle-event-scanner` job** (every 5 mins):
- Checks for events in `active` state with no recent updates
- Sends a "No update received" reminder to assigned fleet member

**`pre-staging-scheduler` job** (on event creation):
- Schedules delayed BullMQ jobs for each pre-staging alert timestamp
- When job fires, pushes alert via WebSocket to controller

### No Continuous Learning
Actual model retraining is out of scope for hackathon. The "post-event learning" narrative is delivered through the accuracy report — showing the delta and explaining it in natural language. Real retraining pipeline is acknowledged as a production roadmap item.

---

## 15. Real-Time Monitoring Dashboard

### Overview
The controller's main view. Everything visible at once without switching screens.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  GRIDLOCK          [Active Events: 2]  [Fleet: 8/12 deployed]   │
├──────────────────────────────┬──────────────────────────────────┤
│                              │  ACTIVE EVENTS                   │
│                              │  ┌──────────────────────────┐   │
│                              │  │ 🔴 IPL Match             │   │
│        LEAFLET MAP           │  │ Chinnaswamy | High        │   │
│    (heatmap + markers)       │  │ T+22 mins | 6 fleet       │   │
│                              │  └──────────────────────────┘   │
│                              │  ┌──────────────────────────┐   │
│   [ NOW +5 +15 +30 ] [▶]    │  │ 🟡 Construction           │  │
│                              │  │ MG Road | Medium          │   │
├──────────────────────────────┤  │ T+104 mins | 2 fleet      │  │
│  FLEET RECOMMENDATIONS       │  └──────────────────────────┘   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ├──────────────────────────────────┤
│  │ 3 @ │ │ 2 @ │ │ 3 @ │  │  AI ASSISTANT                    │
│  │Jalab│ │ SMCi │ │Peeny│  │  > What if it rains tonight?     │
│  └──────┘ └──────┘ └──────┘ │  < Severity would increase...   │
│  BARRICADE RECOMMENDATIONS   │                                  │
│  [2 active] [1 pending]      │  > How many more fleet needed?   │
│                              │  < 2 more at ORR North...        │
├──────────────────────────────┴──────────────────────────────────┤
│  ALERTS: ⚠️ JalahalliCross approaching peak (T+3 mins)          │
└─────────────────────────────────────────────────────────────────┘
```

### WebSocket Events (real-time updates)
| Event | Trigger | Effect |
|---|---|---|
| `propagation:tick` | Every 30s | Heatmap re-renders |
| `alert:prestaging` | Scheduled | Alert panel updates |
| `fleet:update` | Fleet member action | Fleet status card updates |
| `incident:new` | Fleet member report | New event card appears, pipeline triggers |
| `conflict:detected` | Second event created | Conflict modal fires |
| `event:closed` | Controller closes event | Accuracy report generated |

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript + Leaflet.js |
| Backend API | Node.js + TypeScript + Express |
| Real-time | WebSocket (ws library) |
| Queue | BullMQ + Redis |
| Database | PostgreSQL |
| ML Model | XGBoost / RandomForest (Python + FastAPI) |
| LLM | Anthropic Claude API or OpenAI (direct, no LangChain) |
| Map tiles | OpenStreetMap via Leaflet |
| Auth | JWT (hardcoded seed users for demo) |

---

## What is Mocked for Hackathon Demo

| Feature | Status | Notes |
|---|---|---|
| Fleet GPS positions | Mocked | Static lat/lon, updated manually |
| Road network graph | Semi-real | Pre-built adjacency list from dataset junctions |
| Continuous model retraining | Mocked | Accuracy report shows delta, retraining is roadmap item |
| PGVector / embeddings | Dropped | Fingerprinting done with pandas nearest-neighbor query |
| LangChain | Dropped | Direct LLM API calls only |
| RBAC middleware | Simplified | JWT role check only, no permission matrix |

---

## Out of Scope (Post-Hackathon Roadmap)

- Live traffic feed integration (Google Maps API, HERE API)
- Actual model retraining pipeline after each event
- Mobile app for fleet members (web-responsive for now)
- Kubernetes / production deployment
- Multi-city support
- CCTV feed analysis
- Vehicle count estimation from sensor data
