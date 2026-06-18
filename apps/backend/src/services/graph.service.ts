export interface Junction {
  id: string
  name: string
  lat: number
  lon: number
}

export interface Edge {
  source: string
  target: string
  corridor: string
  cascadeProbability: number // base probability of congestion spreading (0 to 1)
}

class GraphService {
  public junctions: Map<string, Junction>
  public adjacencyList: Map<string, Edge[]>

  constructor() {
    this.junctions = new Map()
    this.adjacencyList = new Map()
    this.initializeMockGraph()
  }

  private initializeMockGraph() {
    // Mock junctions based on feature plan
    const mockJunctions: Junction[] = [
      { id: 'jalahalli_cross', name: 'JalahalliCross', lat: 13.04, lon: 77.518 },
      { id: 'sm_circle', name: 'SMCircle', lat: 13.039, lon: 77.519 },
      { id: 'peenya_industrial', name: 'PeenyaIndustrial', lat: 13.032, lon: 77.525 },
      { id: 'anil_kumble_circle', name: 'Anil Kumble Circle', lat: 12.977, lon: 77.602 },
      { id: 'queens_statue_circle', name: 'Queens Statue Circle', lat: 12.978, lon: 77.599 },
      { id: 'mg_road', name: 'MG Road', lat: 12.975, lon: 77.606 },
    ]

    mockJunctions.forEach((j) => this.junctions.set(j.id, j))

    console.log(`[GraphService] Loaded ${mockJunctions.length} junctions:`)
    mockJunctions.forEach((j) => console.log(`  • ${j.id} (${j.name}) @ [${j.lat}, ${j.lon}]`))

    // Helper to add edges (bidirectional for simplicity)
    const addEdge = (source: string, target: string, corridor: string, prob: number) => {
      if (!this.adjacencyList.has(source)) this.adjacencyList.set(source, [])
      if (!this.adjacencyList.has(target)) this.adjacencyList.set(target, [])

      this.adjacencyList.get(source)!.push({ source, target, corridor, cascadeProbability: prob })
      this.adjacencyList
        .get(target)!
        .push({ source: target, target: source, corridor, cascadeProbability: prob })
    }

    // Tumkur Road / ORR area
    addEdge('jalahalli_cross', 'sm_circle', 'Tumkur Road', 0.8)
    addEdge('sm_circle', 'peenya_industrial', 'Tumkur Road', 0.6)

    // Central area
    addEdge('anil_kumble_circle', 'queens_statue_circle', 'MG Road Corridor', 0.9)
    addEdge('queens_statue_circle', 'mg_road', 'MG Road Corridor', 0.7)
    addEdge('anil_kumble_circle', 'mg_road', 'MG Road Corridor', 0.85)

    console.log(`[GraphService] Loaded ${this.adjacencyList.size} nodes with edges:`)
    for (const [nodeId, edges] of this.adjacencyList.entries()) {
      const targets = edges.map((e) => `${e.target}(p=${e.cascadeProbability})`).join(', ')
      console.log(`  • ${nodeId} → [${targets}]`)
    }
  }

  /**
   * Find the nearest junction to a given lat/lon.
   */
  public getNearestJunction(lat: number, lon: number): Junction | null {
    let nearest: Junction | null = null
    let minDistance = Infinity

    for (const junction of this.junctions.values()) {
      const dist = Math.sqrt(Math.pow(junction.lat - lat, 2) + Math.pow(junction.lon - lon, 2))
      if (dist < minDistance) {
        minDistance = dist
        nearest = junction
      }
    }
    console.log(
      `[GraphService] getNearestJunction(${lat}, ${lon}) → ${nearest?.id ?? 'null'} (dist=${minDistance.toFixed(6)})`,
    )
    return nearest
  }

  /**
   * Get neighbors and cascade probabilities for a given node.
   */
  public getNeighbors(nodeId: string): Edge[] {
    return this.adjacencyList.get(nodeId) || []
  }
}

export const graphService = new GraphService()
