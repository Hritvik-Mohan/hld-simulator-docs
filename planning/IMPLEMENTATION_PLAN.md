# HLD Simulator — Implementation Plan

> **Premise**: The UI layer (React Flow canvas for placing/connecting nodes and edges) is already built. This plan covers everything _after_ the canvas — from the topology JSON format the UI produces, through the simulation engine, to the output analysis layer.

---

## Table of Contents

1. [Phase 0 — Topology JSON Format](#phase-0--topology-json-format)
2. [Phase 1 — Core Primitives](#phase-1--core-primitives)
3. [Phase 2 — Simulation Engine](#phase-2--simulation-engine)
4. [Phase 3 — Network & Edge Modeling](#phase-3--network--edge-modeling)
5. [Phase 4 — Failure Injection & Propagation](#phase-4--failure-injection--propagation)
6. [Phase 5 — Resilience Patterns](#phase-5--resilience-patterns)
7. [Phase 6 — Metrics, Tracing & Output](#phase-6--metrics-tracing--output)
8. [Phase 7 — Scenario Presets & Chaos Engineering](#phase-7--scenario-presets--chaos-engineering)
9. [Phase 8 — UI ↔ Engine Integration](#phase-8--ui--engine-integration)
10. [Phase 9 — Advanced Features](#phase-9--advanced-features)
11. [Dependency Graph](#dependency-graph)
12. [Suggested File Structure](#suggested-file-structure)

---

## Phase 0 — Topology JSON Format

**Goal**: Define the canonical JSON shape that the React Flow UI serializes to and that the simulation engine consumes. This is the contract between frontend and backend.

### 0.1 — Top-Level Structure

```jsonc
{
  "id": "arch-uuid-v4",
  "name": "My E-Commerce System",
  "version": "1.0.0",

  "global": {
    "simulationDuration": 60000,       // ms
    "seed": "my-seed-string",
    "warmupDuration": 5000,            // ms — metrics collected only after warmup
    "timeResolution": "microsecond",   // "microsecond" | "millisecond"
    "defaultTimeout": 30000            // ms — fallback if a node doesn't specify one
  },

  "nodes": [ /* ComponentNode[] */ ],
  "edges": [ /* EdgeDefinition[] */ ],

  "workload": { /* WorkloadProfile */ },
  "faults":   [ /* FaultSpec[] */ ],
  "invariants": [ /* InvariantCheck[] */ ],
  "scenarios": [ /* ScenarioRef[] — optional preset references */ ]
}
```

### 0.2 — Node Shape (`ComponentNode`)

Each React Flow node serializes to:

```jsonc
{
  "id": "node-api-gateway",
  "type": "api-gateway",              // ComponentType from the 113-type taxonomy
  "category": "network",             // compute | network | storage | messaging | ...
  "label": "API Gateway",            // display name from the canvas

  // --- Position (React Flow metadata, ignored by engine) ---
  "position": { "x": 320, "y": 180 },

  // --- Resources ---
  "resources": {
    "cpu": 2,                         // vCPUs
    "memory": 4096,                   // MB
    "replicas": 3,
    "maxReplicas": 10                 // for autoscaling
  },

  // --- Queue model (G/G/c/K) ---
  "queue": {
    "workers": 100,                   // c — concurrent processing slots
    "capacity": 500,                  // K — max queue size (0 = unlimited)
    "discipline": "fifo"              // "fifo" | "lifo" | "priority" | "wfq"
  },

  // --- Processing ---
  "processing": {
    "distribution": {
      "type": "log-normal",
      "mu": 2.3,                      // log-space mean
      "sigma": 0.8                    // log-space std dev
    },
    "timeout": 5000                   // ms — per-request timeout
  },

  // --- Dependencies ---
  "dependencies": {
    "critical": ["node-auth-service"],    // must be healthy
    "optional": ["node-recommendation"]   // graceful degradation if down
  },

  // --- Resilience (optional, per-node overrides) ---
  "resilience": {
    "circuitBreaker": {
      "failureThreshold": 0.5,
      "failureCount": 10,
      "recoveryTimeout": 30000,
      "halfOpenRequests": 3
    },
    "retry": {
      "maxAttempts": 3,
      "baseDelay": 100,
      "maxDelay": 5000,
      "multiplier": 2,
      "jitter": true
    },
    "rateLimiter": {
      "maxTokens": 1000,
      "refillRate": 100              // tokens/sec
    },
    "bulkhead": {
      "maxConcurrent": 50
    }
  },

  // --- SLO targets ---
  "slo": {
    "latencyP99": 500,               // ms
    "availabilityTarget": 0.999,
    "errorBudget": 0.001
  },

  // --- Failure modes (what CAN go wrong with this node) ---
  "failureModes": [
    {
      "mode": "crash",
      "severity": "critical",
      "mtbf": 86400000,              // ms — mean time between failures
      "mttr": 30000                   // ms — mean time to repair
    },
    {
      "mode": "latency-spike",
      "severity": "degraded",
      "trigger": { "metric": "cpu", "operator": ">", "value": 0.9 }
    }
  ],

  // --- Scaling policy (optional) ---
  "scaling": {
    "type": "horizontal",
    "metric": "queue-depth",
    "scaleUpThreshold": 100,
    "scaleDownThreshold": 10,
    "cooldown": 60000,
    "coldStartPenalty": {
      "distribution": { "type": "log-normal", "mu": 6.9, "sigma": 0.5 }
    }
  },

  // --- Component-specific config (optional) ---
  "config": {
    // shape depends on `type` — examples:
    // database: { "engine": "postgres", "replicationMode": "async", ... }
    // cache: { "evictionPolicy": "lru", "maxMemory": 1024, ... }
    // load-balancer: { "algorithm": "round-robin", ... }
  }
}
```

### 0.3 — Edge Shape (`EdgeDefinition`)

Each React Flow edge serializes to:

```jsonc
{
  "id": "edge-gw-to-api",
  "source": "node-api-gateway",
  "target": "node-api-service",
  "label": "REST/HTTPS",             // display label

  // --- Edge behavior ---
  "mode": "synchronous",             // "synchronous" | "asynchronous" | "streaming" | "conditional"
  "protocol": "https",               // "https" | "grpc" | "tcp" | "udp" | "websocket" | "amqp" | "kafka"

  // --- Latency ---
  "latency": {
    "distribution": {
      "type": "log-normal",
      "mu": 0.5,
      "sigma": 0.3
    },
    "pathType": "same-dc"            // "same-rack" | "same-dc" | "cross-zone" | "cross-region" | "internet"
  },

  // --- Capacity ---
  "bandwidth": 1000,                 // Mbps
  "maxConcurrentRequests": 10000,

  // --- Reliability ---
  "packetLossRate": 0.001,           // base probability
  "errorRate": 0.0,                  // application-level error injection

  // --- Routing (for fan-out edges) ---
  "weight": 1.0,                     // relative weight for weighted routing
  "condition": null,                 // JS expression string for conditional edges

  // --- React Flow metadata (ignored by engine) ---
  "sourceHandle": "right",
  "targetHandle": "left",
  "animated": true
}
```

### 0.4 — Workload Profile

```jsonc
{
  "sourceNodeId": "node-users",      // which source node generates traffic
  "pattern": "diurnal",              // "constant" | "poisson" | "bursty" | "diurnal" | "spike" | "sawtooth" | "replay"
  "baseRps": 1000,

  // Pattern-specific params:
  "diurnal": {
    "peakMultiplier": 3.0,
    "hourlyMultipliers": [0.3, 0.2, 0.1, /* ... 24 values */ ]
  },
  "spike": {
    "spikeTime": 15000,
    "spikeRps": 5000,
    "spikeDuration": 3000
  },

  "requestDistribution": [
    { "type": "GET",  "weight": 0.7, "sizeBytes": 200 },
    { "type": "POST", "weight": 0.2, "sizeBytes": 1500 },
    { "type": "PUT",  "weight": 0.1, "sizeBytes": 800 }
  ]
}
```

### 0.5 — Serialization Notes

- React Flow's internal `nodes[]` and `edges[]` arrays map 1:1 to the topology JSON. The UI layer adds `position`, handle metadata, and visual styles; the engine ignores those fields.
- The UI should validate the JSON against the schema before sending it to the engine (use a lightweight JSON Schema or Zod validator).
- The `id` fields must be stable UUIDs or slug-ids so the engine can reference them deterministically.

---

## Phase 1 — Core Primitives

**Goal**: Build the foundational building blocks that every other module depends on.

### 1.1 — BigInt Time Utilities

| What | Why |
|------|-----|
| `msToMicro(ms)` → `BigInt` | Avoid floating-point drift over millions of events |
| `microToMs(us)` → `number` | Convert back for human-readable output |
| `secToMicro(s)` → `BigInt` | Convenience |

- All internal engine timestamps use `BigInt` microseconds.
- External-facing outputs convert back to `number` milliseconds.

**Estimated size**: ~30 lines.

### 1.2 — Deterministic PRNG (SFC32)

| What | Why |
|------|-----|
| `xmur3(seedString)` → `() => number` | Convert any seed string into 4 numeric seeds |
| `sfc32(a, b, c, d)` → `() => number` | Fast PRNG, passes BigCrush, 2^128 period |
| `createRandom(seedString)` → `{ next(), between(min,max) }` | Ergonomic wrapper |

- Every stochastic component receives its own `createRandom` instance derived from the global seed + a component-specific salt. This guarantees determinism _and_ independence.

**Estimated size**: ~60 lines.

### 1.3 — Distribution Sampler

Implement a `Distributions` class that takes a PRNG and exposes:

| Method | Use Case |
|--------|----------|
| `constant(value)` | Fixed delays |
| `uniform(min, max)` | Jitter |
| `exponential(lambda)` | Inter-arrival times |
| `normal(mean, stddev)` | Natural variation |
| `logNormal(mu, sigma)` | API latency (most important) |
| `poisson(lambda)` | Event counts |
| `weibull(shape, scale)` | Hardware failure |
| `gamma(shape, rate)` | Aggregated service times |
| `beta(alpha, beta)` | Probability sampling |
| `pareto(alpha, xMin)` | Heavy-tailed phenomena |
| `fromConfig(DistributionConfig)` | Dispatch from the JSON topology |

**Estimated size**: ~120 lines.

### 1.4 — Min-Heap (Priority Queue)

- Array-backed binary min-heap.
- Keyed on `timestamp` (BigInt), with tie-breaking on `priority` (number — lower = higher priority).
- Priority classes: `SYSTEM = 0`, `ARRIVAL = 1`, `PROCESSING = 2`, `DEPARTURE = 3`, `TIMEOUT = 4`.
- Methods: `insert(event)`, `extractMin()`, `peek()`, `size`, `isEmpty`.

**Estimated size**: ~80 lines.

### 1.5 — Event Types

Define a discriminated union or enum for all event types:

```
REQUEST_GENERATED | REQUEST_ARRIVAL | PROCESSING_START | PROCESSING_COMPLETE |
REQUEST_FORWARDED | REQUEST_COMPLETE | REQUEST_TIMEOUT | REQUEST_REJECTED |
NODE_FAILURE | NODE_RECOVERY | NETWORK_PARTITION | LATENCY_SPIKE |
SCALE_UP | SCALE_DOWN | CIRCUIT_BREAKER_OPEN | CIRCUIT_BREAKER_CLOSE |
HEALTH_CHECK | CONFIG_CHANGE | CACHE_HIT | CACHE_MISS | DB_FAILOVER | ...
```

Each event carries: `{ timestamp: bigint, type: EventType, nodeId: string, requestId: string, data: EventData, priority: number }`.

**Estimated size**: ~80 lines (types + factory functions).

---

## Phase 2 — Simulation Engine

**Goal**: The core event loop that drives the entire simulation.

### 2.1 — G/G/c/K Node Model

Each node in the topology becomes a `GGcKNode` instance:

- **State**: `queue[]`, `activeWorkers`, `status` (IDLE / BUSY / SATURATED / FAILED), `metrics` (counters).
- **`handleArrival(request)`**: If workers available → `startProcessing()`. If queue has space → enqueue. Else → reject (emit `REQUEST_REJECTED`).
- **`startProcessing(request)`**: Sample service time from the node's distribution. Schedule `PROCESSING_COMPLETE` at `now + serviceTime`. Increment `activeWorkers`.
- **`handleCompletion(request)`**: Decrement `activeWorkers`. Dequeue next if queue non-empty. Emit departure event.
- **`getMetrics()`**: Return `{ totalArrived, totalProcessed, totalRejected, totalTimedOut, avgQueueLength, avgServiceTime, utilization }`.

**Estimated size**: ~150 lines.

### 2.2 — Workload Generator

- Reads the `workload` section of the topology JSON.
- On `initialize()`, schedules the first `REQUEST_GENERATED` event.
- On each `REQUEST_GENERATED`, samples the inter-arrival time from the configured pattern, and schedules the next `REQUEST_GENERATED`.
- Generates request objects with `{ id, type, sizeBytes, priority, createdAt }`.

**Estimated size**: ~100 lines.

### 2.3 — Routing Table

- Built from the `edges[]` array at initialization.
- `getTargets(sourceNodeId)` → returns list of `{ targetNodeId, edge }`.
- Supports routing strategies:
  - **Single**: one target (most edges).
  - **Weighted**: multiple targets with `weight` — select via weighted random.
  - **Conditional**: evaluate `edge.condition` against request context.
  - **Round-robin**: cycle through targets.
  - **Consistent hashing**: hash request key to target.

**Estimated size**: ~80 lines.

### 2.4 — Main Event Loop (`SimulationEngine`)

```
initialize(topologyJSON):
  1. Parse global config, create PRNG from seed
  2. Instantiate GGcKNode for each node in nodes[]
  3. Build routing table from edges[]
  4. Create WorkloadGenerator, schedule first event
  5. Create MetricsCollector

run():
  while eventQueue.isNotEmpty():
    event = eventQueue.extractMin()
    if event.timestamp > simulationDuration: break
    clock = event.timestamp
    handle(event)

handle(event):
  switch event.type:
    REQUEST_GENERATED   → workloadGenerator creates request, forwards to first node
    REQUEST_ARRIVAL     → node.handleArrival(request)
    PROCESSING_COMPLETE → node.handleCompletion(request), forward to downstream
    REQUEST_FORWARDED   → edge.send(request), schedule arrival at target
    REQUEST_TIMEOUT     → mark request failed, update metrics
    REQUEST_COMPLETE    → record end-to-end latency
    NODE_FAILURE        → set node status = FAILED, reject all in-flight
    NODE_RECOVERY       → set node status = IDLE, resume processing
    SCALE_UP/DOWN       → adjust node.workers
    ...

schedule(timestamp, type, nodeId, data):
  eventQueue.insert({ timestamp, type, nodeId, data, priority })
```

**Estimated size**: ~300 lines.

### 2.5 — Little's Law Verification

After the simulation completes, verify correctness per node:

```
For each node:
  L_observed = average queue length (sampled)
  lambda      = arrival rate (totalArrived / duration)
  W_observed  = average time in system (queue wait + service time)
  L_expected  = lambda * W_observed

  error = |L_observed - L_expected| / L_expected
  if error > 0.10: flag warning
```

This acts as a built-in sanity check that the engine is behaving correctly.

**Estimated size**: ~40 lines (integrated into engine output).

---

## Phase 3 — Network & Edge Modeling

**Goal**: Realistic latency, bandwidth, congestion, and packet loss on every edge.

### 3.1 — Latency Decomposition

Each edge calculates total latency as:

```
L = propagation + transmission + processing + queuing + jitter
```

| Component | Calculation |
|-----------|-------------|
| Propagation | `distance_km / 200` (speed of light in fiber, ~200 km/ms) |
| Transmission | `request.sizeBytes / (edge.bandwidth * 125)` (Mbps → bytes/ms) |
| Processing | Sampled from `edge.latency.distribution` |
| Queuing | Based on edge utilization: `base / (1 - utilization)` (M/M/1 model) |
| Jitter | `uniform(-jitterRange, +jitterRange)` |

### 3.2 — Path-Type Defaults

If the user doesn't specify a distribution, infer defaults from `edge.latency.pathType`:

| Path Type | Default Distribution |
|-----------|---------------------|
| `same-rack` | `logNormal(mu=-1.2, sigma=0.3)` → ~0.1–0.5ms |
| `same-dc` | `logNormal(mu=0.0, sigma=0.4)` → ~0.5–2ms |
| `cross-zone` | `logNormal(mu=0.7, sigma=0.4)` → ~1–3ms |
| `cross-region` | `logNormal(mu=4.1, sigma=0.3)` → ~60–80ms |
| `internet` | `mixture([logNormal(3.0, 0.5), logNormal(5.0, 0.8)], [0.8, 0.2])` |

### 3.3 — Congestion Modeling

Track `edge.currentLoad` (active concurrent requests). When load approaches capacity:

- **Linear**: `delayMultiplier = 1 + (load / capacity)`
- **Exponential (M/M/1)**: `delayMultiplier = 1 / (1 - utilization)` — latency explodes near saturation
- **Step**: normal until 80% → 2x at 80–95% → 5x above 95%

### 3.4 — Packet Loss

```
effectiveLossRate = baseLossRate + congestionBonus
if random() < effectiveLossRate:
  drop packet (emit REQUEST_TIMEOUT after source's timeout)
```

### 3.5 — `NetworkEdge` Class

```
class NetworkEdge:
  send(request, currentTime):
    latency = calculateLatency(request)
    if isPacketLost(): return { lost: true }
    arrivalTime = currentTime + latency
    return { lost: false, arrivalTime, latencyBreakdown }
```

**Estimated size**: ~120 lines.

---

## Phase 4 — Failure Injection & Propagation

**Goal**: Make things break — on schedule, randomly, or conditionally — and watch the effects cascade.

### 4.1 — Failure Injector

Reads the `faults[]` array from the topology JSON. Each fault spec has:

- **Target**: node ID or edge ID
- **Fault type**: `crash | hang | latency-spike | error-rate | packet-loss | cpu-stress | memory-pressure | dns-failure | process-crash | ...`
- **Timing**: `deterministic(atTime)` | `probabilistic(probability, checkInterval)` | `conditional(metric, operator, threshold)`
- **Duration**: `fixed(ms)` | `until(condition)` | `permanent`

On each engine tick, `FailureInjector.check(currentTime, nodeStates)`:
1. Activate faults whose timing condition is met.
2. Deactivate faults whose duration has elapsed.
3. Apply effects to targeted nodes/edges (e.g., set `node.status = FAILED`, multiply latency by 10x, increase error rate).

**Estimated size**: ~150 lines.

### 4.2 — Failure Propagation Engine

Builds a dependency graph from `node.dependencies.critical` and `node.dependencies.optional`.

Propagation rules define how failure at node A affects nodes B, C, ...:

- **Trigger conditions**: `dependency_failure` (a critical dep is down), `error_rate > threshold`, `latency > threshold`, `queue_depth > threshold`, `timeout_rate > threshold`.
- **Effects**: `increase_latency(factor)`, `increase_error_rate(delta)`, `reduce_capacity(factor)`, `fail_node`.
- **Scope**: `upstream` (callers), `downstream` (callees), `all_dependents`, `specific([nodeIds])`.

On each failure event, `PropagationEngine.propagate(failedNodeId)`:
1. Walk the dependency graph.
2. For each affected node, check if any propagation rule triggers.
3. If triggered, apply the effect and potentially cascade further.
4. Track the causal chain for the output causal graph.

**Estimated size**: ~150 lines.

### 4.3 — Cascade Patterns to Handle

The engine must correctly model these five patterns:

| Pattern | Mechanism | Fix the engine should simulate |
|---------|-----------|-------------------------------|
| Timeout cascade | Upstream waits for downstream timeout, then itself times out | Deadline propagation (child timeout < parent) |
| Retry amplification | 3 retries × 3 layers = 27 requests at leaf | Circuit breakers cut the amplification |
| Resource starvation | Slow dep holds connections, starves other deps | Bulkhead isolation (per-dep pools) |
| Thundering herd | All clients retry at same instant after recovery | Jittered retry + circuit breakers |
| Cache stampede | TTL expires for many keys simultaneously | Staggered TTLs + request coalescing |

---

## Phase 5 — Resilience Patterns

**Goal**: Implement the defense mechanisms that nodes can use against failures.

### 5.1 — Circuit Breaker

State machine per dependency edge:

```
CLOSED → (failure rate > threshold within window) → OPEN
OPEN   → (recovery timeout expires) → HALF_OPEN
HALF_OPEN → (test requests succeed) → CLOSED
HALF_OPEN → (test requests fail) → OPEN
```

- `allowRequest()` → boolean
- `recordSuccess()` / `recordFailure()`
- Emits `CIRCUIT_BREAKER_OPEN` / `CIRCUIT_BREAKER_CLOSE` events for observability.

**Estimated size**: ~80 lines.

### 5.2 — Retry with Exponential Backoff + Jitter

```
delay = min(baseDelay * multiplier^attempt, maxDelay)
if jitter: delay = uniform(0, delay)    // "full jitter" — best for thundering herd
```

- Track retries per request to prevent infinite loops.
- Retries count as new arrivals at the target node (they consume capacity).

**Estimated size**: ~40 lines.

### 5.3 — Rate Limiter (Token Bucket)

```
tokens = min(tokens + refillRate * elapsed, maxTokens)
if tokens >= 1: allow, tokens -= 1
else: reject with retryAfter = (1 - tokens) / refillRate
```

**Estimated size**: ~30 lines.

### 5.4 — Bulkhead

Per-dependency concurrency limit. If `activeCalls[depId] >= maxConcurrent`: reject immediately instead of queuing.

**Estimated size**: ~25 lines.

### 5.5 — Load Shedder

When a node is overwhelmed, selectively drop requests:
- **Priority-based**: drop low-priority first.
- **LIFO**: drop newest (they've waited least — least wasted work).
- **Random**: fair but unpredictable.

Trigger: `queueLength > threshold` OR `estimatedWaitTime > timeout`.

**Estimated size**: ~40 lines.

### 5.6 — Timeout & Deadline Propagation

Each request carries a `deadline` (absolute timestamp). When forwarding downstream:

```
childDeadline = min(parentDeadline, now + childTimeout)
```

If `now > deadline` at any point, the request is immediately timed out — no further processing.

**Estimated size**: ~20 lines.

---

## Phase 6 — Metrics, Tracing & Output

**Goal**: Collect, aggregate, and present the simulation results.

### 6.1 — Metrics Collector

During the simulation, for every completed or failed request, record:

- `requestId`, `sourceNode`, `path[]` (sequence of nodes visited), `totalLatency`, `status` (success | timeout | rejected | error)
- Per-node: `arrivalTime`, `queueWait`, `serviceTime`, `departureTime`

After the simulation, compute:

| Metric | Calculation |
|--------|-------------|
| Latency percentiles | P50, P90, P95, P99 from sorted latency array |
| Throughput | `successfulRequests / (duration - warmup)` |
| Error rate | `failedRequests / totalRequests` |
| Availability | `1 - (errorSeconds / totalSeconds)` |
| Per-node utilization | `busyTime / totalTime` per node |
| Queue saturation | `timeAtCapacity / totalTime` per node |
| SLO breaches | Count of requests exceeding `node.slo.latencyP99` |

**Estimated size**: ~120 lines.

### 6.2 — Request Tracing (Waterfall View)

Build a trace for each sampled request (sample rate configurable — e.g., 1% of requests):

```jsonc
{
  "requestId": "req-0042",
  "totalLatency": 145,
  "spans": [
    { "node": "gateway", "start": 0,   "end": 12,  "queueWait": 2,  "serviceTime": 10 },
    { "node": "auth",    "start": 13,  "end": 25,  "queueWait": 0,  "serviceTime": 12 },
    { "node": "api",     "start": 26,  "end": 80,  "queueWait": 5,  "serviceTime": 49 },
    { "node": "db",      "start": 81,  "end": 140, "queueWait": 15, "serviceTime": 44 }
  ]
}
```

The UI can render this as a horizontal waterfall chart (like Chrome DevTools network tab).

### 6.3 — Time-Series Data

Emit periodic snapshots (every 1 second of sim-time) of:

```jsonc
{
  "timestamp": 15000,
  "nodes": {
    "gateway": { "queueLength": 42, "activeWorkers": 95, "rps": 980, "errorRate": 0.02 },
    "db":      { "queueLength": 150, "activeWorkers": 50, "rps": 500, "errorRate": 0.0 }
  },
  "edges": {
    "gw-to-api": { "throughput": 950, "latencyP50": 1.2, "packetLoss": 0.001 }
  },
  "global": { "totalRps": 980, "totalErrors": 20, "avgLatency": 85 }
}
```

The UI can use this for live-updating line charts, heatmaps, and node coloring (green/yellow/red based on utilization).

### 6.4 — Causal Failure Graph

When failures cascade, build a directed graph:

```jsonc
{
  "rootCause": { "nodeId": "db-primary", "event": "NODE_FAILURE", "time": 12000 },
  "propagation": [
    { "from": "db-primary", "to": "api-service", "effect": "timeout_cascade", "time": 12500 },
    { "from": "api-service", "to": "gateway", "effect": "queue_saturation", "time": 14000 },
    { "from": "gateway", "to": "users", "effect": "503_errors", "time": 15000 }
  ]
}
```

### 6.5 — Simulation Output Shape

The full output returned to the UI:

```jsonc
{
  "summary": {
    "totalRequests": 58000,
    "successfulRequests": 56800,
    "failedRequests": 1200,
    "duration": 60000,
    "throughput": 946.7,
    "errorRate": 0.0207,
    "latency": { "p50": 45, "p90": 120, "p95": 210, "p99": 890 }
  },
  "perNode": { /* per-node metrics */ },
  "timeSeries": [ /* periodic snapshots */ ],
  "traces": [ /* sampled request waterfalls */ ],
  "causalGraph": { /* failure propagation graph */ },
  "sloBreaches": [ /* { nodeId, metric, target, actual, time } */ ],
  "invariantViolations": [ /* { invariant, description, time } */ ],
  "littlesLawCheck": [ /* { nodeId, expected, actual, error } */ ],
  "seed": "my-seed-string",
  "reproducible": true
}
```

---

## Phase 7 — Scenario Presets & Chaos Engineering

**Goal**: Ship pre-built experiments so users can test their architectures immediately.

### 7.1 — Built-In Scenarios

Implement the 7 scenarios from the catalogue:

| # | Scenario | What it tests |
|---|----------|---------------|
| 1 | **Cache stampede** | TTL expires for 1M keys → origin overload |
| 2 | **DB primary crash** | Failover time, data consistency, replication lag |
| 3 | **Network partition** | Split-brain, cross-region writes during partition |
| 4 | **Auth provider outage** | Login failures cascading to downstream services |
| 5 | **10x traffic spike** | Autoscaling response time, cold start penalties |
| 6 | **Price surge** | Cost impact, autoscale budget limits |
| 7 | **Feature flag rollback** | Mixed behavior across fleet during partial rollback |

Each scenario is a JSON preset that injects specific faults at specific times and defines steady-state assertions.

### 7.2 — Chaos Experiment Runner

```
class ChaosExperiment:
  defineSteadyState(assertions[])    // e.g., errorRate < 0.01, p99 < 500ms
  addStep(action)                    // inject | wait | verify | restore
  run(engine):
    1. Run warmup, verify steady state holds
    2. Execute steps in sequence
    3. After each step, check steady-state assertions
    4. Return { passed: boolean, timeline, violations[] }
```

### 7.3 — Scenario Composer

Allow users to combine scenarios:

```
compose([cacheStampede, trafficSpike], { offset: 5000 })
// cache stampede at t=0, then 10x spike at t=5000
```

---

## Phase 8 — UI ↔ Engine Integration

**Goal**: Connect the React Flow frontend to the simulation engine.

### 8.1 — Engine Execution Strategy

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Web Worker** | Non-blocking UI, same-origin | Single-threaded, memory limited | **Use this for v1** |
| **Server-side (Node.js)** | More memory, can parallelize | Requires backend deployment | v2 |
| **WASM** | Near-native speed | Complex build pipeline | v3 |

**Web Worker approach**:

```
UI Thread                          Worker Thread
─────────                          ─────────────
serialize topology JSON ──────►   receive JSON
                                   parse & validate
                                   run simulation
             ◄────── progress %    (periodic postMessage)
             ◄────── time-series   (streaming snapshots)
             ◄────── final result  (complete output JSON)
```

### 8.2 — Message Protocol (UI ↔ Worker)

```typescript
// UI → Worker
type WorkerCommand =
  | { type: "RUN",    payload: TopologyJSON }
  | { type: "PAUSE"  }
  | { type: "RESUME" }
  | { type: "STOP"   }
  | { type: "STEP",   count: number }   // advance N events (debug mode)

// Worker → UI
type WorkerMessage =
  | { type: "PROGRESS",    percent: number, eventsProcessed: number }
  | { type: "SNAPSHOT",    data: TimeSeriesSnapshot }
  | { type: "COMPLETE",    result: SimulationOutput }
  | { type: "ERROR",       error: string }
```

### 8.3 — Live Visualization Hooks

While the simulation runs, the UI can:

- **Color nodes**: green (utilization < 60%), yellow (60–85%), orange (85–95%), red (> 95% or FAILED).
- **Animate edges**: thickness proportional to throughput, color by latency (green → red gradient).
- **Show queue bars**: small bar chart inside each node showing queue fullness.
- **Failure indicators**: skull icon or red flash on failed nodes.
- **Live counters**: overlay RPS, P99, error rate on each node.

### 8.4 — Topology Validation

Before running the simulation, validate the topology:

| Check | Rule |
|-------|------|
| Has source | At least one node with `type` that generates traffic |
| Connected graph | All nodes reachable from at least one source |
| No orphan edges | Every edge references existing source and target node IDs |
| No cycles without queue | If a cycle exists, at least one node in the cycle must have a queue (prevents infinite loops) |
| Resource sanity | `workers > 0`, `capacity >= 0`, `timeout > 0` |
| Distribution validity | All distribution params are valid (e.g., sigma > 0 for log-normal) |

---

## Phase 9 — Advanced Features

**Goal**: Polish and extend for power users. These are optional and can be prioritized based on user demand.

### 9.1 — Autoscaling Simulation

When enabled on a node:
- Monitor the scaling metric (queue depth, CPU, custom).
- If `metric > scaleUpThreshold` for `cooldown` period → add replica (increment `workers`), apply `coldStartPenalty` delay.
- If `metric < scaleDownThreshold` for `cooldown` period → remove replica.
- Track scaling events in the time series.

### 9.2 — Invariant Checking

Run after the simulation to detect logical bugs in the architecture:

- **Idempotency**: If the same request is processed twice (due to retries), does it produce duplicate side effects?
- **Causal ordering**: Are events processed in causal order? (A must happen before B if B depends on A's output.)
- **Consistency**: After a write to the primary, how long before all replicas converge?
- **SLO compliance**: What percentage of time windows met the SLO targets?

### 9.3 — Design Comparator

Run two simulations with different topologies (e.g., 3 replicas vs. 5 replicas) and produce a diff:

```jsonc
{
  "comparison": {
    "latencyP99": { "designA": 890, "designB": 320, "improvement": "64%" },
    "throughput":  { "designA": 946, "designB": 1420, "improvement": "50%" },
    "cost":        { "designA": 12.5, "designB": 18.0, "increase": "44%" }
  }
}
```

### 9.4 — Cost Calculator

Map each node to its cloud provider equivalent and estimate hourly cost:

```
costPerHour = sum(node.resources.cpu * cpuPricePerHour + node.resources.memory * memPricePerHour)
             * node.resources.replicas
```

Use provider mapping from the catalogue (AWS/GCP/Azure pricing tiers).

### 9.5 — Anti-Pattern Detection

Scan the topology for known anti-patterns:

| Anti-Pattern | Detection Rule |
|-------------|---------------|
| Monolithic shared DB | Multiple services with edges to the same DB node |
| Sync RPC for long ops | Synchronous edge to a node with `processing.distribution` > 5s |
| Unlimited retries | `retry.maxAttempts` > 10 or missing |
| Infinite TTL cache | Cache node with no TTL configured |
| Over-sharding | More shard nodes than the throughput justifies |

### 9.6 — Replay Engine

Given a seed string, replay the exact same simulation:
- Same PRNG sequence → same arrivals, same service times, same failures.
- Useful for debugging: "why did my system fail at t=42s?" → replay and add logging.

---

## Dependency Graph

Build phases in this order. Arrows indicate "depends on".

```
Phase 0 (JSON Format)
    │
    ▼
Phase 1 (Primitives) ─── BigInt Time, PRNG, Distributions, MinHeap, Events
    │
    ▼
Phase 2 (Engine) ──────── GGcKNode, WorkloadGen, Routing, Event Loop
    │
    ├──────────────────────────────┐
    ▼                              ▼
Phase 3 (Network)          Phase 5 (Resilience)
    │                              │
    ▼                              │
Phase 4 (Failures) ◄──────────────┘
    │
    ▼
Phase 6 (Metrics & Output)
    │
    ▼
Phase 7 (Scenarios & Chaos)
    │
    ▼
Phase 8 (UI Integration)
    │
    ▼
Phase 9 (Advanced — optional, parallel tracks)
```

**Critical path**: Phase 0 → 1 → 2 → 6 → 8 (minimum viable simulation).

**Parallel tracks after Phase 2**: Phases 3, 4, 5 can be developed in parallel once the engine loop exists.

---

## Suggested File Structure

```
src/
├── engine/
│   ├── types.ts                    # Event types, ComponentNode, EdgeDefinition, etc.
│   ├── time.ts                     # BigInt time utilities
│   ├── prng.ts                     # SFC32, xmur3, createRandom
│   ├── distributions.ts           # Distribution sampler
│   ├── min-heap.ts                # Priority queue
│   ├── node.ts                    # GGcKNode class
│   ├── edge.ts                    # NetworkEdge class
│   ├── workload.ts                # WorkloadGenerator
│   ├── routing.ts                 # Routing table
│   ├── engine.ts                  # SimulationEngine (main event loop)
│   ├── failure-injector.ts        # Fault injection
│   ├── failure-propagation.ts     # Cascade propagation engine
│   ├── circuit-breaker.ts         # Circuit breaker state machine
│   ├── retry.ts                   # Retry policy
│   ├── rate-limiter.ts            # Token bucket
│   ├── bulkhead.ts                # Concurrency isolation
│   ├── load-shedder.ts            # Load shedding strategies
│   ├── timeout.ts                 # Deadline propagation
│   ├── metrics.ts                 # MetricsCollector
│   ├── tracer.ts                  # Request tracing / waterfall
│   ├── invariants.ts              # Invariant checker
│   └── validator.ts               # Topology JSON validator
│
├── scenarios/
│   ├── cache-stampede.ts
│   ├── db-failover.ts
│   ├── network-partition.ts
│   ├── auth-outage.ts
│   ├── traffic-spike.ts
│   ├── chaos-runner.ts            # ChaosExperiment class
│   └── scenario-composer.ts
│
├── analysis/
│   ├── output.ts                  # SimulationOutput aggregation
│   ├── causal-graph.ts            # Failure causal graph builder
│   ├── comparator.ts              # Design comparator
│   ├── cost-calculator.ts         # Cloud cost estimation
│   └── anti-pattern-detector.ts   # Static topology analysis
│
├── worker/
│   ├── simulation.worker.ts       # Web Worker entry point
│   └── protocol.ts                # UI ↔ Worker message types
│
└── ui/                            # (already exists — React Flow canvas)
    ├── hooks/
    │   ├── useSimulation.ts       # Hook: serialize topology, send to worker, receive results
    │   └── useLiveVisualization.ts # Hook: color nodes/edges from time-series snapshots
    └── components/
        ├── SimulationControls.tsx  # Run / Pause / Stop / Step buttons
        ├── MetricsDashboard.tsx    # Summary stats, charts
        ├── WaterfallView.tsx       # Request trace waterfall
        ├── CausalGraphView.tsx     # Failure propagation visualization
        └── NodeConfigPanel.tsx     # Right-panel to configure node params
```

---

## Summary of Deliverables by Phase

| Phase | Deliverable | Depends On | Est. Complexity |
|-------|-------------|------------|-----------------|
| 0 | Topology JSON format (schema + validator) | — | Low |
| 1 | Time, PRNG, Distributions, MinHeap, Event types | — | Low |
| 2 | GGcKNode, WorkloadGen, Routing, Event Loop | Phase 1 | High |
| 3 | NetworkEdge, latency model, congestion, packet loss | Phase 2 | Medium |
| 4 | FailureInjector, FailurePropagation, cascade patterns | Phase 2, 3 | High |
| 5 | CircuitBreaker, Retry, RateLimiter, Bulkhead, LoadShedder, Timeout | Phase 2 | Medium |
| 6 | MetricsCollector, Tracer, TimeSeries, CausalGraph, Output | Phase 2 | Medium |
| 7 | 7 scenario presets, ChaosExperiment, ScenarioComposer | Phase 4, 5, 6 | Medium |
| 8 | Web Worker, message protocol, live visualization, validation | Phase 6 | Medium |
| 9 | Autoscaling, Invariants, Comparator, Cost, Anti-patterns, Replay | Phase 6 | Low each |

**Minimum viable simulation** (Phases 0 + 1 + 2 + 6 + 8) gets you: a working engine that takes a topology from the React Flow canvas, runs a simulation in a web worker, and displays latency percentiles, throughput, error rates, and per-node utilization back on the canvas.
