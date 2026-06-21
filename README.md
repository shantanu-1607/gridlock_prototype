# gridlock_prototype

# GridLock Project 2

An AI-powered Traffic Command Center for forecasting and managing event-driven congestion caused by planned and unplanned events. The system predicts congestion, simulates its propagation across the road network, recommends interventions such as fleet dispatch and barricade placement, and provides an AI assistant for traffic controllers.

---

# Problem Statement

Large-scale events such as festivals, concerts, political rallies, sports matches, accidents, and sudden gatherings create localized traffic breakdowns. Current traffic management systems are largely reactive, relying on manual monitoring and operator experience.

GridLock aims to provide:

* Traffic impact forecasting
* Congestion propagation simulation
* Intelligent resource deployment
* Real-time monitoring and intervention
* AI-assisted traffic management

---

# Users

## 1. Controller

Traffic command center operators responsible for:

* Monitoring traffic conditions
* Managing events
* Deploying fleet members
* Placing barricades
* Viewing congestion heatmaps
* Interacting with the AI assistant

## 2. Fleet Member

On-ground personnel responsible for:

* Receiving dispatch instructions
* Viewing assigned routes
* Reporting road conditions
* Updating barricade status
* Sending incident updates

---

# Features

## 1. Role-Based Access Control (RBAC)

### Controller

* Create and manage events
* View analytics and predictions
* Dispatch fleets
* Place barricades
* Access AI chatbot
* View heatmaps and simulations

### Fleet Member

* View assignments
* Update task status
* Report incidents
* Share real-time updates

---

## 2. Ambient AI Engine

Continuously processes:

* Historical traffic data
* Event information
* Fleet updates
* Real-time traffic signals
* Incident reports

Capabilities:

* Background traffic monitoring
* Dynamic congestion prediction
* Automatic intervention recommendations
* Continuous learning from new events

---

## 3. Congestion Propagation Engine

Simulates how traffic congestion spreads across the road network.

### Heatmap Generation

Displays:

🟢 Low congestion

🟡 Medium congestion

🔴 Severe congestion

Predictions for:

* 5 minutes
* 15 minutes
* 30 minutes

---

### Barricade Placement Optimizer

Recommends:

* Optimal barricade locations
* Required number of barricades
* Activation timings

Objective:

Reduce congestion spillover and improve traffic flow.

---

### Fleet Dispatch Engine

Recommends:

* Number of fleet members required
* Deployment locations
* Priority intervention zones
* Dynamic reassignment during incidents

---

## 4. Planned and Unplanned Event Management

### Planned Events

* Festivals
* Sports events
* Political rallies
* Concerts
* Construction activities

### Unplanned Events

* Accidents
* Sudden gatherings
* Protests
* Emergency road closures

The system automatically adjusts recommendations based on event type and severity.

---

## 5. Time-Based Forecasting

Supports traffic forecasting at multiple horizons:

* Real-time
* +5 minutes
* +15 minutes
* +30 minutes
* Event start and end windows

Predictions include:

* Congestion score
* Expected delays
* Affected roads
* Resource requirements

---

## 6. AI Chatbot for Planned Events

Natural language interface for controllers.

Examples:

> How many fleet members are required for tomorrow's concert?

> Which roads will be affected by the cricket match?

> What happens if it starts raining during the event?

> Suggest diversion plans for the festival.

Capabilities:

* Event analysis
* Scenario simulation
* Resource recommendations
* Explainable predictions

---

# Concise System Architecture

```text
                      ┌──────────────────────┐
                      │   Controller UI      │
                      └──────────┬───────────┘
                                 │
                      ┌──────────▼───────────┐
                      │   React + Vite App   │
                      └──────────┬───────────┘
                                 │
                   WebSocket (Real-Time Updates)
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
   ┌──────────▼──────────┐              ┌──────────▼──────────┐
   │   API Services      │              │   AI Chat Service   │
   │      (TS)           │              │     LangChain       │
   └──────────┬──────────┘              └──────────┬──────────┘
              │                                     │
              └──────────────┬──────────────────────┘
                             │
                  ┌──────────▼───────────┐
                  │ Ambient AI Engine    │
                  │ Congestion Engine    │
                  │ Dispatch Engine      │
                  │ Barricade Engine     │
                  └──────────┬───────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
 ┌────────▼───────┐  ┌────────▼───────┐  ┌──────▼───────┐
 │ PostgreSQL     │  │ Redis          │  │ PGVector     │
 │ Events         │  │ Cache          │  │ Embeddings   │
 │ Users          │  │ Sessions       │  │ Knowledge    │
 │ Traffic Data   │  │ Queues         │  │ Event Docs   │
 └────────┬────────┘  └────────┬───────┘  └──────────────┘
          │                   │
          │            ┌──────▼──────┐
          │            │   BullMQ    │
          │            │ Background  │
          │            │ Predictions │
          │            │ Simulations │
          │            └─────────────┘
```

---

# Tech Stack

## Frontend

* React (Vite)
* TypeScript
* WebSockets

## Backend

* TypeScript APIs
* Redis
* BullMQ

## Database

* PostgreSQL
* PGVector

## AI & Intelligence

* LangChain
* Ambient AI Engine
* Congestion Propagation Simulator
* Recommendation Engine

---

# Core Workflow

```text
Event Created
      ↓
Traffic Forecast Generated
      ↓
Congestion Propagation Simulation
      ↓
Heatmap Generation
      ↓
Barricade Recommendation
      ↓
Fleet Dispatch Recommendation
      ↓
Real-Time Monitoring
      ↓
AI Chat Assistance
      ↓
Post-Event Learning
```

---

# Vision

GridLock aims to become an AI-powered traffic command platform capable of forecasting, simulating, and mitigating event-driven congestion through intelligent recommendations and real-time decision support.
