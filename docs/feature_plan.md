# GridLock — Phase 1 Feature Plan

> Hackathon build | 5-day scope | 4 teammates, 1 feature each

---

## The 4 Features to Start With

These 4 form a complete, demoable loop and every other feature depends on at least one of them.

| Person | Feature | Stack | Role |
|--------|---------|-------|------|
| 1 | Event Management + RBAC | Node.js + Postgres | Backend foundation |
| 2 | ML Prediction Engine | Python + FastAPI | Key differentiator |
| 3 | Congestion Propagation Engine | BullMQ + Graph BFS | Powers the heatmap |
| 4 | Real-Time Monitoring Dashboard | React + Leaflet.js | Demo-facing UI |

---

## The Runtime Chain

Creating an event triggers this sequence end-to-end:

```
1. Event saved to DB  →  2. ML scores it  →  3. Propagation ticks fire  →  4. Map updates live
```

---

## Feature Breakdowns

### Person 1 — Event Management + RBAC

**Why first:** Your spec calls this "the entry point for the entire system." Creating an event triggers the full downstream pipeline. RBAC is intentionally thin (two hardcoded JWT roles), so one person handles both.

**What to build:**
- Postgres schema (events, users, corridors)
- JWT auth with two seed accounts: `controller@gridlock.in` / `fleet@gridlock.in`
- Role middleware guarding `/controller/*` and `/fleet/*` route groups
- All event CRUD routes for planned and unplanned events
- WebSocket server setup
- BullMQ job scheduling on event creation

**Day 1 output:** An event can be POSTed to the API, saved to the DB, and a BullMQ job queues.

---

### Person 2 — ML Prediction Engine

**Why first:** Your spec is explicit: *"this is what separates GridLock from teams that just wrap an LLM."* The model's `severity_score` (0–1) is the seed intensity that the congestion engine uses. The rest of the team can stub it as `severity = 0.8` while training is in progress.

**What to build:**
- Filter the dataset to ~2460 records with valid `closed_datetime`
- Feature engineering: `hour_of_day`, `day_of_week` derived from `start_datetime`
- Train XGBoost or RandomForest on `duration_mins` as the target variable (capped at 1440 mins)
- Serve as FastAPI endpoint: `POST /api/ml/predict`
- Return `predicted_duration_mins`, `severity_score`, `severity_label`, `confidence`

**Day 1 output:** A working FastAPI endpoint that accepts event fields and returns a severity score.

**Severity score reference:**

| Score | Label |
|-------|-------|
| 0.0 – 0.3 | Low |
| 0.3 – 0.6 | Medium |
| 0.6 – 0.85 | High |
| 0.85 – 1.0 | Critical |

---

### Person 3 — Congestion Propagation Engine

**Why first:** This is the simulation heart of the product. Its only external dependency is the ML severity score — mock it as a constant (`0.8`) on day 1 and swap in the real API call on day 2.

**What to build:**
- Junction adjacency list from dataset junctions + known corridors
- Precompute `cascade_probability[corridor][hour_bucket]` from historical secondary incident data (incidents within 30 mins and 5 km of a primary)
- BFS tick algorithm seeded by ML severity score with decay factor
- BullMQ job `propagation-job:{event_id}` firing every 30 seconds
- WebSocket broadcast of active congestion nodes per tick

**Tick algorithm:**
```
seed_node    = nearest junction to event lat/lon
seed_intensity = severity_score from ML (0–1)
decay_factor   = f(duration_mins)

for each time_tick (every 5 mins simulated):
  for each active_node:
    propagate to neighbors weighted by cascade_probability
    reduce intensity by decay_factor
    if intensity < 0.05: remove from active set
```

**Day 1 output:** A BullMQ job that emits fake propagation ticks on a stubbed graph via WebSocket.

---

### Person 4 — Real-Time Monitoring Dashboard

**Why first:** This is what judges see. Person 4 can ship meaningful work on day 1 without waiting for Persons 2 or 3 — the static historical heatmap layer requires no ML at all.

**What to build:**
- React + Vite app with Leaflet.js map centred on Bengaluru
- **Layer 1 (static):** Historical risk heatmap from raw dataset — `GROUP BY junction, COUNT(*)`, normalised 0–1. No ML required.
- **Layer 2 (live):** Propagation overlay that updates every tick via WebSocket `propagation:tick` event
- Time slider: `[ NOW ] — [ +5 MIN ] — [ +15 MIN ] — [ +30 MIN ]`
- Event cards sidebar (active events, severity badge, fleet count)
- Alert panel at the bottom for pre-staging and anomaly alerts

**Day 1 output:** Leaflet map live with the historical incident heatmap rendered from the dataset.

---

## Why the AI Chatbot Is Phase 2 (Not Phase 1)

The chatbot injects active event state, ML predictions, and propagation outputs into every LLM prompt. Without that real data, you are demoing a generic chat window — which any other hackathon team can also build.

The same dependency applies to:
- **Fleet Dispatch** — needs ML severity score and propagation zone outputs as structured inputs to the LLM prompt
- **Barricade Recommendations** — same dependency
- **Fleet Member Interface** — needs dispatch tasks to exist before it has anything to show

Build all of these in phase 2 once the core loop is running end-to-end.

---

## Phase 2 Feature Queue

| Feature | Dependency |
|---------|------------|
| AI Chatbot | Active events + ML predictions + propagation state |
| Fleet Dispatch Engine | ML severity score + propagation zones |
| Barricade Recommendation Engine | ML + propagation + dispatch |
| Fleet Member Interface | Dispatch tasks must exist |
| Event Fingerprinting | Dataset querying add-on |
| Pre-Staging Alerts | BullMQ + event creation pipeline |
| Post-Event Accuracy Report | Event must be closeable |

---

## Day-by-Day Target

| Day | Milestone |
|-----|-----------|
| 1 | DB schema agreed, Leaflet map live, FastAPI stub running, BullMQ job queuing |
| 2 | Full end-to-end loop: POST event → ML scores → ticks fire → heatmap updates on screen |
| 3 | AI chatbot + fleet dispatch integrated |
| 4 | Fleet member interface + barricade recommendations |
| 5 | Polish demo flow, accuracy report, conflict detection |

---

## Quick Reference — Who Owns What

```
Person 1 (Backend)    →  DB schema, Auth, Event APIs, WebSocket server, BullMQ setup
Person 2 (ML/Python)  →  Dataset EDA, Model training, FastAPI /api/ml/predict
Person 3 (Simulation) →  Graph adjacency, Cascade probabilities, Propagation tick jobs
Person 4 (Frontend)   →  Leaflet map, Heatmap layers, WebSocket client, Dashboard UI
```