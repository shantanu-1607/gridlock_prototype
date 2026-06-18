# Congestion Propagation Engine - Advanced Implementation Plan

This document outlines the implementation plan for the Congestion Propagation Engine. While the initial feature plan requested a basic BFS tick algorithm with static decay, this plan **improvises and goes out of scope** to propose a more realistic, dynamic, and intervention-aware simulation engine.

## 🌟 Out-of-Scope Improvisations
To make GridLock truly stand out, the propagation engine will simulate actual traffic dynamics rather than just drawing expanding circles.

1. **Directional, Time-Weighted Graph:** Instead of symmetric propagation, we will model inbound vs. outbound flows. A breakdown heading into the CBD at 9:00 AM propagates backwards much faster than the same breakdown at 2:00 PM.
2. **Intervention-Aware Simulation:** The engine will actively read from the Redis cache~/…/gridlock_prototype $ docker compose build ml
￼
content_copy
Waiting for command completion (up to 300 seconds)
 for Barricade and Fleet deployments. If a barricade is confirmed by a controller, the cascade probability on that specific edge drops to `0`. If fleet is deployed, the node's recovery rate (decay factor) accelerates by `1.5x`.
3. **Queue Spillback & Bottlenecking:** Instead of a pure probability BFS, we will introduce a `queue_saturation` metric. Once a junction hits 100% saturation, it forces spillback to its upstream neighbors, triggering secondary nodes.
4. **Multi-Event Merging:** If two active events have propagation zones that touch, they will merge and create a non-linear spike in severity (GridLock condition).

> [!IMPORTANT]
> **User Review Required**
> Implementing a directional graph with queue spillback introduces more complexity than a simple probability BFS. 
> 1. Are you comfortable with moving the graph state entirely into Redis (so it can persist and mutate across ticks)?
> 2. Should we rely on the provided dataset to extract directional flow, or mock the inbound/outbound edge weights for the prototype?

## Proposed Changes

### 1. Core Services

#### [NEW] `apps/backend/src/services/graph.service.ts`
This service will be responsible for building and holding the initial road network graph.
- Load `nodes` (junctions) and `edges` (corridors) from the dataset.
- Extract historical `cascade_probability` but augment it with `direction` (Inbound/Outbound) and `hour_bucket`.
- Expose methods: `getNeighbors(nodeId)`, `getEdgeWeight(from, to, timeOfDay)`.

#### [NEW] `apps/backend/src/services/simulation.service.ts`
The heart of the new engine.
- Contains the `tick()` function logic.
- Implements the **Queue Spillback** math.
- Checks Redis for active barricades and fleet deployments to dynamically adjust edge weights before calculating the next tick's spread.
- Handles multi-event merging if multiple propagation workers overlap on the same nodes.

### 2. Worker Updates

#### [MODIFY] `apps/backend/src/workers/propagation.worker.ts`
- Remove the stubbed linear decay logic.
- Instead of just incrementing a counter, the worker will:
  1. Fetch the current state of the "active propagation zone" from Redis.
  2. Call `SimulationService.tick(activeZone, timeOfDay, interventions)`.
  3. Save the new state back to Redis.
  4. Broadcast the updated node intensities via WebSocket.
- Add listener logic for `barricade_deployed` and `fleet_deployed` pub/sub events to update the worker's cached state.

### 3. Queue & Event Triggers

#### [MODIFY] `apps/backend/src/services/queue.service.ts`
- Update `schedulePropagationJob` to accept the event's geographical coordinates and initialize the Redis state with the nearest junction as the `seed_node`.

### 4. Shared State (Redis)

- We will store the active propagation state in Redis Hashes.
- Key: `propagation:state:{eventId}`
- Value: JSON representing the active nodes, their current saturation/intensity, and queue lengths.

## Verification Plan

### Automated Tests
- Unit tests for `simulation.service.ts` to verify that placing a "barricade" strictly prevents propagation past that edge.
- Unit tests to ensure that inbound morning events propagate backwards correctly based on time-weighted edges.

### Manual Verification
1. Create a "Vehicle Breakdown" event on a major corridor during morning peak hours in the Dashboard.
2. Watch the heatmap propagation accelerate upstream.
3. Deploy a "Barricade" via the Controller Dashboard on an upstream junction.
4. Verify on the next tick (30s) that the heatmap stops propagating past the barricaded junction.
5. Deploy a "Fleet Member" to the epicenter.
6. Verify the decay factor accelerates and the heatmap recedes faster than the baseline.
