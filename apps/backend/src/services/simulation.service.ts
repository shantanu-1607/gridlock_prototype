import { graphService } from './graph.service'

export interface PropagationState {
  activeNodes: Record<
    string,
    {
      intensity: number
      discoveredAtTick: number
    }
  >
  currentTick: number
}

export interface Interventions {
  barricades: string[] // List of junction IDs with barricades (stops propagation to them)
  fleetDeployments: string[] // List of junction IDs with fleet (accelerates decay)
}

export class SimulationService {
  /**
   * Initializes the simulation state starting from a single epicenter.
   */
  public initializeState(lat: number, lon: number, initialSeverity: number): PropagationState {
    const nearest = graphService.getNearestJunction(lat, lon)

    const state: PropagationState = {
      activeNodes: {},
      currentTick: 0,
    }

    if (nearest) {
      state.activeNodes[nearest.id] = {
        intensity: initialSeverity,
        discoveredAtTick: 0,
      }
      console.log(
        `[Simulation] Initialized epicenter at ${nearest.id} (${nearest.name}) with severity ${initialSeverity}`,
      )
    } else {
      console.warn(`[Simulation] No junction found near (${lat}, ${lon}) — empty initial state`)
    }

    return state
  }

  /**
   * Advances the simulation by one tick using a simple probability-based BFS spread.
   */
  public tick(state: PropagationState, interventions: Interventions): PropagationState {
    const newState: PropagationState = {
      activeNodes: { ...state.activeNodes },
      currentTick: state.currentTick + 1,
    }

    const nodesToPropagate = Object.keys(newState.activeNodes)

    // 1. Propagate to neighbors
    for (const nodeId of nodesToPropagate) {
      const nodeData = newState.activeNodes[nodeId]

      // Only nodes with sufficient intensity can propagate
      if (nodeData.intensity < 0.2) continue

      const neighbors = graphService.getNeighbors(nodeId)
      for (const edge of neighbors) {
        const neighborId = edge.target

        // If the neighbor is barricaded, it blocks propagation entirely
        if (interventions.barricades.includes(neighborId)) {
          continue
        }

        // Check if neighbor is already active
        if (!newState.activeNodes[neighborId]) {
          // Simple probability check to see if congestion spreads
          // We use the edge's cascadeProbability multiplied by current intensity
          const spreadChance = edge.cascadeProbability * nodeData.intensity
          const roll = Math.random()
          if (roll < spreadChance) {
            const childIntensity = nodeData.intensity * 0.8
            newState.activeNodes[neighborId] = {
              intensity: childIntensity,
              discoveredAtTick: newState.currentTick,
            }
            console.log(
              `[Simulation] Tick ${newState.currentTick}: SPREAD ${nodeId} → ${neighborId} | roll=${roll.toFixed(3)} < chance=${spreadChance.toFixed(3)} | intensity=${childIntensity.toFixed(3)}`,
            )
          } else {
            console.log(
              `[Simulation] Tick ${newState.currentTick}: NO SPREAD ${nodeId} → ${neighborId} | roll=${roll.toFixed(3)} >= chance=${spreadChance.toFixed(3)}`,
            )
          }
        }
      }
    }

    // 2. Apply decay to all active nodes
    for (const nodeId of Object.keys(newState.activeNodes)) {
      let decayFactor = 0.05 // Base decay per tick

      // If fleet is deployed at this node, recovery is much faster
      if (interventions.fleetDeployments.includes(nodeId)) {
        decayFactor = 0.15
      }

      newState.activeNodes[nodeId].intensity -= decayFactor

      // 3. Remove recovered nodes
      if (newState.activeNodes[nodeId].intensity < 0.05) {
        console.log(
          `[Simulation] Tick ${newState.currentTick}: RECOVERED ${nodeId} (intensity dropped below 0.05)`,
        )
        delete newState.activeNodes[nodeId]
      } else {
        console.log(
          `[Simulation] Tick ${newState.currentTick}: DECAY ${nodeId} intensity=${newState.activeNodes[nodeId].intensity.toFixed(3)} (decay=${decayFactor})`,
        )
      }
    }

    const activeCount = Object.keys(newState.activeNodes).length
    console.log(
      `[Simulation] Tick ${newState.currentTick} complete — ${activeCount} active node(s): [${Object.keys(newState.activeNodes).join(', ')}]`,
    )
    return newState
  }
}

export const simulationService = new SimulationService()
