# GridLock API Testing Guide & Schema Analysis

This document provides a detailed breakdown of the GridLock database schema (including exact columns, constraints, and indexes) along with a step-by-step sequence and JSON payloads to run end-to-end tests (including **proactive planning, reactive incident dispatch, fleet check-in lifecycle, barricade interventions, and post-event counterfactual analysis**) using Postman or any HTTP client.

---

## 1. Complete Database Schema Analysis

The GridLock system utilizes PostgreSQL to store event states, planning pipeline details, user roles, and fleet deployment tasks. Below are the exact schemas of the three main tables.

### A. The `events` Table
Stores details of both real-time incidents (`unplanned`) and upcoming events (`planned`), including ML prediction outputs, simulation propagation states, and LLM dispatch plans.

#### Columns
| Column | Data Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| **`id`** | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Unique identifier for each traffic event. |
| **`type`** | `VARCHAR(50)` | `NOT NULL` | The event type: `'planned'` or `'unplanned'`. |
| **`category`** | `VARCHAR(50)` | `NOT NULL` | Classification (e.g., `'public_event'`, `'vehicle_breakdown'`, `'protest'`, `'rain_water_logging'`, `'accident'`, `'road_work'`). |
| **`name`** | `TEXT` | | Human-friendly title of the event. |
| **`description`** | `TEXT` | | Details regarding the event nature. |
| **`lat`** | `DOUBLE PRECISION` | `NOT NULL` | Latitude coordinate of the event center. |
| **`lon`** | `DOUBLE PRECISION` | `NOT NULL` | Longitude coordinate of the event center. |
| **`expected_crowd_size`** | `INTEGER` | | Expected headcount (mostly for planned events). |
| **`start_datetime`** | `TIMESTAMP` | `NOT NULL` | Scheduled or actual start date/time. |
| **`expected_end_datetime`**| `TIMESTAMP` | | Scheduled or predicted end date/time. |
| **`closed_datetime`** | `TIMESTAMP` | | Actual timestamp when the event is marked closed. |
| **`affected_corridors`** | `TEXT[]` | | Array of road corridors impacted. |
| **`requires_road_closure`**| `BOOLEAN` | `DEFAULT false` | Flag indicating if a physical road closure is active. |
| **`veh_type`** | `VARCHAR(50)` | | Type of vehicle involved (mostly for breakdowns). |
| **`priority`** | `VARCHAR(50)` | | Severity rank: `'Low'`, `'Medium'`, `'High'`, `'Critical'`. |
| **`duration_mins`** | `DOUBLE PRECISION` | | Predicted or actual event duration in minutes. |
| **`severity_score`** | `NUMERIC(5, 2)` | | Severity of congestion, ranges from `0.00` to `1.00`. |
| **`status`** | `VARCHAR(50)` | `DEFAULT 'created'` | Current lifecycle stage: `'created'`, `'planned'`, `'active'`, `'monitoring'`, `'closed'`, `'reported'`. |
| **`created_at`** | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Row creation timestamp. |
| **`updated_at`** | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Automatically updated on row updates. |
| **`predicted_duration_mins`**| `NUMERIC(8, 2)`| | ML-predicted duration computed by planning pipeline. |
| **`blocking_probability`**| `NUMERIC(5, 4)`| | ML-predicted chance that roads are fully blocked. |
| **`risk_level`** | `VARCHAR(20)` | | Criticality coding: `'green'`, `'yellow'`, `'orange'`, `'red'`. |
| **`queue_length`** | `NUMERIC(8, 1)`| | Predicted congestion queue length (meters). |
| **`time_to_spillover`** | `NUMERIC(8, 1)`| | Minutes until queue overflows. `-1` if no spillover. |
| **`deployment_plan`** | `JSONB` | `DEFAULT '{}'` | JSON layout of officer & barricade placements per junction. |
| **`gating_plan`** | `JSONB` | `DEFAULT '{}'` | Upstream signal adjustment plans. |
| **`similar_incidents`** | `JSONB` | `DEFAULT '[]'` | Matching historical events from ML fingerprint service. |
| **`propagation_forecast`** | `JSONB` | `DEFAULT '{}'` | Predicted propagation state at `T+5`, `T+15`, `T+30` min. |
| **`prestaging_timeline`** | `JSONB` | `DEFAULT '[]'` | Pre-staging countdown sequence starting at T-60 min. |
| **`anomaly_score`** | `NUMERIC(6, 4)`| | Anomaly score of duration/severity compared to baseline. |
| **`anomaly_label`** | `VARCHAR(30)` | | Anomaly classification (e.g. `'normal'`, `'outlier'`). |
| **`counterfactual`** | `JSONB` | `DEFAULT '{}'` | Post-event comparison of alternative mitigation policies. |
| **`recommendation_status`**| `VARCHAR(50)` | `DEFAULT 'pending'` | Status of AI fleet dispatch recommendations. |
| **`recommendation_rationale`**| `TEXT` | | The reasoning behind LLM dispatch recommendation decisions. |
| **`total_fleet_required`**| `INTEGER` | `DEFAULT 0` | The total number of personnel assigned to the event. |

#### Constraints
* `CONSTRAINT events_pkey`: `PRIMARY KEY (id)`

#### Indexes
* `UNIQUE INDEX events_pkey`: `USING BTREE (id)`
* `INDEX idx_events_start_datetime`: `USING BTREE (start_datetime)`
* `INDEX idx_events_status_type`: `USING BTREE (status, type)`

---

### B. The `fleet_assignments` Table
Maps fleet members to specific junctions near active events, tracking their deployment lifecycle.

#### Columns
| Column | Data Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| **`id`** | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Unique assignment identifier. |
| **`event_id`** | `UUID` | | Link to the active traffic event. |
| **`user_id`** | `UUID` | | Link to the assigned user (`fleet` role). |
| **`junction_name`** | `VARCHAR(255)` | `NOT NULL` | Target junction name where officer is deployed. |
| **`role`** | `VARCHAR(100)` | `NOT NULL` | Dedicated task role (e.g., `'diversion_control'`). |
| **`deploy_by_time`** | `TIMESTAMP` | | Deadline timestamp for personnel to arrive on-site. |
| **`priority`** | `VARCHAR(50)` | `DEFAULT 'Medium'` | Deployment priority status. |
| **`status`** | `VARCHAR(50)` | `DEFAULT 'pending'` | Officer's status on this assignment. |
| **`created_at`** | `TIMESTAMP` | `DEFAULT now()` | Date of assignment issuance. |
| **`updated_at`** | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Automatically updated on task updates. |

#### Constraints
* `CONSTRAINT fleet_assignments_pkey`: `PRIMARY KEY (id)`
* `CONSTRAINT fleet_assignments_event_id_fkey`: `FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE`
* `CONSTRAINT fleet_assignments_user_id_fkey`: `FOREIGN KEY (user_id) REFERENCES users(id)`
* `CONSTRAINT fleet_assignments_status_check`: `CHECK (status IN ('pending', 'en_route', 'on_site', 'completed', 'blocked'))`

#### Indexes
* `UNIQUE INDEX fleet_assignments_pkey`: `USING BTREE (id)`

---

### C. The `users` Table
Stores registered users, including on-ground traffic personnel (`fleet`) and central operators (`controller`).

#### Columns
| Column | Data Type | Constraints / Default | Description |
| :--- | :--- | :--- | :--- |
| **`id`** | `UUID` | `PRIMARY KEY`, `DEFAULT uuid_generate_v4()` | Unique user identifier. |
| **`email`** | `VARCHAR(255)` | `UNIQUE`, `NOT NULL` | E-mail address for authentication. |
| **`role`** | `VARCHAR(50)` | `NOT NULL` | User role on the platform: `'controller'` or `'fleet'`. |
| **`name`** | `VARCHAR(255)` | `NOT NULL` | Personnel's full name. |
| **`status`** | `VARCHAR(50)` | `DEFAULT 'available'` | Active status of fleet member. |
| **`current_lat`** | `DOUBLE PRECISION`| | Current latitude coordinate of fleet member. |
| **`current_lon`** | `DOUBLE PRECISION`| | Current longitude coordinate of fleet member. |
| **`last_location_update`**| `TIMESTAMP` | `DEFAULT now()` | Timestamp of last GPS ping. |
| **`created_at`** | `TIMESTAMP` | `DEFAULT now()` | Row insertion timestamp. |

#### Constraints
* `CONSTRAINT users_pkey`: `PRIMARY KEY (id)`
* `CONSTRAINT users_email_key`: `UNIQUE (email)`
* `CONSTRAINT users_role_check`: `CHECK (role IN ('controller', 'fleet'))`
* `CONSTRAINT users_status_check`: `CHECK (status IN ('available', 'dispatched', 'on_site', 'off_duty'))`

#### Indexes
* `UNIQUE INDEX users_pkey`: `USING BTREE (id)`
* `UNIQUE INDEX users_email_key`: `USING BTREE (email)`

---

## 2. End-to-End Postman Testing Sequence

Configure a **Postman Environment** with:
- `baseUrl`: `http://localhost:4000/api`

### Step 1: Verify System Health
Verifies that the backend API, Postgres connection, and local routers are fully functional.

- **Method**: `GET`
- **URL**: `{{baseUrl}}/health`
- **Expected Response**:
  ```json
  {
    "status": "ok",
    "message": "GridLock Backend API is healthy",
    "timestamp": "2026-06-19T02:30:00.000Z"
  }
  ```

---

### Step 2: Fetch System Junctions (Optional Context Check)
Retrieves the list of junctions and coordinates to ensure your test location coordinates align with the simulator.
- **Method**: `GET`
- **URL**: `{{baseUrl}}/graph/junctions`

---

### Step 3: Plan an Upcoming Event (Proactive Pipeline)
Triggers the full proactive analysis flow: calls the ML predict, queueing analysis, anomaly detection, and gating endpoints, generates simulation forecasts, builds a pre-staging timeline, and registers a future execution job.

- **Method**: `POST`
- **URL**: `{{baseUrl}}/events/plan`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "type": "planned",
    "category": "public_event",
    "name": "IPL Match at Chinnaswamy Stadium",
    "description": "High-attendance sports event leading to anticipated massive pedestrian flow and traffic diversion around CBD.",
    "lat": 12.976696,
    "lon": 77.586048,
    "expected_crowd_size": 35000,
    "start_datetime": "2026-06-25T18:00:00Z",
    "expected_end_datetime": "2026-06-25T22:30:00Z",
    "affected_corridors": ["Bellary Road", "Hosur Road"],
    "requires_road_closure": true,
    "veh_type": "two_wheeler",
    "priority": "High"
  }
  ```
- **Postman Test Script (Globals Set)**:
  Under the **Tests** tab:
  ```javascript
  const response = pm.response.json();
  if (response.event && response.event.id) {
      pm.globals.set("plannedEventId", response.event.id);
  }
  ```

---

### Step 4: Create a Real-Time/Active Traffic Incident (Reactive Pipeline)
Triggers the reactive dispatch pipeline: queries the ML predict model, flags spatial-temporal conflicts, queries the Groq LLM model to generate deployment recommendations, seeds pending assignments for nearest fleet members, and sends alerts via WebSockets.

- **Method**: `POST`
- **URL**: `{{baseUrl}}/events`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "type": "unplanned",
    "category": "vehicle_breakdown",
    "name": "KSRTC Bus Breakdown at Silk Board",
    "description": "Double-decker bus stalled on main highway ramp, blocking outbound lane completely.",
    "lat": 12.917013,
    "lon": 77.622874,
    "start_datetime": "2026-06-19T02:30:00Z",
    "affected_corridors": ["ORR East 1"],
    "requires_road_closure": false,
    "veh_type": "heavy_vehicle",
    "priority": "Medium"
  }
  ```
- **Postman Test Script (Globals Set)**:
  Under the **Tests** tab:
  ```javascript
  const response = pm.response.json();
  if (response.event && response.event.id) {
      pm.globals.set("activeEventId", response.event.id);
  }
  ```

---

### Step 5: Fetch Auto-Generated Fleet Assignments
Gets all tasks automatically assigned to nearest fleet members for the newly created incident.

- **Method**: `GET`
- **URL**: `{{baseUrl}}/events/{{activeEventId}}/assignments`
- **Expected Response**:
  ```json
  {
    "assignments": [
      {
        "id": "assignment-uuid-here",
        "event_id": "active-event-uuid-here",
        "user_id": "officer-uuid-here",
        "junction_name": "Silk Board Junc",
        "role": "traffic_direction",
        "priority": "Critical",
        "status": "pending",
        "user_name": "Officer Venkat",
        "user_email": "venkat@gridlock.org"
      }
    ]
  }
  ```
- **Postman Test Script (Globals Set)**:
  Under the **Tests** tab:
  ```javascript
  const response = pm.response.json();
  if (response.assignments && response.assignments.length > 0) {
      pm.globals.set("activeAssignmentId", response.assignments[0].id);
  }
  ```

---

### Step 6: Dispatch Officer (Set 'en_route')
Update the officer's status to notify that they are traveling to their station.

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/events/{{activeEventId}}/assignments/{{activeAssignmentId}}`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "status": "en_route"
  }
  ```

---

### Step 7: Deploy Officer On-Site (Set 'on_site')
Simulate the officer arriving at the junction. Changing the status to `'on_site'` triggers a direct hook that registers the deployment within the Redis simulation engine and broadcasts it.

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/events/{{activeEventId}}/assignments/{{activeAssignmentId}}`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "status": "on_site"
  }
  ```
- **Simulated Impact**: Outbound congestion decay rate at Silk Board is accelerated by **1.5x**.

---

### Step 8: Deploy Physical Barricade
Register a barricade at a specific junction. This intervention completely halts congestion propagation to the target node.

- **Method**: `POST`
- **URL**: `{{baseUrl}}/events/{{activeEventId}}/barricades`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "junctionId": "ayyappaTempleJunc"
  }
  ```
- **Simulated Impact**: Congestion propagation is blocked at Ayyappa Temple Junc.

---

### Step 9: Close Event (Triggers Post-Event Analysis & Counterfactuals)
Updates the event status to `'closed'`, stopping active recurring simulation jobs and calculating policy regrets based on actual vs. simulated outcomes.

- **Method**: `PUT`
- **URL**: `{{baseUrl}}/events/{{activeEventId}}`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "status": "closed",
    "closed_datetime": "2026-06-19T04:15:00Z"
  }
  ```

---

### Step 10: Verify Counterfactual Analysis in DB
Fetch the closed event one final time to evaluate the `"counterfactual"` comparisons.

- **Method**: `GET`
- **URL**: `{{baseUrl}}/events/{{activeEventId}}`
- **Expected Fields in Response**:
  - `counterfactual.policy_regret_pct`: Shows the percentage score representing alternative policy effectiveness.
  - `counterfactual.simulated_no_intervention_duration`: How long the queue would have lasted without our officer check-ins (`on_site`) and barricade placements.

---

## 3. Real-Time Websocket Validation

GridLock broadcasts all state transitions in real time. Use Postman's **WebSocket Request** type to hook into these:

1. **Connection URL**: `ws://localhost:4000`
2. **Action**: Click **Connect**.
3. **Event Subscriptions to Watch**:
   - `propagation:tick`: Dispatched every 30 seconds showing current active congestion node clusters.
   - `fleet:dispatched`: Received when the event is initially created (Step 4), containing assigned officer IDs.
   - `fleet:status_updated`: Received when updating officer status to `en_route` or `on_site` (Steps 6 & 7).
   - `barricade:deployed`: Received when a barricade is placed (Step 8).
