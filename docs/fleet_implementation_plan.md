# Fleet Dispatch & Field Operations — Live Connection

## Overview

The app has a solid backend foundation for fleet dispatch that is mostly unused by the frontend:
- **DB schema** (`003_fleet_dispatch.sql`) defines `users` and `fleet_assignments` tables with availability status, priority, and status flow.
- **`events.controller.ts`** already has basic assignment fetching logic.
- **`FleetDashboard.tsx`** is fully hardcoded with mock data.
- **`LiveEventDetailsCard.tsx`** shows assignments in read-only mode.

This implementation plan is structured **phase-wise**, allowing you to build the core end-to-end dispatch loop first, and then progressively layer on the advanced differentiators for the "wow" factor.

---

## Phase 1: Core Foundation (Auth, DB, Basic APIs)

Establish the basic connectivity between the backend and the fleet users.

### Backend Changes
1. **[MODIFY] `003_fleet_dispatch.sql` (or create new migration)**
   - Add `password` column to `users` table.
   - Seed the 10 existing fleet demo users with a hashed default password (e.g., `gridlock`).
2. **[NEW] `fleet.controller.ts` & `fleet.routes.ts`**
   - `GET /api/fleet/available`: Returns users with `status = 'available'`.
   - `POST /api/fleet/assign`: Creates a `fleet_assignments` row.
   - `GET /api/fleet/my-assignments`: Returns assignments for the logged-in user.
   - `PATCH /api/fleet/my-assignments/:id/status`: Updates assignment status.
3. **[MODIFY] `index.ts`**
   - Register the new `/api/fleet` routes.

### Frontend Changes
1. **[MODIFY] `utils/api.ts` & `types/index.ts`**
   - Add TS interfaces for `FleetMember` and `FleetAssignment`.
   - Export 4 async functions calling the new endpoints (`getAvailableFleet`, `assignFleetMember`, `getMyAssignments`, `updateMyAssignmentStatus`).

---

## Phase 2: Core Dispatch Flow (Controller UI & Fleet Dashboard)

Wire up the frontend UIs to use the new APIs, replacing mock data.

### Controller UI
1. **[MODIFY] `LiveEventDetailsCard.tsx`**
   - Add an expandable **"Dispatch Fleet"** section.
   - Call `getAvailableFleet()` to populate a dropdown.
   - Add form fields: **Junction Name**, **Role**, **Priority**.
   - On submit, call `assignFleetMember()` and refresh the event details.

### Fleet UI
2. **[MODIFY] `FleetDashboard.tsx`**
   - Remove `MOCK_ASSIGNMENTS` and fetch live data via `getMyAssignments()` on mount.
   - Implement basic polling (e.g., every 15s) to check for new assignments.
   - Update the "Accept" and "Arrived" buttons to call `updateMyAssignmentStatus()` and optimistically update the local state.

---

## Phase 3: Differentiator — Specialized Fleet Roles

Enhance the dispatch process by matching specific needs to specific equipment/skills.

### Backend Changes
1. **[MODIFY] DB Schema & Seed**
   - Add `specialty` column to `users` table (e.g., 'Heavy Tow Truck', 'Barricade Specialist', 'Traffic Control').
   - Update `getAvailableFleet` to return this specialty.

### Frontend Changes
2. **[MODIFY] `LiveEventDetailsCard.tsx`**
   - Add a "Filter by Capability" dropdown in the dispatch panel.
   - Instead of just showing names, display the fleet member's specialty and distance alongside their name, ensuring the controller dispatches the right tool for the job.

---

## Phase 4: Differentiator — Live Map Tracking (Telemetry)

Provide a massive visual upgrade by showing fleet members moving on the map in real-time.

### Backend Changes
1. **[MODIFY] `events.gateway.ts`**
   - Add WebSocket listeners for `fleet:location_update` payloads from the fleet app.
   - Re-broadcast these as `controller:fleet_locations` to all connected controller clients.

### Frontend Changes
2. **[MODIFY] `FleetDashboard.tsx`**
   - When a user is `en_route`, start `navigator.geolocation.watchPosition()`.
   - Emit the GPS coordinates to the WebSocket every 5 seconds.
3. **[MODIFY] `MapView.tsx`**
   - Listen for `controller:fleet_locations` WebSocket events.
   - Render dynamic Leaflet markers on the map for active fleet members.

---

## Phase 5: Differentiator — Smart ETA & Geofence Auto-Arrival

Replace static timers and manual buttons with intelligent automation.

### Smart ETA (Frontend & Backend)
1. **[MODIFY] `utils/mappls.ts` & `FleetDashboard.tsx`**
   - While the fleet member is `en_route`, periodically ping the Mappls Distance Matrix API with their current live location vs the target junction.
   - Display a dynamic, traffic-aware "Time to Arrival" instead of the static `deploy_by_time`.

### Geofence Auto-Arrival (Frontend)
2. **[MODIFY] `FleetDashboard.tsx`**
   - Inside the existing `watchPosition` callback (from Phase 4), calculate the Haversine distance to the target junction.
   - **Trigger**: If `distance < 100` meters, automatically fire `updateMyAssignmentStatus(..., 'on_site')`.
   - Show a success toast to the fleet member: *"Geofence reached. Controller notified."*

---

## Verification Plan

### End-to-End Walkthrough
1. **Phase 1 & 2**: Controller assigns a standard fleet member. Fleet member logs in, sees assignment, and accepts.
2. **Phase 3**: Controller filters for a "Heavy Tow Truck" and dispatches them to a severe blockage.
3. **Phase 4**: Controller watches the map as the newly dispatched tow truck icon moves along the roads toward the incident.
4. **Phase 5**: The fleet member's ETA updates dynamically based on traffic. As they physically arrive (simulated via dev tools), the status auto-updates to 'On Site' without them touching their device.
