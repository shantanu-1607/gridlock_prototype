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

export interface CongestionForecast {
  t0_nodes: string[]
  t15_nodes: string[]
  t30_nodes: string[]
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
   * Advances the simulation by one tick using a queue spillback and time-weighted spread.
   */
  public tick(
    state: PropagationState,
    interventions: Interventions,
    timeOfDayOrSilent: string | boolean = '12:00',
    otherActiveNodes: string[] = [],
    silent = false,
    initialSeverity = 1.0,
    durationMins = 30,
  ): PropagationState {
    const timeOfDay = typeof timeOfDayOrSilent === 'string' ? timeOfDayOrSilent : '12:00'
    if (typeof timeOfDayOrSilent === 'boolean') {
      silent = timeOfDayOrSilent
    }

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
          // Throttle the spread chance per tick (max 5%) so congestion creeps realistically over time
          const spreadFactor = 0.05
          let spreadChance =
            spreadFactor *
            graphService.getEdgeWeight(nodeId, neighborId, timeOfDay) *
            nodeData.intensity
          // Linear drop-off guarantees congestion stops after ~4 hops instead of infecting the entire map
          let childIntensity = nodeData.intensity - 0.25

          // Multi-event merging
          if (otherActiveNodes.includes(neighborId)) {
            spreadChance = 1.0 // guaranteed merge
            childIntensity = Math.min(1.0, childIntensity + 0.5) // GridLock condition spike
            console.log(`[Simulation] GRIDLOCK MERGE at ${neighborId}`)
          }

          // Queue Spillback
          if (nodeData.intensity >= 1.0) {
            spreadChance = 1.0
            console.log(`[Simulation] QUEUE SPILLBACK from ${nodeId} -> ${neighborId}`)
          }

          const roll = Math.random()
          if (roll < spreadChance) {
            newState.activeNodes[neighborId] = {
              intensity: childIntensity,
              discoveredAtTick: newState.currentTick,
            }
            if (!silent) {
              console.log(
                `[Simulation] Tick ${newState.currentTick}: SPREAD ${nodeId} → ${neighborId} | roll=${roll.toFixed(3)} < chance=${spreadChance.toFixed(3)} | intensity=${childIntensity.toFixed(3)}`,
              )
            }
          } else if (!silent) {
            console.log(
              `[Simulation] Tick ${newState.currentTick}: NO SPREAD ${nodeId} → ${neighborId} | roll=${roll.toFixed(3)} >= chance=${spreadChance.toFixed(3)}`,
            )
          }
        }
      }
    }

    // 2. Apply decay to all active nodes
    for (const nodeId of Object.keys(newState.activeNodes)) {
      // Calculate decay factor based on severity and duration
      // 1 tick = 30 seconds = 0.5 mins
      // durationMins / 0.5 = total ticks
      // If we want it to decay from initialSeverity to 0 over total ticks:
      const totalTicks = Math.max(1, durationMins * 2)
      let decayFactor = initialSeverity / totalTicks

      // If fleet is deployed at this node, recovery is 1.5x faster
      if (interventions.fleetDeployments.includes(nodeId)) {
        decayFactor *= 1.5
      }

      newState.activeNodes[nodeId].intensity -= decayFactor

      // 3. Remove recovered nodes
      if (newState.activeNodes[nodeId].intensity < 0.05) {
        if (!silent) {
          console.log(
            `[Simulation] Tick ${newState.currentTick}: RECOVERED ${nodeId} (intensity dropped below 0.05)`,
          )
        }
        delete newState.activeNodes[nodeId]
      } else if (!silent) {
        console.log(
          `[Simulation] Tick ${newState.currentTick}: DECAY ${nodeId} intensity=${newState.activeNodes[nodeId].intensity.toFixed(3)} (decay=${decayFactor})`,
        )
      }
    }

    const activeCount = Object.keys(newState.activeNodes).length
    if (!silent) {
      console.log(
        `[Simulation] Tick ${newState.currentTick} complete — ${activeCount} active node(s): [${Object.keys(newState.activeNodes).join(', ')}]`,
      )
    }
    return newState
  }

  /**
   * Fast-forwards propagation from a fresh epicenter to produce a T+0/T+15/T+30
   * snapshot, without touching Redis state or broadcasting ticks. Used by the
   * recommendation context aggregator before any interventions exist.
   */
  public getCongestionForecast(
    lat: number,
    lon: number,
    initialSeverity: number,
    durationMins: number = 30,
  ): CongestionForecast {
    const noIntervention: Interventions = { barricades: [], fleetDeployments: [] }
    const ticksPerMinute = 2 // tick cadence matches the 30s propagation job

    let state = this.initializeState(lat, lon, initialSeverity)
    const t0Nodes = Object.keys(state.activeNodes)

    for (let i = 0; i < 15 * ticksPerMinute; i++) {
      state = this.tick(state, noIntervention, true, [], true, initialSeverity, durationMins)
    }
    const t15Nodes = Object.keys(state.activeNodes)

    for (let i = 0; i < 15 * ticksPerMinute; i++) {
      state = this.tick(state, noIntervention, true, [], true, initialSeverity, durationMins)
    }
    const t30Nodes = Object.keys(state.activeNodes)

    return { t0_nodes: t0Nodes, t15_nodes: t15Nodes, t30_nodes: t30Nodes }
  }
}

export const simulationService = new SimulationService()
