# HLD Simulator — Engineering Tickets

> Each ticket is self-contained with context, acceptance criteria, and the exact file to create. Tickets are grouped by phase but tagged with dependencies so devs can pick any unblocked ticket.

---

## How to Read a Ticket

- **Blocked by**: Must be merged before this ticket can start.
- **File**: The file this ticket produces or modifies.
- **Size**: S (~1-2 hrs), M (~3-5 hrs), L (~1 day), XL (~2+ days).
- **AC**: Acceptance criteria — the ticket is done when all AC items pass.

---

## Phase 0 — Topology JSON Format

### T-001: Define TypeScript types for the Topology JSON schema

| Field | Value |
|-------|-------|
| **Blocked by** | None |
| **File** | `src/engine/types.ts` |
| **Size** | M |

**Context**: This is the contract between the React Flow UI and the simulation engine. Every other ticket depends on these types. The UI serializes its canvas state into this shape; the engine consumes it.

**What to build**:

Define and export TypeScript types/interfaces for the full topology JSON. Refer to `IMPLEMENTATION_PLAN.md` Phase 0 for the exact shapes. The types you need to define:

1. `TopologyJSON` — top-level wrapper with `id`, `name`, `version`, `global`, `nodes[]`, `edges[]`, `workload`, `faults[]`, `invariants[]`, `scenarios[]`.
2. `GlobalConfig` — `simulationDuration`, `seed`, `warmupDuration`, `timeResolution`, `defaultTimeout`.
3. `ComponentNode` — full node shape including `id`, `type` (use the `ComponentType` union from the schema), `category`, `label`, `position`, `resources`, `queue`, `processing`, `dependencies`, `resilience`, `slo`, `failureModes[]`, `scaling`, `config`.
4. `EdgeDefinition` — `id`, `source`, `target`, `label`, `mode`, `protocol`, `latency`, `bandwidth`, `maxConcurrentRequests`, `packetLossRate`, `errorRate`, `weight`, `condition`.
5. `WorkloadProfile` — `sourceNodeId`, `pattern`, `baseRps`, pattern-specific params (`diurnal`, `spike`, `bursty`, `sawtooth`), `requestDistribution[]`.
6. `FaultSpec` — `targetId`, `faultType`, `timing` (deterministic/probabilistic/conditional), `duration` (fixed/until/permanent), `params`.
7. `DistributionConfig` — discriminated union: `{ type: "constant", value }`, `{ type: "log-normal", mu, sigma }`, `{ type: "exponential", lambda }`, etc. for all 12 distribution types.
8. `ResourceConfig`, `QueueConfig`, `ProcessingConfig`, `ResilienceConfig`, `SLOConfig`, `ScalingConfig` — sub-objects of `ComponentNode`.

Also define:
- `ComponentType` — union literal of all ~113 component types from `canonical-catalogue/Component taxonomy.csv`. Group them: `ComputeType | NetworkType | StorageType | MessagingType | ...` then union.
- `ComponentCategory` — `"compute" | "network" | "storage" | "messaging" | "orchestration" | "security" | "observability" | "devops" | "data-infra" | "real-time" | "integration" | "dns" | "consensus" | "auxiliary"`.

**AC**:
- [ ] All types exported from `src/engine/types.ts`
- [ ] Types compile with `tsc --noEmit` with strict mode
- [ ] A sample topology JSON (4-node system: users → gateway → api → db) can be assigned to `TopologyJSON` without type errors
- [ ] `DistributionConfig` is a proper discriminated union on the `type` field
- [ ] `ComponentType` covers all 113 types from the catalogue

---

### T-002: Define event types and event factory functions

| Field | Value |
|-------|-------|
| **Blocked by** | None (can develop in parallel with T-001, will import from `types.ts` later) |
| **File** | `src/engine/types.ts` (append to same file, or `src/engine/events.ts` if you prefer separation) |
| **Size** | S |

**Context**: Every state change in the simulation is driven by an event. Events are inserted into a priority queue and processed in timestamp order. We need a clean, typed event system.

**What to build**:

1. `EventType` enum or string literal union:
```
REQUEST_GENERATED | REQUEST_ARRIVAL | PROCESSING_START | PROCESSING_COMPLETE |
REQUEST_FORWARDED | REQUEST_COMPLETE | REQUEST_TIMEOUT | REQUEST_REJECTED |
NODE_FAILURE | NODE_RECOVERY | NETWORK_PARTITION | LATENCY_SPIKE |
SCALE_UP | SCALE_DOWN | CIRCUIT_BREAKER_OPEN | CIRCUIT_BREAKER_CLOSE |
HEALTH_CHECK | CACHE_HIT | CACHE_MISS | DB_FAILOVER
```

2. `EventPriority` constants — used for tie-breaking when two events share the same timestamp:
```typescript
export const EventPriority = {
  SYSTEM: 0,      // health checks, config changes
  ARRIVAL: 1,     // request arrivals
  PROCESSING: 2,  // processing start/complete
  DEPARTURE: 3,   // request forwarding
  TIMEOUT: 4,     // timeouts (process last — give the request a chance)
} as const;
```

3. `SimulationEvent` interface:
```typescript
interface SimulationEvent {
  timestamp: bigint;      // microseconds
  type: EventType;
  nodeId: string;
  requestId: string;
  data: Record<string, unknown>;  // event-specific payload
  priority: number;       // from EventPriority
}
```

4. `Request` interface — the object that flows through the system:
```typescript
interface Request {
  id: string;
  type: string;          // "GET" | "POST" | etc.
  sizeBytes: number;
  priority: number;      // 0 = high, 1 = normal, 2 = low
  createdAt: bigint;     // timestamp when generated
  deadline: bigint;      // absolute timeout timestamp
  path: string[];        // nodeIds visited so far
  spans: RequestSpan[];  // tracing data per node
  retryCount: number;
  metadata: Record<string, unknown>;
}
```

5. `RequestSpan` interface — one span per node visited:
```typescript
interface RequestSpan {
  nodeId: string;
  arrivalTime: bigint;
  queueWait: bigint;
  serviceTime: bigint;
  departureTime: bigint;
}
```

6. Factory function `createEvent(type, nodeId, requestId, data, timestamp, priority?)` that returns a `SimulationEvent` with sensible defaults for priority based on the event type.

**AC**:
- [ ] All types exported and compile cleanly
- [ ] `createEvent` auto-assigns priority from `EventPriority` based on event type
- [ ] `Request` type includes `path` and `spans` arrays for tracing

---

### T-003: Build Zod topology validator

| Field | Value |
|-------|-------|
| **Blocked by** | T-001 |
| **File** | `src/engine/validator.ts` |
| **Size** | M |

**Context**: Before the engine runs, we must validate the topology JSON from the UI. Catch errors early with clear messages rather than cryptic runtime failures. Use Zod for runtime validation that also produces TypeScript types.

**What to build**:

1. Zod schemas mirroring every type from T-001: `TopologyJSONSchema`, `ComponentNodeSchema`, `EdgeDefinitionSchema`, `WorkloadProfileSchema`, `FaultSpecSchema`, `DistributionConfigSchema`.

2. A `validateTopology(input: unknown)` function that:
   - Parses through the Zod schema
   - Returns `{ valid: true, data: TopologyJSON }` or `{ valid: false, errors: ValidationError[] }`
   - Each `ValidationError` has `{ path: string, message: string }` (e.g., `{ path: "nodes[2].queue.workers", message: "Must be > 0" }`)

3. Structural validations beyond schema shape:
   - At least one source node (a node whose `type` generates traffic, like `user-source`)
   - Every `edge.source` and `edge.target` must reference an existing `node.id`
   - Every `node.dependencies.critical[]` ID must reference an existing `node.id`
   - No duplicate `node.id` or `edge.id`
   - `DistributionConfig` params are valid: `sigma > 0` for log-normal, `lambda > 0` for exponential, etc.
   - `queue.workers > 0`, `queue.capacity >= 0`
   - `processing.timeout > 0`
   - `global.simulationDuration > global.warmupDuration`

4. Graph connectivity check: warn (don't error) if any node is unreachable from any source node.

**AC**:
- [ ] `validateTopology` returns typed, path-specific error messages
- [ ] Rejects a topology with a missing source node
- [ ] Rejects a topology where an edge references a non-existent node ID
- [ ] Rejects invalid distribution params (e.g., `sigma: -1`)
- [ ] Warns on disconnected nodes
- [ ] Unit tests covering at least 5 invalid topology cases and 1 valid case

---

## Phase 1 — Core Primitives

### T-004: Implement BigInt time utilities

| Field | Value |
|-------|-------|
| **Blocked by** | None |
| **File** | `src/engine/time.ts` |
| **Size** | S |

**Context**: Floating-point timestamps accumulate rounding errors over millions of events (e.g., `0.1 + 0.2 !== 0.3`). The engine uses `BigInt` microseconds internally. This module provides conversion helpers.

**What to build**:

```typescript
export function msToMicro(ms: number): bigint;     // 1 → 1000n
export function microToMs(us: bigint): number;      // 1000n → 1
export function secToMicro(sec: number): bigint;    // 1 → 1_000_000n
export function microToSec(us: bigint): number;     // 1_000_000n → 1
export function formatTime(us: bigint): string;     // 1_234_567n → "1.235ms" or "1.235s"
```

**AC**:
- [ ] All functions exported from `src/engine/time.ts`
- [ ] `msToMicro(1)` returns `1000n`
- [ ] `microToMs(1500n)` returns `1.5`
- [ ] `formatTime` picks the right unit (us/ms/s) based on magnitude
- [ ] Unit tests pass

---

### T-005: Implement deterministic PRNG (SFC32)

| Field | Value |
|-------|-------|
| **Blocked by** | None |
| **File** | `src/engine/prng.ts` |
| **Size** | S |

**Context**: The simulation must be deterministic — same seed produces identical results every time. We use the SFC32 algorithm: fast, high-quality, passes the BigCrush statistical test suite, 2^128 period.

**What to build**:

1. `xmur3(str: string): () => number` — hash function that converts a seed string into a sequence of 32-bit integers. Used to generate the 4 initial seeds for SFC32.

2. `sfc32(a: number, b: number, c: number, d: number): () => number` — the core PRNG. Returns a function that produces a float in `[0, 1)` on each call. Must use only 32-bit integer operations (bitwise shifts, unsigned right shift `>>>`, addition with overflow).

3. `createRandom(seedString: string): RandomGenerator` — the public API:
```typescript
interface RandomGenerator {
  next(): number;                    // [0, 1)
  between(min: number, max: number): number;  // [min, max)
  integer(min: number, max: number): number;  // integer in [min, max]
  boolean(probability?: number): boolean;      // true with given probability (default 0.5)
}
```

4. Each simulation component should call `createRandom(globalSeed + "-" + componentId)` so that adding/removing components doesn't change the random sequence of other components.

**AC**:
- [ ] `createRandom("test-seed").next()` returns the same value every time
- [ ] Two different seeds produce different sequences
- [ ] `createRandom("seed-a")` and `createRandom("seed-b")` produce independent sequences
- [ ] `between(5, 10)` always returns values in `[5, 10)`
- [ ] `integer(1, 6)` always returns integers 1–6
- [ ] Unit tests: generate 10,000 values, verify uniform distribution (chi-squared or simple bucket check)

---

### T-006: Implement distribution sampler

| Field | Value |
|-------|-------|
| **Blocked by** | T-005 (uses PRNG) |
| **File** | `src/engine/distributions.ts` |
| **Size** | M |

**Context**: Every stochastic element in the simulation (service times, inter-arrival times, failure intervals, jitter) is sampled from a probability distribution. The user configures which distribution via `DistributionConfig` in the topology JSON.

**What to build**:

A `Distributions` class that takes a `RandomGenerator` (from T-005) and exposes:

| Method | Algorithm | Use Case |
|--------|-----------|----------|
| `constant(value)` | Return `value` | Fixed delays |
| `uniform(min, max)` | `min + rng.next() * (max - min)` | Jitter, uniform load |
| `exponential(rate)` | `-ln(1 - rng.next()) / rate` | Inter-arrival times (Poisson process) |
| `normal(mean, stddev)` | Box-Muller transform | Natural variation |
| `logNormal(mu, sigma)` | `exp(normal(mu, sigma))` | **API latency** — most critical distribution |
| `poisson(lambda)` | Knuth's algorithm | Event counts per interval |
| `weibull(shape, scale)` | `scale * (-ln(1 - rng.next()))^(1/shape)` | Hardware failure modeling |
| `gamma(shape, rate)` | Marsaglia & Tsang for shape >= 1, rejection for shape < 1 | Aggregated service times |
| `beta(alpha, beta)` | `x/(x+y)` where x~Gamma(alpha), y~Gamma(beta) | Probability parameters |
| `pareto(alpha, xMin)` | `xMin / (1 - rng.next())^(1/alpha)` | Heavy-tailed (80/20 rule) |
| `empirical(values, weights?)` | Weighted random selection from a list | Replay production data |
| `mixture(distributions[], weights[])` | Select sub-distribution by weight, then sample | Bimodal latency |

Also implement a dispatch function:
```typescript
fromConfig(config: DistributionConfig): number
```
This reads the `type` field and calls the appropriate method. Used everywhere the engine needs to sample a configured distribution.

**Implementation notes**:
- Box-Muller generates 2 normal samples at once — cache the second for the next call.
- All methods must use only the injected PRNG (no `Math.random()`).
- `logNormal` is the most performance-critical — it will be called millions of times.

**AC**:
- [ ] All 12 distributions implemented and exported
- [ ] `fromConfig({ type: "log-normal", mu: 2.3, sigma: 0.8 })` works correctly
- [ ] Deterministic: same PRNG seed → same sequence of samples
- [ ] `exponential(1)` produces values with mean ≈ 1.0 (test with 10,000 samples, verify mean within 5%)
- [ ] `logNormal(0, 1)` produces values > 0 with right-skewed distribution
- [ ] `normal` outputs pass a basic Shapiro-Wilk or mean/stddev check
- [ ] Unit tests for each distribution

---

### T-007: Implement min-heap priority queue

| Field | Value |
|-------|-------|
| **Blocked by** | T-002 (uses `SimulationEvent` type) |
| **File** | `src/engine/min-heap.ts` |
| **Size** | S |

**Context**: The event loop needs to always process the earliest event first. A min-heap gives O(log n) insert and O(log n) extract-min — much better than a sorted array (O(n) insert). Events are keyed on `timestamp` (BigInt) with tie-breaking on `priority` (lower number = higher priority).

**What to build**:

```typescript
export class MinHeap<T extends { timestamp: bigint; priority: number }> {
  insert(item: T): void;
  extractMin(): T | undefined;
  peek(): T | undefined;
  get size(): number;
  get isEmpty(): boolean;
}
```

**Implementation details**:
- Use a flat array. Parent of index `i` is at `Math.floor((i - 1) / 2)`. Left child at `2i + 1`, right child at `2i + 2`.
- **`insert`**: Push to end of array, bubble up (swap with parent while item < parent).
- **`extractMin`**: Save `arr[0]`, move last element to root, bubble down (swap with smaller child while item > child).
- **Comparison**: First compare `timestamp` (BigInt comparison). If equal, compare `priority` (lower = higher priority). If both equal, maintain insertion order (use a monotonically increasing sequence number as the third tiebreaker).
- Make the class generic so it can be used for any heap-ordered data, but the default use case is `SimulationEvent`.

**Performance target**: Must handle 1,000,000 insert + extract cycles in under 2 seconds.

**AC**:
- [ ] `extractMin` always returns the event with the smallest timestamp
- [ ] Tie-breaking: when timestamps are equal, lower `priority` is extracted first
- [ ] Insertion order preserved for same timestamp + same priority
- [ ] `peek` returns the min without removing it
- [ ] `size` and `isEmpty` work correctly
- [ ] Performance: 1M insert+extract in < 2s (add a benchmark test)
- [ ] Unit tests with at least 10 events in scrambled order

---

## Phase 2 — Simulation Engine

### T-008: Implement G/G/c/K node model

| Field | Value |
|-------|-------|
| **Blocked by** | T-004 (time), T-005 (PRNG), T-006 (distributions), T-002 (events) |
| **File** | `src/engine/node.ts` |
| **Size** | L |

**Context**: Each node in the topology is modeled as a G/G/c/K queue — General arrivals, General service times, `c` parallel workers (servers), `K` max queue capacity. This is the core simulation primitive.

**What to build**:

```typescript
export class GGcKNode {
  constructor(config: ComponentNode, distributions: Distributions, scheduler: EventScheduler)
```

**State** (all private):
- `id: string`
- `queue: Request[]` — waiting requests
- `activeWorkers: number` — currently processing
- `maxWorkers: number` — `c` from config
- `maxCapacity: number` — `K` from config
- `status: "idle" | "busy" | "saturated" | "failed"`
- `metrics: NodeMetrics` — running counters
- `serviceDistribution: DistributionConfig` — from `config.processing.distribution`
- `discipline: "fifo" | "lifo" | "priority" | "wfq"`

**Methods**:

1. `handleArrival(request: Request, currentTime: bigint): ArrivalResult`
   - If `status === "failed"` → return `{ outcome: "rejected", reason: "node_failed" }`
   - If `activeWorkers < maxWorkers` → call `startProcessing(request, currentTime)`, return `{ outcome: "processing" }`
   - If `queue.length < maxCapacity` → enqueue (respecting discipline), return `{ outcome: "queued" }`
   - Else → return `{ outcome: "rejected", reason: "queue_full" }`
   - Update `status` based on utilization.

2. `startProcessing(request: Request, currentTime: bigint): void`
   - Increment `activeWorkers`
   - Sample service time: `serviceTime = msToMicro(distributions.fromConfig(serviceDistribution))`
   - Schedule `PROCESSING_COMPLETE` event at `currentTime + serviceTime` via the scheduler callback
   - Record span start on the request

3. `handleCompletion(request: Request, currentTime: bigint): CompletionResult`
   - Decrement `activeWorkers`
   - Record span end on the request
   - If queue is non-empty → dequeue next, call `startProcessing`
   - Update `status`
   - Return `{ request, nextRequest: dequeuedRequest | null }`

4. `fail(currentTime: bigint): void` — set status to `"failed"`, reject all queued requests
5. `recover(currentTime: bigint): void` — set status to `"idle"`
6. `getState(): NodeState` — snapshot: `{ queueLength, activeWorkers, status, utilization }`
7. `getMetrics(): NodeMetrics` — `{ totalArrived, totalProcessed, totalRejected, totalTimedOut, avgQueueLength, avgServiceTime, utilization }`

**Queue discipline logic**:
- FIFO: `queue.shift()` to dequeue
- LIFO: `queue.pop()` to dequeue
- Priority: sort by `request.priority`, dequeue lowest
- WFQ: weighted fair queuing (stretch goal — start with FIFO)

**Metrics tracking**:
- Increment `totalArrived` on every arrival
- Increment `totalProcessed` on every completion
- Increment `totalRejected` on every rejection
- Track cumulative queue length for average calculation: `sumQueueLength += queue.length` on every arrival, `queueSamples++`
- Track cumulative service time for average calculation

**AC**:
- [ ] A node with 2 workers and capacity 3 processes first 2 arrivals immediately, queues the next 3, rejects the 6th
- [ ] `handleCompletion` auto-dequeues and starts the next queued request
- [ ] FIFO discipline: requests dequeue in arrival order
- [ ] LIFO discipline: requests dequeue in reverse arrival order
- [ ] Failed node rejects all arrivals with `reason: "node_failed"`
- [ ] `getMetrics()` returns correct counts after processing 100 requests
- [ ] `utilization` = `activeWorkers / maxWorkers` at any snapshot
- [ ] Unit tests covering: normal flow, queue full, node failure, recovery

---

### T-009: Implement workload generator

| Field | Value |
|-------|-------|
| **Blocked by** | T-005 (PRNG), T-006 (distributions), T-004 (time), T-002 (events) |
| **File** | `src/engine/workload.ts` |
| **Size** | M |

**Context**: The workload generator is the source of all traffic in the simulation. It creates `REQUEST_GENERATED` events at the configured rate and pattern. Each event spawns a `Request` object that enters the first node.

**What to build**:

```typescript
export class WorkloadGenerator {
  constructor(config: WorkloadProfile, rng: RandomGenerator, scheduler: EventScheduler)

  initialize(startTime: bigint): void;              // schedule the first event
  generateNext(currentTime: bigint): Request;       // create next request + schedule next event
}
```

**Traffic patterns** — each pattern determines the inter-arrival time between consecutive requests:

1. **Constant**: `interArrival = 1000 / baseRps` ms (fixed)
2. **Poisson**: `interArrival = exponential(baseRps)` — memoryless, realistic
3. **Bursty**: alternate between `burstRps` and `baseRps` on a configurable cycle (e.g., 5s burst, 10s normal)
4. **Diurnal**: `currentRps = baseRps * hourlyMultipliers[currentHour]` — simulate 24-hour pattern compressed into sim duration
5. **Spike**: constant `baseRps` except during `[spikeTime, spikeTime + spikeDuration]` where it jumps to `spikeRps`
6. **Sawtooth**: `currentRps` ramps linearly from `baseRps` to `peakRps` over `rampDuration`, then drops back instantly

**Request generation**:
- Assign `id` = incrementing counter with prefix (e.g., `"req-000042"`)
- Sample `type` from `requestDistribution` using weighted random (e.g., 70% GET, 20% POST, 10% PUT)
- Set `sizeBytes` from the matched distribution entry
- Set `priority`: 90% normal (1), 10% high (0)
- Set `createdAt` = current timestamp
- Set `deadline` = `createdAt + msToMicro(defaultTimeout)`
- Initialize empty `path[]` and `spans[]`

**AC**:
- [ ] Constant pattern at 100 RPS generates ~100 requests per second of simulation time
- [ ] Poisson pattern: inter-arrival times are exponentially distributed (verify with 10,000 samples)
- [ ] Spike pattern: request rate jumps to `spikeRps` during the spike window and returns to base
- [ ] Diurnal pattern: rate varies proportionally to the hourly multipliers
- [ ] Request `type` distribution matches configured weights (within 5% over 10,000 requests)
- [ ] All requests have unique, incrementing IDs
- [ ] Deterministic: same seed → same request sequence
- [ ] Unit tests for each pattern

---

### T-010: Implement routing table

| Field | Value |
|-------|-------|
| **Blocked by** | T-001 (types) |
| **File** | `src/engine/routing.ts` |
| **Size** | S |

**Context**: After a node finishes processing a request, the engine needs to know where to forward it. The routing table is built from the `edges[]` array and provides fast lookups.

**What to build**:

```typescript
export class RoutingTable {
  constructor(edges: EdgeDefinition[], rng: RandomGenerator)

  // Returns all outgoing edges from a given node
  getOutgoingEdges(sourceNodeId: string): EdgeDefinition[];

  // Select the next target(s) for a request leaving a source node
  // Handles single, weighted, conditional, and round-robin routing
  resolveTarget(sourceNodeId: string, request: Request): ResolvedRoute[];
}

interface ResolvedRoute {
  targetNodeId: string;
  edge: EdgeDefinition;
}
```

**Routing strategies** (determined automatically from edge configuration):

1. **Single target**: Only one outgoing edge from this source → always route there.
2. **Weighted**: Multiple outgoing edges with `weight` values → select one using weighted random.
   - Example: 3 edges with weights `[3, 2, 1]` → probabilities `[0.5, 0.33, 0.17]`.
3. **Fan-out**: Multiple outgoing edges where `mode: "asynchronous"` → route to ALL targets (parallel).
4. **Conditional**: Edge has a `condition` string → evaluate against request context. Only route if condition is truthy.
   - Keep condition evaluation simple for v1: just check `request.type === "POST"` style conditions.
5. **Round-robin**: If a node has a load-balancer `type`, cycle through targets in order.

**Internal data structure**: Build a `Map<string, EdgeDefinition[]>` (sourceId → outgoing edges) at construction time for O(1) lookup.

**AC**:
- [ ] `getOutgoingEdges("node-a")` returns all edges where `source === "node-a"`
- [ ] Single target: always returns the one edge
- [ ] Weighted: over 10,000 calls, distribution matches weights within 5%
- [ ] Fan-out: returns all async edges simultaneously
- [ ] Round-robin: cycles through targets in order
- [ ] Returns empty array for sink nodes (no outgoing edges)
- [ ] Unit tests for each routing strategy

---

### T-011: Implement the simulation engine (main event loop)

| Field | Value |
|-------|-------|
| **Blocked by** | T-007 (min-heap), T-008 (node), T-009 (workload), T-010 (routing), T-004 (time), T-005 (PRNG) |
| **File** | `src/engine/engine.ts` |
| **Size** | XL |

**Context**: This is the central orchestrator. It initializes the model from the topology JSON, runs the event loop, and produces results. Every other module plugs into this.

**What to build**:

```typescript
export class SimulationEngine {
  constructor(topology: TopologyJSON)

  run(): SimulationOutput;
  pause(): void;
  resume(): void;
  stop(): void;
  step(count: number): void;  // advance N events (debug mode)

  // Callback for streaming progress/snapshots
  onProgress?: (percent: number, eventsProcessed: number) => void;
  onSnapshot?: (snapshot: TimeSeriesSnapshot) => void;
}
```

**`constructor(topology)`** — initialization:
1. Parse `global` config. Create master PRNG from `global.seed`.
2. For each entry in `nodes[]`: instantiate a `GGcKNode(nodeConfig, distributions, this.schedule.bind(this))`.
3. Build a `RoutingTable` from `edges[]`.
4. Create a `WorkloadGenerator` from `workload`. Call `workloadGenerator.initialize(0n)` to schedule the first `REQUEST_GENERATED` event.
5. Create a `MetricsCollector` (from T-018).
6. Create the `MinHeap` event queue.
7. Set `clock = 0n`, `running = true`.

**`run()`** — main event loop:
```
while (running && !eventQueue.isEmpty) {
  event = eventQueue.extractMin()
  if (event.timestamp > msToMicro(simulationDuration)) break
  clock = event.timestamp

  // Emit progress every 1000 events
  if (eventsProcessed % 1000 === 0) onProgress?.(percent, eventsProcessed)

  // Emit snapshot every 1 second of sim-time
  if (shouldSnapshot(clock)) onSnapshot?.(takeSnapshot())

  handleEvent(event)
  eventsProcessed++
}
return generateResults()
```

**`handleEvent(event)`** — event dispatch:

| Event Type | Handler Logic |
|------------|---------------|
| `REQUEST_GENERATED` | Call `workloadGenerator.generateNext(clock)` → get request. Find first downstream node via routing table. Schedule `REQUEST_ARRIVAL` at that node (add edge latency). |
| `REQUEST_ARRIVAL` | Call `node.handleArrival(request, clock)`. If rejected → schedule `REQUEST_REJECTED`. If processing → node schedules `PROCESSING_COMPLETE` internally. |
| `PROCESSING_COMPLETE` | Call `node.handleCompletion(request, clock)`. Look up outgoing edges via routing table. If edges exist → schedule `REQUEST_FORWARDED` for each target. If no edges (sink) → schedule `REQUEST_COMPLETE`. |
| `REQUEST_FORWARDED` | Apply edge latency (sample from edge distribution). Schedule `REQUEST_ARRIVAL` at target node at `clock + edgeLatency`. Check for packet loss → if lost, schedule `REQUEST_TIMEOUT`. |
| `REQUEST_COMPLETE` | Calculate total latency = `clock - request.createdAt`. Record in metrics collector. |
| `REQUEST_TIMEOUT` | Mark request as failed. Record in metrics. |
| `REQUEST_REJECTED` | Record rejection in metrics. |
| `NODE_FAILURE` | Call `node.fail(clock)`. |
| `NODE_RECOVERY` | Call `node.recover(clock)`. |

**`schedule(timestamp, type, nodeId, requestId, data)`**: Insert event into the min-heap.

**`generateResults()`**: Call `metricsCollector.generateOutput()`. Also run Little's Law verification per node (compare `L_observed` vs `lambda * W_observed`, flag if error > 10%).

**Edge latency calculation** (simplified for v1 — Phase 3 will enhance):
- Sample from the edge's `latency.distribution` using `distributions.fromConfig()`.
- Convert to BigInt microseconds.
- If no distribution specified, use defaults based on `pathType`.

**AC**:
- [ ] A 4-node topology (users → gateway → api → db) with constant 100 RPS runs for 10 seconds and produces output
- [ ] `totalRequests` in output ≈ 1000 (100 RPS × 10s)
- [ ] Latency percentiles are present and P50 < P90 < P95 < P99
- [ ] Per-node metrics show correct request counts
- [ ] `pause()` / `resume()` works (pauses the event loop)
- [ ] `stop()` terminates the loop early and returns partial results
- [ ] Progress callback fires periodically
- [ ] Deterministic: same topology + same seed → identical output
- [ ] Little's Law check runs and results are included in output
- [ ] Engine handles 100,000+ events without crashing (memory/performance check)

---

## Phase 3 — Network & Edge Modeling

### T-012: Implement NetworkEdge class with latency decomposition

| Field | Value |
|-------|-------|
| **Blocked by** | T-006 (distributions), T-004 (time), T-001 (types) |
| **File** | `src/engine/edge.ts` |
| **Size** | M |

**Context**: Edges aren't instant pipes — they have propagation delay, transmission time, queuing under congestion, and jitter. This class models realistic network behavior.

**What to build**:

```typescript
export class NetworkEdge {
  constructor(config: EdgeDefinition, distributions: Distributions, rng: RandomGenerator)

  send(request: Request, currentTime: bigint): EdgeResult;
  getState(): EdgeState;
}

interface EdgeResult {
  lost: boolean;
  arrivalTime?: bigint;
  latencyBreakdown?: {
    propagation: number;   // ms
    transmission: number;  // ms
    processing: number;    // ms
    queuing: number;       // ms
    jitter: number;        // ms
    total: number;         // ms
  };
}

interface EdgeState {
  currentLoad: number;
  utilization: number;
  throughput: number;
}
```

**Latency components**:

1. **Processing latency**: Sample from `config.latency.distribution` via `distributions.fromConfig()`. If no distribution is specified, use defaults from `pathType`:

| pathType | Default distribution |
|----------|---------------------|
| `same-rack` | `logNormal(mu=-1.2, sigma=0.3)` → median ~0.3ms |
| `same-dc` | `logNormal(mu=0.0, sigma=0.4)` → median ~1ms |
| `cross-zone` | `logNormal(mu=0.7, sigma=0.4)` → median ~2ms |
| `cross-region` | `logNormal(mu=4.1, sigma=0.3)` → median ~60ms |
| `internet` | `logNormal(mu=3.0, sigma=0.8)` → median ~20ms, heavy tail |

2. **Transmission latency**: `request.sizeBytes / (config.bandwidth * 125)` ms. (Bandwidth in Mbps; 1 Mbps = 125,000 bytes/sec = 125 bytes/ms.)

3. **Queuing latency**: Track `currentLoad` (active in-flight requests on this edge). Calculate utilization = `currentLoad / maxConcurrentRequests`. Apply congestion model:
   - `delayMultiplier = 1 / (1 - utilization)` (M/M/1 model — latency explodes near saturation)
   - Clamp multiplier to max 50x to prevent infinity.

4. **Jitter**: `uniform(-jitterRange, +jitterRange)` where `jitterRange` = 10% of base latency.

5. **Total**: `propagation + transmission + (processing * queuingMultiplier) + jitter`

**Packet loss**:
- `effectiveLossRate = config.packetLossRate + congestionBonus`
- `congestionBonus = max(0, (utilization - 0.8) * 0.1)` — packet loss increases above 80% utilization
- If `rng.next() < effectiveLossRate` → return `{ lost: true }`

**Load tracking**:
- `send()` increments `currentLoad`. The engine must call `edge.requestCompleted()` when the request finishes at the target to decrement it. Add a `requestCompleted()` method.

**AC**:
- [ ] `send()` returns a latency breakdown with all 5 components
- [ ] Same-DC edges have ~1ms median latency; cross-region ~60ms
- [ ] At 90% utilization, queuing delay is ~10x base
- [ ] Packet loss rate increases above 80% utilization
- [ ] `send()` with `packetLossRate: 1.0` always returns `{ lost: true }`
- [ ] Transmission delay is proportional to request size
- [ ] Unit tests: latency ranges for each path type, congestion behavior, packet loss

---

## Phase 4 — Failure Injection & Propagation

### T-013: Implement failure injector

| Field | Value |
|-------|-------|
| **Blocked by** | T-002 (events), T-004 (time), T-001 (types) |
| **File** | `src/engine/failure-injector.ts` |
| **Size** | L |

**Context**: The failure injector reads `faults[]` from the topology JSON and activates/deactivates failures during the simulation based on timing rules. It's the "chaos monkey" of the engine.

**What to build**:

```typescript
export class FailureInjector {
  constructor(faults: FaultSpec[], rng: RandomGenerator)

  // Called by the engine on every event (or periodically)
  check(currentTime: bigint, nodeStates: Map<string, NodeState>): FailureAction[];

  // Get currently active faults
  getActiveFaults(): ActiveFault[];
}

interface FailureAction {
  action: "activate" | "deactivate";
  targetId: string;         // node or edge ID
  faultType: string;        // crash | hang | latency-spike | error-rate | ...
  effect: FaultEffect;
}

interface FaultEffect {
  type: "set_status" | "multiply_latency" | "set_error_rate" | "reduce_capacity";
  value: unknown;           // FAILED, 10 (10x multiplier), 0.5 (50% errors), etc.
}
```

**Timing types**:

1. **Deterministic**: Activate at exact sim-time. `{ timing: "deterministic", atTime: 15000 }`
   - Check: `currentTime >= msToMicro(atTime)` and not yet activated.

2. **Probabilistic**: Random activation. `{ timing: "probabilistic", probability: 0.001, checkInterval: 1000 }`
   - Check every `checkInterval` ms: `rng.next() < probability`.

3. **Conditional**: Activate when a metric threshold is crossed. `{ timing: "conditional", metric: "queue_depth", operator: ">", threshold: 100, nodeId: "node-db" }`
   - Check: read `nodeStates.get(nodeId)` and evaluate the condition.

**Duration types**:
- `fixed(ms)`: Deactivate after `ms` milliseconds.
- `until(condition)`: Deactivate when a condition is met (e.g., `queue_depth < 10`).
- `permanent`: Never deactivate.

**Fault type → effect mapping**:

| Fault Type | Effect |
|-----------|--------|
| `crash` | `{ type: "set_status", value: "failed" }` |
| `hang` | `{ type: "multiply_latency", value: 1000 }` (effectively infinite) |
| `latency-spike` | `{ type: "multiply_latency", value: 10 }` |
| `error-rate` | `{ type: "set_error_rate", value: params.rate }` |
| `packet-loss` | `{ type: "set_error_rate", value: params.rate }` on edge |
| `cpu-stress` | `{ type: "multiply_latency", value: 3 }` + `{ type: "reduce_capacity", value: 0.5 }` |
| `memory-pressure` | `{ type: "reduce_capacity", value: 0.3 }` |
| `process-crash` | `{ type: "set_status", value: "failed" }` + schedule recovery after MTTR |

**AC**:
- [ ] Deterministic fault activates at exact specified time
- [ ] Probabilistic fault activates roughly `probability * checks` times
- [ ] Conditional fault activates when node's queue depth exceeds threshold
- [ ] Fixed-duration fault auto-deactivates after the specified period
- [ ] `crash` fault sets node to FAILED
- [ ] `latency-spike` fault returns a 10x latency multiplier
- [ ] Multiple faults can be active simultaneously on different nodes
- [ ] `getActiveFaults()` returns only currently active faults
- [ ] Unit tests for each timing type and fault type

---

### T-014: Implement failure propagation engine

| Field | Value |
|-------|-------|
| **Blocked by** | T-013 (failure injector), T-001 (types) |
| **File** | `src/engine/failure-propagation.ts` |
| **Size** | L |

**Context**: When a node fails, the damage doesn't stay local. A crashed DB causes the API server's queues to fill, which causes the gateway to timeout, which causes users to see errors. This module models those cascades.

**What to build**:

```typescript
export class FailurePropagationEngine {
  constructor(nodes: ComponentNode[], edges: EdgeDefinition[])

  // Called when a node fails or degrades
  propagate(failedNodeId: string, failureType: string, currentTime: bigint): PropagationResult[];

  // Get the causal chain for output visualization
  getCausalGraph(): CausalGraph;
}

interface PropagationResult {
  affectedNodeId: string;
  effect: string;            // "timeout_cascade" | "queue_saturation" | "retry_amplification" | ...
  severity: "degraded" | "critical";
  timestamp: bigint;
}
```

**Step 1 — Build dependency graph** (in constructor):
- Parse `node.dependencies.critical[]` and `node.dependencies.optional[]`.
- Also infer dependencies from edges: if edge A→B exists, A depends on B.
- Build two maps:
  - `upstreamOf(nodeId)` → nodes that call this node (would be affected by slowness)
  - `downstreamOf(nodeId)` → nodes this node calls (would be affected by failure)

**Step 2 — Propagation rules**:

For each affected node, check:

| Trigger | Condition | Default Effect |
|---------|-----------|----------------|
| Critical dependency failed | `dependencies.critical` includes failed node | `increase_error_rate(0.9)` — 90% of requests fail |
| Optional dependency failed | `dependencies.optional` includes failed node | `increase_latency(2x)` — fallback path is slower |
| Upstream queue saturated | Upstream's `queue_depth > 0.9 * capacity` | `reduce_throughput(0.5)` — backpressure |
| Timeout rate high | `> 50%` of requests to a dep are timing out | `trigger_circuit_breaker` |

**Step 3 — Cascade walk**:
- Use BFS from the failed node.
- For each neighbor, evaluate propagation rules.
- If a rule triggers, apply the effect AND add that node to the BFS queue (it's now degraded, which may trigger rules on ITS neighbors).
- Track the causal chain: `{ from, to, effect, timestamp }` for every propagation step.
- **Cycle detection**: Don't revisit a node already in the current cascade.

**Step 4 — Causal graph**:
- Store all causal edges as the cascade happens.
- `getCausalGraph()` returns: `{ rootCause: { nodeId, event, time }, propagation: CausalEdge[] }`.

**AC**:
- [ ] DB failure propagates to API service (critical dep) → API starts returning errors
- [ ] API errors propagate to gateway (upstream queue fills)
- [ ] Optional dependency failure causes degradation, not total failure
- [ ] Cascade doesn't loop infinitely (cycle detection works)
- [ ] Causal graph correctly traces: DB → API → Gateway → Users
- [ ] `getCausalGraph()` returns correct root cause and ordered propagation chain
- [ ] Unit test: 4-node chain, fail the leaf, verify cascade reaches the root

---

## Phase 5 — Resilience Patterns

### T-015: Implement circuit breaker

| Field | Value |
|-------|-------|
| **Blocked by** | T-004 (time), T-002 (events) |
| **File** | `src/engine/circuit-breaker.ts` |
| **Size** | M |

**Context**: A circuit breaker prevents a caller from repeatedly hammering a failing dependency. It tracks failure rates and "trips" to an OPEN state where all requests are immediately rejected, then gradually tests recovery.

**What to build**:

```typescript
export class CircuitBreaker {
  constructor(config: {
    failureThreshold: number;  // e.g., 0.5 — trip when 50% of requests fail
    failureCount: number;      // minimum requests before evaluating (e.g., 10)
    recoveryTimeout: number;   // ms — how long to stay OPEN before trying HALF_OPEN
    halfOpenRequests: number;  // how many test requests to allow in HALF_OPEN
    windowSize: number;        // ms — sliding window for failure tracking
  })

  get state(): "CLOSED" | "OPEN" | "HALF_OPEN";

  allowRequest(currentTime: bigint): boolean;
  recordSuccess(currentTime: bigint): void;
  recordFailure(currentTime: bigint): void;
  getMetrics(): CircuitBreakerMetrics;
}
```

**State transitions**:

```
CLOSED:
  - Track successes and failures within a sliding time window
  - On each recordFailure: if total >= failureCount AND failureRate >= failureThreshold → transition to OPEN
  - allowRequest() → always true

OPEN:
  - All requests rejected immediately (allowRequest() → false)
  - Record the time we entered OPEN
  - When currentTime >= openedAt + recoveryTimeout → transition to HALF_OPEN

HALF_OPEN:
  - Allow up to `halfOpenRequests` test requests (allowRequest() → true for those, false after)
  - If ALL test requests succeed → transition to CLOSED (reset counters)
  - If ANY test request fails → transition back to OPEN (reset recovery timer)
```

**Sliding window**: Maintain a list of `{ timestamp, success: boolean }` entries. On each `allowRequest` call, evict entries older than `currentTime - windowSize`. This keeps the failure rate current.

**Metrics**: `{ state, failureRate, totalRequests, totalFailures, timesTripped, lastTrippedAt }`.

**AC**:
- [ ] Starts in CLOSED state
- [ ] After 10 requests with 50% failures, trips to OPEN
- [ ] In OPEN state, `allowRequest()` returns false
- [ ] After `recoveryTimeout`, transitions to HALF_OPEN
- [ ] In HALF_OPEN, allows exactly `halfOpenRequests` requests
- [ ] If half-open tests all succeed → back to CLOSED
- [ ] If any half-open test fails → back to OPEN
- [ ] Old entries outside the sliding window are evicted
- [ ] `getMetrics()` returns current state and failure rate
- [ ] Unit tests for the full state machine lifecycle

---

### T-016: Implement retry policy, rate limiter, bulkhead, load shedder, and timeout

| Field | Value |
|-------|-------|
| **Blocked by** | T-004 (time), T-005 (PRNG) |
| **Files** | `src/engine/retry.ts`, `src/engine/rate-limiter.ts`, `src/engine/bulkhead.ts`, `src/engine/load-shedder.ts`, `src/engine/timeout.ts` |
| **Size** | M (5 small modules) |

**Context**: These are the remaining resilience primitives. Each is small and independent. They're grouped into one ticket because they're all simple and share similar patterns.

**What to build**:

#### 1. Retry Policy (`retry.ts`)

```typescript
export class RetryPolicy {
  constructor(config: { maxAttempts: number; baseDelay: number; maxDelay: number; multiplier: number; jitter: boolean }, rng: RandomGenerator)

  shouldRetry(attempt: number, error: string): boolean;
  getDelay(attempt: number): number;  // returns ms
}
```

- `shouldRetry`: return `attempt < maxAttempts`
- `getDelay`: `delay = min(baseDelay * multiplier^attempt, maxDelay)`. If `jitter: true`, apply full jitter: `delay = uniform(0, delay)`.
- Retries consume node capacity — this is critical. The engine must schedule retried requests as new `REQUEST_ARRIVAL` events.

#### 2. Rate Limiter — Token Bucket (`rate-limiter.ts`)

```typescript
export class RateLimiter {
  constructor(config: { maxTokens: number; refillRate: number })  // refillRate = tokens/sec

  allowRequest(currentTime: bigint): { allowed: boolean; retryAfterMs?: number };
  getTokens(): number;
}
```

- On each `allowRequest`: refill tokens based on elapsed time since last call (`tokens = min(tokens + refillRate * elapsedSec, maxTokens)`). If `tokens >= 1` → consume 1, allow. Else → reject with `retryAfterMs`.

#### 3. Bulkhead (`bulkhead.ts`)

```typescript
export class Bulkhead {
  constructor(config: { maxConcurrent: number })

  acquire(): boolean;       // true if slot available
  release(): void;          // return a slot
  getActive(): number;
  getAvailable(): number;
}
```

- Simple counter: `active < maxConcurrent` → allow. Else → reject.

#### 4. Load Shedder (`load-shedder.ts`)

```typescript
export class LoadShedder {
  constructor(config: { strategy: "priority" | "lifo" | "random"; queueThreshold: number; latencyThreshold: number })

  shouldShed(request: Request, queueLength: number, estimatedWait: number): boolean;
  selectVictim(queue: Request[]): number;  // returns index to remove
}
```

- `shouldShed`: return true if `queueLength > queueThreshold` OR `estimatedWait > latencyThreshold`.
- `selectVictim` by strategy:
  - `priority`: return index of lowest-priority request
  - `lifo`: return last index (newest)
  - `random`: return random index

#### 5. Timeout / Deadline Propagation (`timeout.ts`)

```typescript
export function propagateDeadline(parentDeadline: bigint, childTimeout: number, currentTime: bigint): bigint;
export function isExpired(deadline: bigint, currentTime: bigint): boolean;
```

- `propagateDeadline`: return `min(parentDeadline, currentTime + msToMicro(childTimeout))`
- `isExpired`: return `currentTime >= deadline`

**AC**:
- [ ] Retry: delay for attempt 3 with base=100, multiplier=2 → 800ms (before jitter)
- [ ] Retry: with jitter enabled, delay is in `[0, 800]`
- [ ] Rate limiter: 100 tokens, refill 10/sec → allows 100 burst, then 10/sec steady
- [ ] Rate limiter: returns correct `retryAfterMs` when tokens exhausted
- [ ] Bulkhead: `acquire()` fails after `maxConcurrent` unreleased acquires
- [ ] Load shedder priority: sheds lowest-priority request first
- [ ] Timeout: `propagateDeadline` returns the tighter of parent deadline vs child timeout
- [ ] Timeout: `isExpired` returns true when time exceeds deadline
- [ ] Unit tests for each module

---

## Phase 6 — Metrics, Tracing & Output

### T-017: Implement metrics collector

| Field | Value |
|-------|-------|
| **Blocked by** | T-002 (events), T-004 (time) |
| **File** | `src/engine/metrics.ts` |
| **Size** | M |

**Context**: The metrics collector records every request outcome and aggregates results for the simulation output. It runs during the simulation (collecting data) and after (computing summaries).

**What to build**:

```typescript
export class MetricsCollector {
  constructor(config: { warmupDuration: number })

  // Called during simulation
  recordRequest(request: CompletedRequest): void;
  recordRejection(nodeId: string, reason: string): void;
  recordTimeout(requestId: string, nodeId: string): void;
  recordNodeSnapshot(nodeId: string, state: NodeState, timestamp: bigint): void;

  // Called after simulation
  generateSummary(duration: number): SimulationSummary;
  getPerNodeMetrics(): Map<string, NodeMetrics>;
  getLatencyPercentiles(): LatencyPercentiles;
}

interface CompletedRequest {
  id: string;
  status: "success" | "timeout" | "rejected" | "error";
  totalLatency: number;    // ms
  path: string[];
  spans: RequestSpan[];
  createdAt: bigint;
  completedAt: bigint;
}

interface SimulationSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rejectedRequests: number;
  timedOutRequests: number;
  duration: number;           // ms
  throughput: number;         // successful requests / sec
  errorRate: number;          // failed / total
  latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    mean: number;
  };
}
```

**Percentile calculation**:
- Collect all successful request latencies into an array.
- Sort the array.
- P50 = value at index `floor(0.50 * length)`, P90 at `floor(0.90 * length)`, etc.
- Only include requests that completed AFTER the warmup period.

**Per-node metrics**:
- Track per node: `totalArrived`, `totalProcessed`, `totalRejected`, `totalTimedOut`, `avgQueueLength`, `avgServiceTime`, `peakQueueLength`, `utilization`.

**Warmup filtering**:
- Requests with `createdAt < msToMicro(warmupDuration)` are excluded from the summary (but still processed by the engine). The warmup period allows the system to reach steady state.

**AC**:
- [ ] After recording 1000 requests, `generateSummary` returns correct counts
- [ ] Percentiles: P50 < P90 < P95 < P99 for a log-normal latency distribution
- [ ] Warmup: requests created before `warmupDuration` are excluded from percentiles
- [ ] Per-node metrics show correct per-node request counts
- [ ] `throughput` = successful / (duration - warmup) in seconds
- [ ] `errorRate` = failed / total
- [ ] Unit tests with known latency arrays to verify exact percentile values

---

### T-018: Implement request tracer (waterfall view data)

| Field | Value |
|-------|-------|
| **Blocked by** | T-002 (events/Request type) |
| **File** | `src/engine/tracer.ts` |
| **Size** | S |

**Context**: For debugging and visualization, we sample a subset of requests and record their full journey through the system as a waterfall trace (like Chrome DevTools network panel).

**What to build**:

```typescript
export class RequestTracer {
  constructor(config: { sampleRate: number })  // e.g., 0.01 = 1% of requests

  shouldTrace(requestId: string): boolean;
  recordSpan(requestId: string, span: RequestSpan): void;
  getTraces(): RequestTrace[];
}

interface RequestTrace {
  requestId: string;
  totalLatency: number;     // ms
  status: "success" | "timeout" | "rejected" | "error";
  spans: {
    nodeId: string;
    start: number;          // ms relative to request creation
    end: number;
    queueWait: number;      // ms
    serviceTime: number;    // ms
    edgeLatency: number;    // ms (time on the edge before arriving)
  }[];
}
```

**Sampling**: Use a deterministic decision based on request ID hash modulo (not random), so the same requests are always traced across reruns.

**Span construction**:
- The `Request` object accumulates `RequestSpan[]` as it passes through nodes. The tracer converts these BigInt timestamps into relative milliseconds for the output.
- `start` = `span.arrivalTime - request.createdAt` in ms
- `end` = `span.departureTime - request.createdAt` in ms

**AC**:
- [ ] At `sampleRate: 0.01`, approximately 1% of requests produce traces
- [ ] Each trace has spans ordered by node visit sequence
- [ ] `start` and `end` are relative to request creation (first span starts at ~0)
- [ ] `queueWait + serviceTime ≈ end - start` per span
- [ ] Deterministic: same seed → same requests are traced
- [ ] Unit tests with a 3-node topology

---

### T-019: Implement time-series snapshot emitter

| Field | Value |
|-------|-------|
| **Blocked by** | T-008 (node — for `getState()`), T-012 (edge — for `getState()`) |
| **File** | `src/engine/metrics.ts` (add to existing metrics module) |
| **Size** | S |

**Context**: The UI needs periodic snapshots of system state to animate the canvas in real-time (node coloring, edge thickness, queue bars). The engine emits these at configurable intervals.

**What to build**:

Add to `MetricsCollector` (or create a separate `SnapshotEmitter`):

```typescript
takeSnapshot(
  currentTime: bigint,
  nodes: Map<string, GGcKNode>,
  edges: Map<string, NetworkEdge>
): TimeSeriesSnapshot;

interface TimeSeriesSnapshot {
  timestamp: number;        // ms
  nodes: Record<string, {
    queueLength: number;
    activeWorkers: number;
    utilization: number;    // activeWorkers / maxWorkers
    rps: number;            // requests processed in last interval
    errorRate: number;      // errors / total in last interval
    status: string;
  }>;
  edges: Record<string, {
    throughput: number;     // requests/sec on this edge
    latencyP50: number;    // ms — median latency on this edge in last interval
    currentLoad: number;
    packetLoss: number;    // actual loss rate in last interval
  }>;
  global: {
    totalRps: number;
    totalErrors: number;
    avgLatency: number;
  };
}
```

**Interval tracking**: Keep per-node and per-edge counters that reset each snapshot interval. The engine calls `takeSnapshot` every N ms of sim-time (default: 1000ms = 1 sim-second).

**AC**:
- [ ] Snapshot contains data for every node and edge in the topology
- [ ] `utilization` is in `[0, 1]`
- [ ] `rps` resets per interval (not cumulative)
- [ ] At least one snapshot is emitted during a 10s simulation
- [ ] Snapshot data is correct: matches the node's actual state at that moment

---

### T-020: Implement simulation output aggregator

| Field | Value |
|-------|-------|
| **Blocked by** | T-017 (metrics), T-018 (tracer) |
| **File** | `src/analysis/output.ts` |
| **Size** | S |

**Context**: After the simulation completes, this module assembles the full output JSON that gets sent back to the UI.

**What to build**:

```typescript
export function generateSimulationOutput(
  metrics: MetricsCollector,
  tracer: RequestTracer,
  timeSeries: TimeSeriesSnapshot[],
  causalGraph: CausalGraph | null,
  invariantViolations: InvariantViolation[],
  config: GlobalConfig
): SimulationOutput;

interface SimulationOutput {
  summary: SimulationSummary;
  perNode: Record<string, NodeMetrics>;
  timeSeries: TimeSeriesSnapshot[];
  traces: RequestTrace[];
  causalGraph: CausalGraph | null;
  sloBreaches: SLOBreach[];
  invariantViolations: InvariantViolation[];
  littlesLawCheck: LittlesLawResult[];
  seed: string;
  reproducible: true;
}
```

**SLO breach detection**: For each node that has `slo` configured, check if any metric exceeds the target:
- If `latencyP99 > slo.latencyP99` → add breach
- If `(1 - errorRate) < slo.availabilityTarget` → add breach

**Little's Law check**: For each node:
```
L_observed = average queue length
lambda = arrival rate = totalArrived / durationSeconds
W_observed = average time in system per request
L_expected = lambda * W_observed
error = |L_observed - L_expected| / max(L_expected, 0.001)
```

**AC**:
- [ ] Output includes all fields from `SimulationOutput`
- [ ] SLO breaches detected when P99 exceeds target
- [ ] Little's Law error < 10% for a stable system
- [ ] `reproducible: true` always set
- [ ] `seed` matches the input topology's seed

---

### T-021: Implement causal failure graph builder

| Field | Value |
|-------|-------|
| **Blocked by** | T-014 (failure propagation) |
| **File** | `src/analysis/causal-graph.ts` |
| **Size** | S |

**Context**: When the failure propagation engine detects cascades, it produces a chain of `{ from, to, effect, timestamp }`. This module structures that into a graph suitable for UI visualization.

**What to build**:

```typescript
export class CausalGraphBuilder {
  addEvent(from: string, to: string, effect: string, timestamp: bigint): void;
  build(): CausalGraph;
}

interface CausalGraph {
  rootCauses: {
    nodeId: string;
    event: string;
    time: number;          // ms
  }[];
  propagation: {
    from: string;
    to: string;
    effect: string;
    time: number;
  }[];
  impactSummary: {
    totalNodesAffected: number;
    cascadeDepth: number;  // longest path from root cause
    timeToFullCascade: number;  // ms from first failure to last affected node
  };
}
```

**Root cause detection**: Nodes that appear as `from` but never as `to` in any causal edge are root causes.

**AC**:
- [ ] Root cause is correctly identified (node with no incoming causal edges)
- [ ] Cascade depth is correct (longest path)
- [ ] `timeToFullCascade` = time of last propagation event - time of first
- [ ] Works with multiple independent root causes
- [ ] Unit test: chain A→B→C→D, verify depth=3, root=A

---

## Phase 7 — Scenarios & Chaos

### T-022: Implement chaos experiment runner

| Field | Value |
|-------|-------|
| **Blocked by** | T-011 (engine), T-013 (failure injector) |
| **File** | `src/scenarios/chaos-runner.ts` |
| **Size** | M |

**Context**: A chaos experiment is a structured test: define steady state, inject failure, verify behavior. This runner wraps the simulation engine with experiment semantics.

**What to build**:

```typescript
export class ChaosExperiment {
  constructor(name: string, engine: SimulationEngine)

  defineSteadyState(assertions: SteadyStateAssertion[]): this;
  addStep(step: ExperimentStep): this;
  run(): ExperimentResult;
}

interface SteadyStateAssertion {
  metric: "error_rate" | "latency_p99" | "throughput";
  operator: "<" | ">" | "<=" | ">=";
  value: number;
  nodeId?: string;       // optional — global if omitted
}

type ExperimentStep =
  | { type: "wait"; duration: number }
  | { type: "inject"; fault: FaultSpec }
  | { type: "verify"; assertions: SteadyStateAssertion[] }
  | { type: "restore"; targetId: string }

interface ExperimentResult {
  name: string;
  passed: boolean;
  timeline: {
    step: number;
    type: string;
    time: number;
    result: "pass" | "fail" | "executed";
    detail?: string;
  }[];
  steadyStateViolations: {
    assertion: SteadyStateAssertion;
    actual: number;
    step: number;
  }[];
  simulationOutput: SimulationOutput;
}
```

**`run()` flow**:
1. Start the engine simulation.
2. Run warmup period. Check steady-state assertions → if they don't hold, fail immediately ("system not stable before experiment").
3. Execute steps in sequence:
   - `wait`: advance sim time by duration.
   - `inject`: add fault to the failure injector.
   - `verify`: check assertions against current metrics.
   - `restore`: remove the fault (recover the node).
4. After all steps, check steady-state assertions one final time.
5. Return `ExperimentResult`.

**AC**:
- [ ] Experiment with steady-state `errorRate < 0.01` passes when system is healthy
- [ ] Experiment fails when fault injection causes error rate to exceed threshold
- [ ] `wait` step correctly advances simulation time
- [ ] `restore` step recovers the node and subsequent `verify` passes
- [ ] Timeline records every step with pass/fail
- [ ] Violations list all assertions that failed and what the actual value was
- [ ] Unit test: inject DB crash, verify error rate spikes, restore, verify recovery

---

### T-023: Implement 3 built-in scenario presets

| Field | Value |
|-------|-------|
| **Blocked by** | T-022 (chaos runner) |
| **Files** | `src/scenarios/cache-stampede.ts`, `src/scenarios/db-failover.ts`, `src/scenarios/traffic-spike.ts` |
| **Size** | M |

**Context**: Ship pre-built experiments that users can run against their topology to test common failure modes. Start with the 3 most impactful scenarios.

**What to build for each scenario**:

A function that returns a configured `ChaosExperiment`:

#### 1. Cache Stampede (`cache-stampede.ts`)
```typescript
export function createCacheStampedeScenario(cacheNodeId: string, originNodeId: string): ChaosExperiment
```
- Steady state: origin DB handles < 100 RPS
- Steps:
  1. Wait 5s (warmup)
  2. Inject: crash the cache node
  3. Wait 5s (let traffic hit origin directly)
  4. Verify: origin queue depth < capacity, error rate < 10%
  5. Restore cache
  6. Wait 5s (recovery)
  7. Verify: steady state restored
- Tests whether the origin can handle the load when cache is down.

#### 2. DB Primary Failover (`db-failover.ts`)
```typescript
export function createDBFailoverScenario(primaryNodeId: string, replicaNodeId: string): ChaosExperiment
```
- Steady state: error rate < 1%, P99 < 500ms
- Steps:
  1. Wait 5s
  2. Inject: crash DB primary
  3. Wait 3s (detect failure)
  4. Inject: promote replica (scale up replica workers)
  5. Wait 10s (stabilize)
  6. Verify: error rate < 5%, requests being served
- Tests failover time and data consistency.

#### 3. Traffic Spike (`traffic-spike.ts`)
```typescript
export function createTrafficSpikeScenario(spikeMultiplier: number): ChaosExperiment
```
- Steady state: error rate < 1%, P99 < 200ms
- Steps:
  1. Wait 5s
  2. Inject: 10x traffic spike (modify workload config)
  3. Wait 15s (let autoscaling react)
  4. Verify: error rate < 10%, system recovering
  5. Wait 15s (full recovery)
  6. Verify: steady state restored
- Tests autoscaling and queue capacity.

**AC**:
- [ ] Each scenario exports a factory function
- [ ] Each scenario defines meaningful steady-state assertions
- [ ] Each scenario has at least 3 steps (inject → wait → verify)
- [ ] Scenarios can be run against any topology that has the required node types
- [ ] Scenarios return structured `ExperimentResult` with pass/fail

---

### T-024: Implement scenario composer

| Field | Value |
|-------|-------|
| **Blocked by** | T-022 (chaos runner) |
| **File** | `src/scenarios/scenario-composer.ts` |
| **Size** | S |

**Context**: Users may want to combine multiple failure scenarios (e.g., cache stampede + traffic spike simultaneously). The composer merges fault specs with optional time offsets.

**What to build**:

```typescript
export function composeScenarios(
  scenarios: { experiment: ChaosExperiment; offsetMs: number }[]
): ChaosExperiment;
```

- Merge all steps from all scenarios, adjusting timestamps by `offsetMs`.
- Merge steady-state assertions (union — all must hold).
- If two faults target the same node at the same time, the later one wins.

**AC**:
- [ ] Two scenarios with offset 5000ms produce steps at correct times
- [ ] Steady-state assertions from both scenarios are checked
- [ ] Composed experiment runs successfully

---

## Phase 8 — UI ↔ Engine Integration

### T-025: Implement Web Worker wrapper for the simulation engine

| Field | Value |
|-------|-------|
| **Blocked by** | T-011 (engine), T-020 (output) |
| **File** | `src/worker/simulation.worker.ts` |
| **Size** | M |

**Context**: The simulation runs heavy computation (potentially millions of events). Running it on the main thread would freeze the UI. We use a Web Worker so the engine runs in a background thread and communicates with the UI via `postMessage`.

**What to build**:

```typescript
// simulation.worker.ts — runs in worker thread
self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  switch (event.data.type) {
    case "RUN":    handleRun(event.data.payload);    break;
    case "PAUSE":  handlePause();                     break;
    case "RESUME": handleResume();                    break;
    case "STOP":   handleStop();                      break;
    case "STEP":   handleStep(event.data.count);      break;
  }
};
```

**`handleRun(topology: TopologyJSON)`**:
1. Validate the topology using the validator (T-003). If invalid, postMessage `{ type: "ERROR", error: validationErrors }`.
2. Create `SimulationEngine(topology)`.
3. Set up engine callbacks:
   - `onProgress`: postMessage `{ type: "PROGRESS", percent, eventsProcessed }`
   - `onSnapshot`: postMessage `{ type: "SNAPSHOT", data: snapshot }`
4. Call `engine.run()`.
5. postMessage `{ type: "COMPLETE", result: output }`.
6. Catch any errors → postMessage `{ type: "ERROR", error: message }`.

**`handlePause/Resume/Stop`**: Call the corresponding engine methods.

**`handleStep(count)`**: Call `engine.step(count)` then postMessage a snapshot.

Also define the message protocol types:

```typescript
// src/worker/protocol.ts
export type WorkerCommand =
  | { type: "RUN";    payload: TopologyJSON }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | { type: "STEP";   count: number }

export type WorkerMessage =
  | { type: "PROGRESS";  percent: number; eventsProcessed: number }
  | { type: "SNAPSHOT";  data: TimeSeriesSnapshot }
  | { type: "COMPLETE";  result: SimulationOutput }
  | { type: "ERROR";     error: string }
```

**AC**:
- [ ] Worker receives RUN command and produces COMPLETE message with SimulationOutput
- [ ] PROGRESS messages fire during simulation (at least every 1000 events)
- [ ] SNAPSHOT messages fire periodically
- [ ] STOP terminates the simulation and returns partial results
- [ ] ERROR message sent on invalid topology
- [ ] Worker doesn't block the main thread (UI stays responsive)
- [ ] Protocol types exported from `src/worker/protocol.ts`

---

### T-026: Implement `useSimulation` React hook

| Field | Value |
|-------|-------|
| **Blocked by** | T-025 (web worker) |
| **File** | `src/ui/hooks/useSimulation.ts` |
| **Size** | M |

**Context**: The React UI needs a clean hook to serialize the canvas, send it to the worker, and receive results. This hook manages the worker lifecycle.

**What to build**:

```typescript
export function useSimulation() {
  return {
    // State
    status: "idle" | "running" | "paused" | "complete" | "error",
    progress: number,              // 0-100
    result: SimulationOutput | null,
    error: string | null,
    snapshots: TimeSeriesSnapshot[],

    // Actions
    run: (topology: TopologyJSON) => void,
    pause: () => void,
    resume: () => void,
    stop: () => void,
    step: (count: number) => void,
    reset: () => void,
  };
}
```

**Implementation**:
1. Create the worker lazily on first `run()` call.
2. On `run(topology)`: postMessage `{ type: "RUN", payload: topology }`, set status to "running".
3. Listen for worker messages:
   - `PROGRESS` → update `progress` state
   - `SNAPSHOT` → append to `snapshots` array
   - `COMPLETE` → set `result`, set status to "complete"
   - `ERROR` → set `error`, set status to "error"
4. `pause/resume/stop` → postMessage the corresponding command.
5. `reset` → terminate worker, clear all state.
6. Cleanup: terminate worker on component unmount.

**AC**:
- [ ] `status` transitions correctly: idle → running → complete
- [ ] `progress` updates during simulation
- [ ] `result` is set when simulation completes
- [ ] `snapshots` accumulate during simulation
- [ ] `stop()` terminates the simulation
- [ ] Worker is terminated on unmount (no memory leaks)
- [ ] Hook can be called from any React component

---

### T-027: Implement `useLiveVisualization` React hook

| Field | Value |
|-------|-------|
| **Blocked by** | T-026 (useSimulation — provides snapshots) |
| **File** | `src/ui/hooks/useLiveVisualization.ts` |
| **Size** | S |

**Context**: During simulation, React Flow nodes and edges should update visually — node colors change based on utilization, edges change thickness based on throughput. This hook consumes snapshots and computes visual properties.

**What to build**:

```typescript
export function useLiveVisualization(snapshots: TimeSeriesSnapshot[]) {
  return {
    nodeStyles: Map<string, NodeVisualStyle>,
    edgeStyles: Map<string, EdgeVisualStyle>,
  };
}

interface NodeVisualStyle {
  backgroundColor: string;     // green/yellow/orange/red
  borderColor: string;
  queueFillPercent: number;    // 0-100 for a queue bar visualization
  statusIcon: "healthy" | "degraded" | "failed";
  overlayText: string;        // e.g., "950 rps | P99: 45ms"
}

interface EdgeVisualStyle {
  strokeWidth: number;         // proportional to throughput
  strokeColor: string;         // green-to-red gradient based on latency
  animated: boolean;           // pulse animation if active
  labelText: string;           // e.g., "1.2ms"
}
```

**Color mapping**:
- Utilization < 0.6 → green (`#22c55e`)
- 0.6–0.85 → yellow (`#eab308`)
- 0.85–0.95 → orange (`#f97316`)
- \> 0.95 or FAILED → red (`#ef4444`)

**Edge thickness**: `strokeWidth = clamp(throughput / maxThroughput * 6, 1, 8)` pixels.

**Edge color**: interpolate from green to red based on `latencyP50 / expectedLatency`.

**AC**:
- [ ] Node at 50% utilization gets green background
- [ ] Node at 90% utilization gets orange background
- [ ] Failed node gets red background and "failed" icon
- [ ] Edge thickness scales with throughput
- [ ] `overlayText` shows current RPS and P99
- [ ] Recomputes on each new snapshot
- [ ] Returns empty maps when no snapshots exist

---

### T-028: Implement topology serializer (React Flow → TopologyJSON)

| Field | Value |
|-------|-------|
| **Blocked by** | T-001 (types), T-003 (validator) |
| **File** | `src/ui/hooks/useTopologySerializer.ts` |
| **Size** | M |

**Context**: The React Flow canvas has its own internal node/edge format. We need to convert that into the `TopologyJSON` format the engine expects, filling in defaults for any unconfigured properties.

**What to build**:

```typescript
export function serializeTopology(
  rfNodes: ReactFlowNode[],
  rfEdges: ReactFlowEdge[],
  globalConfig: Partial<GlobalConfig>,
  workloadConfig: Partial<WorkloadProfile>
): { topology: TopologyJSON; warnings: string[] };
```

**Node mapping**:
- `rfNode.id` → `node.id`
- `rfNode.type` → `node.type` (must be a valid `ComponentType`)
- `rfNode.data.label` → `node.label`
- `rfNode.position` → `node.position`
- `rfNode.data.*` → map configured fields. For unconfigured fields, apply defaults:

| Field | Default |
|-------|---------|
| `resources.cpu` | 2 |
| `resources.memory` | 4096 |
| `resources.replicas` | 1 |
| `queue.workers` | 10 |
| `queue.capacity` | 100 |
| `queue.discipline` | "fifo" |
| `processing.distribution` | `{ type: "log-normal", mu: 2.3, sigma: 0.8 }` (~10ms median) |
| `processing.timeout` | 30000 |

**Edge mapping**:
- `rfEdge.id`, `rfEdge.source`, `rfEdge.target` → direct mapping
- Apply defaults for unconfigured latency, bandwidth, etc.

**Warnings**: If a node has no type configured, or critical fields are missing, add to warnings list (don't fail — use defaults).

**Validation**: Run the result through `validateTopology()` from T-003.

**AC**:
- [ ] Converts a React Flow graph with 5 nodes and 4 edges to valid `TopologyJSON`
- [ ] Applies defaults for unconfigured nodes (valid topology even with minimal config)
- [ ] Returns warnings for nodes with no type specified
- [ ] Output passes `validateTopology()`
- [ ] Preserves all user-configured values without overwriting with defaults

---

## Phase 9 — Advanced Features

### T-029: Implement autoscaling simulation

| Field | Value |
|-------|-------|
| **Blocked by** | T-011 (engine), T-008 (node) |
| **File** | `src/engine/autoscaler.ts` |
| **Size** | M |

**Context**: Nodes with a `scaling` config should automatically add/remove workers based on metrics. This simulates real autoscaling behavior including cold start penalties.

**What to build**:

```typescript
export class Autoscaler {
  constructor(nodeId: string, config: ScalingConfig, rng: RandomGenerator)

  // Called periodically by the engine (every check interval)
  evaluate(nodeState: NodeState, currentTime: bigint): ScalingAction | null;
}

interface ScalingAction {
  type: "scale_up" | "scale_down";
  nodeId: string;
  newWorkerCount: number;
  coldStartDelay?: bigint;     // only for scale_up
}
```

**Logic**:
- Read the monitored metric from `nodeState` (queue depth, utilization, etc.).
- **Scale up**: If `metric > scaleUpThreshold` AND `timeSinceLastScale > cooldown` → add 1 replica (increase workers). Apply `coldStartPenalty` — the new worker isn't available until after the penalty delay.
- **Scale down**: If `metric < scaleDownThreshold` AND `timeSinceLastScale > cooldown` AND `currentReplicas > 1` → remove 1 replica.
- Respect `maxReplicas` ceiling.

**Cold start**: Sample from `config.coldStartPenalty.distribution` (typically log-normal with median ~1s). The worker is added but doesn't accept requests until the cold start completes. Schedule a `SCALE_UP_COMPLETE` event.

**AC**:
- [ ] Scale up triggers when queue depth exceeds threshold
- [ ] Scale down triggers when queue depth falls below threshold
- [ ] Cooldown prevents rapid oscillation
- [ ] `maxReplicas` is respected
- [ ] Cold start delay: new workers don't serve requests immediately
- [ ] Unit tests for scale up, scale down, cooldown, and cold start

---

### T-030: Implement anti-pattern detector

| Field | Value |
|-------|-------|
| **Blocked by** | T-001 (types) |
| **File** | `src/analysis/anti-pattern-detector.ts` |
| **Size** | S |

**Context**: Before running a simulation, scan the topology for known architectural anti-patterns and warn the user. This is a static analysis — no simulation needed.

**What to build**:

```typescript
export function detectAntiPatterns(topology: TopologyJSON): AntiPatternDetection[];

interface AntiPatternDetection {
  pattern: string;
  severity: "warning" | "critical";
  affectedNodes: string[];
  description: string;
  recommendation: string;
}
```

**Rules to implement**:

| Anti-Pattern | Detection Logic | Severity |
|-------------|----------------|----------|
| **Monolithic shared DB** | Count edges to each storage node. If a storage node has > 3 incoming edges from different services → flag. | warning |
| **Sync RPC for long ops** | If a synchronous edge targets a node whose `processing.distribution` median > 5000ms → flag. | critical |
| **Unlimited retries** | If any node's `resilience.retry.maxAttempts > 10` → flag. | warning |
| **No circuit breaker** | If a node has critical dependencies but no `resilience.circuitBreaker` configured → flag. | warning |
| **Missing timeout** | If any node has no `processing.timeout` → flag. | warning |
| **Single point of failure** | If a node has > 3 upstream dependents and `resources.replicas === 1` → flag. | critical |
| **No queue capacity** | If a node's `queue.capacity === 0` (unlimited) and it has high-throughput incoming edges → flag. | warning |

**AC**:
- [ ] Detects shared DB pattern when 4 services connect to 1 DB
- [ ] Detects sync RPC for a 10-second processing time operation
- [ ] Detects single point of failure (single replica, many dependents)
- [ ] Returns empty array for a well-architected topology
- [ ] Each detection includes a human-readable recommendation
- [ ] Unit tests for each anti-pattern rule

---

### T-031: Implement cost calculator

| Field | Value |
|-------|-------|
| **Blocked by** | T-001 (types) |
| **File** | `src/analysis/cost-calculator.ts` |
| **Size** | S |

**Context**: Estimate the hourly cloud cost of the topology based on resource configs and provider pricing. Helps users understand cost trade-offs between different architectures.

**What to build**:

```typescript
export function calculateCost(
  topology: TopologyJSON,
  provider: "aws" | "gcp" | "azure"
): CostEstimate;

interface CostEstimate {
  totalHourlyCost: number;    // USD
  totalMonthlyCost: number;   // USD (730 hours)
  perNode: Record<string, {
    nodeId: string;
    label: string;
    hourlyCost: number;
    breakdown: {
      compute: number;
      memory: number;
      storage: number;
    };
  }>;
}
```

**Pricing table** (simplified — use rough averages):

| Resource | AWS ($/hr) | GCP ($/hr) | Azure ($/hr) |
|----------|-----------|-----------|-------------|
| 1 vCPU | 0.0416 | 0.0380 | 0.0400 |
| 1 GB RAM | 0.0052 | 0.0051 | 0.0053 |
| Managed DB (per vCPU) | 0.0830 | 0.0750 | 0.0800 |
| Cache (per GB) | 0.0170 | 0.0160 | 0.0170 |
| Load Balancer | 0.0250 | 0.0250 | 0.0250 |

**Calculation per node**:
```
computeCost = resources.cpu * cpuPrice * resources.replicas
memoryCost  = (resources.memory / 1024) * memPrice * resources.replicas
hourlyCost  = computeCost + memoryCost
```
Apply category-specific multipliers (DB nodes cost more than compute nodes due to managed service overhead).

**AC**:
- [ ] Returns total and per-node cost estimates
- [ ] DB nodes are more expensive than plain compute nodes
- [ ] `replicas` multiplies the cost correctly
- [ ] All three providers produce slightly different costs
- [ ] Monthly cost ≈ hourly * 730

---

### T-032: Implement design comparator

| Field | Value |
|-------|-------|
| **Blocked by** | T-020 (simulation output) |
| **File** | `src/analysis/comparator.ts` |
| **Size** | S |

**Context**: Users want to compare two topology variants (e.g., "3 replicas vs. 5 replicas" or "with cache vs. without cache"). The comparator takes two `SimulationOutput` objects and produces a diff.

**What to build**:

```typescript
export function compareDesigns(
  designA: { name: string; output: SimulationOutput },
  designB: { name: string; output: SimulationOutput }
): DesignComparison;

interface DesignComparison {
  metrics: {
    metric: string;
    designA: number;
    designB: number;
    delta: number;           // designB - designA
    percentChange: number;   // (delta / designA) * 100
    winner: "A" | "B" | "tie";
  }[];
  perNode: Record<string, {
    onlyInA: boolean;
    onlyInB: boolean;
    utilizationDelta?: number;
    latencyDelta?: number;
  }>;
  summary: string;           // e.g., "Design B has 64% lower P99 latency but costs 44% more"
}
```

**Metrics to compare**:
- `latency.p50`, `latency.p90`, `latency.p95`, `latency.p99`
- `throughput`
- `errorRate`
- `summary.successfulRequests`

For each metric, determine `winner`: lower latency/error rate is better, higher throughput is better.

Generate a human-readable `summary` string highlighting the most significant differences.

**AC**:
- [ ] Compares two outputs on all latency percentiles, throughput, and error rate
- [ ] Correctly identifies which design is better per metric
- [ ] `percentChange` is calculated correctly
- [ ] `perNode` shows nodes that exist in only one design
- [ ] `summary` is a coherent English sentence
- [ ] Unit test with two mock outputs

---

## Ticket Index

### By Phase

| Phase | Tickets |
|-------|---------|
| 0 — JSON Format | T-001, T-002, T-003 |
| 1 — Primitives | T-004, T-005, T-006, T-007 |
| 2 — Engine | T-008, T-009, T-010, T-011 |
| 3 — Network | T-012 |
| 4 — Failures | T-013, T-014 |
| 5 — Resilience | T-015, T-016 |
| 6 — Metrics & Output | T-017, T-018, T-019, T-020, T-021 |
| 7 — Scenarios | T-022, T-023, T-024 |
| 8 — UI Integration | T-025, T-026, T-027, T-028 |
| 9 — Advanced | T-029, T-030, T-031, T-032 |

### By Independence (can start immediately — no blockers)

| Ticket | Description |
|--------|-------------|
| **T-001** | TypeScript types for topology JSON |
| **T-002** | Event types and factory functions |
| **T-004** | BigInt time utilities |
| **T-005** | Deterministic PRNG (SFC32) |

### Dependency Chain (critical path)

```
T-001 + T-002 + T-004 + T-005   (parallel — no deps)
         │           │       │
         ▼           ▼       ▼
       T-003       T-006   T-007
         │           │       │
         ▼           ▼       ▼
       T-010       T-008   T-009
         │           │       │
         └─────┬─────┘───────┘
               ▼
             T-011  (engine — the big one)
               │
      ┌────────┼────────┬──────────┐
      ▼        ▼        ▼          ▼
    T-012    T-013    T-015      T-017
      │        │        │          │
      ▼        ▼        ▼          ▼
    T-014    T-016    T-018      T-019
               │                   │
               ▼                   ▼
             T-022               T-020
               │                   │
               ▼                   ▼
             T-023               T-025
                                   │
                                   ▼
                                 T-026
                                   │
                                   ▼
                                 T-027
```

### By Size

| Size | Tickets |
|------|---------|
| **S** (1-2 hrs) | T-002, T-004, T-005, T-007, T-010, T-018, T-019, T-020, T-021, T-024, T-027, T-030, T-031, T-032 |
| **M** (3-5 hrs) | T-001, T-003, T-006, T-009, T-012, T-015, T-016, T-017, T-022, T-023, T-025, T-026, T-028, T-029 |
| **L** (1 day) | T-008, T-013, T-014 |
| **XL** (2+ days) | T-011 |
