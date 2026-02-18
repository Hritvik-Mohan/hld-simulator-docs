# HLD Simulator — How It Works

> This document explains how the simulation engine works, how it is represented in the UI and CLI, and maps every feature to its implementation ticket. It is the single source of truth for understanding the system end-to-end.

---

## Table of Contents

1. [How the Simulation Works (Plain English)](#1-how-the-simulation-works)
2. [The Three Phases a User Experiences](#2-the-three-phases-a-user-experiences)
3. [UI Representation](#3-ui-representation)
4. [CLI Representation](#4-cli-representation)
5. [Component Inventory](#5-component-inventory)
6. [Feature-to-Ticket Map](#6-feature-to-ticket-map)
7. [Design Foundations](#7-design-foundations)

---

## 1. How the Simulation Works

### The One-Paragraph Version

You draw a system (nodes and edges) on a canvas. You press Run. The engine generates fake traffic (HTTP requests), sends each request through your system node-by-node, makes each node "work" on the request for a realistic amount of time, and records what happens. After thousands of requests, it tells you: how fast was your system (latency), how many requests it handled (throughput), and where it broke (errors, queue overflow, cascading failures). Same seed = same results every time.

### The Mechanical Version

The simulation is a **loop that processes events in time order**. There are no real servers, no real network calls, no real clocks. Everything is numbers in a priority queue.

Here is what happens step by step:

```
Step 1: SETUP
   Read the topology JSON (your drawn diagram, serialized).
   For each node → create a G/G/c/K queue model
       (c workers that can process requests simultaneously,
        K slots in the waiting queue, service time sampled
        from a probability distribution like log-normal).
   For each edge → create a network model
       (latency sampled from a distribution, packet loss probability).
   Create a workload generator that will produce fake requests.
   Seed the random number generator (same seed = same output).

Step 2: PRIME
   The workload generator schedules the first event:
       { time: 0, type: REQUEST_GENERATED }
   This goes into the event queue (a min-heap sorted by time).

Step 3: LOOP (the core — repeats millions of times)
   Pull the earliest event from the queue.
   Jump the clock to that event's time.
   Handle the event:

   ┌─────────────────────────────────────────────────────────┐
   │ REQUEST_GENERATED                                       │
   │   Create a request object (id, type, size, timestamp).  │
   │   Look up the first edge from the source node.          │
   │   Sample edge latency (e.g., 1.2ms from log-normal).   │
   │   Schedule: REQUEST_ARRIVAL at target node              │
   │             at time = now + 1.2ms.                      │
   │   Schedule: next REQUEST_GENERATED                      │
   │             at time = now + inter-arrival gap.           │
   └─────────────────────────────────────────────────────────┘
   ┌─────────────────────────────────────────────────────────┐
   │ REQUEST_ARRIVAL (at a node)                             │
   │   Is a worker free? → Start processing.                 │
   │     Sample service time (e.g., 12ms from log-normal).   │
   │     Schedule: PROCESSING_COMPLETE at now + 12ms.        │
   │   No free worker, queue has room? → Enqueue. Wait.      │
   │   No free worker, queue full? → REJECT. Record error.   │
   └─────────────────────────────────────────────────────────┘
   ┌─────────────────────────────────────────────────────────┐
   │ PROCESSING_COMPLETE (at a node)                         │
   │   Free the worker. If queue has waiting requests,       │
   │   start the next one immediately.                       │
   │   Look up outgoing edges:                               │
   │     Has downstream node? → Schedule REQUEST_ARRIVAL     │
   │       at next node (after edge latency).                │
   │     No downstream? → This is the end of the line.       │
   │       Schedule REQUEST_COMPLETE.                        │
   └─────────────────────────────────────────────────────────┘
   ┌─────────────────────────────────────────────────────────┐
   │ REQUEST_COMPLETE                                        │
   │   total_latency = now - request.createdAt               │
   │   Record: latency, path taken, per-node times.          │
   └─────────────────────────────────────────────────────────┘

   Repeat until clock exceeds simulation duration.

Step 4: RESULTS
   Sort all recorded latencies → compute P50, P90, P95, P99.
   Count successes, failures, rejections → compute throughput, error rate.
   Per-node: utilization, queue depth, service time averages.
   Verify Little's Law (L = λW) as a sanity check.
   Package everything into a SimulationOutput JSON → return to UI.
```

### What Makes a Request "Slow" or "Fail" in the Simulation

Nothing is hardcoded. These emerge naturally from the queue math:

| Symptom | Cause in the engine |
|---------|-------------------|
| High P99 latency | A node's queue builds up → requests wait before being processed. Queuing delay = most of the latency. |
| Errors / rejections | A node's queue is full (K reached). New arrivals are rejected with a 503-equivalent. |
| Cascading failure | Node A is slow → node B (upstream) waits for A, B's queue fills → B starts rejecting → C (upstream of B) is now also failing. |
| Timeout | Request's deadline expires while it's still waiting in a queue or for a response. |

### Key Insight for Understanding the UI

The simulation has exactly **two kinds of data** that the UI needs to show:

1. **Time-series snapshots** (streamed DURING the simulation, once per sim-second):
   - Per-node: queue length, active workers, utilization, RPS, error rate, status
   - Per-edge: throughput, latency, load
   - These drive **live canvas coloring** — nodes turning yellow/red as they saturate

2. **Final output** (returned AFTER the simulation completes):
   - Summary: total requests, latency percentiles, throughput, error rate
   - Per-node metrics
   - Sampled request traces (waterfall views)
   - Causal failure graph (if failures occurred)
   - SLO breaches, Little's Law check
   - These drive the **results dashboard, trace viewer, and failure analysis**

---

## 2. The Three Phases a User Experiences

Every interaction follows this flow:

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  1. BUILD    │────►│  2. SIMULATE     │────►│  3. ANALYSE       │
│              │     │                  │     │                   │
│ Draw nodes   │     │ Engine runs in   │     │ Read results:     │
│ Draw edges   │     │ a Web Worker     │     │ latency, errors,  │
│ Configure    │     │                  │     │ bottlenecks,      │
│ params       │     │ Canvas updates   │     │ traces, costs     │
│              │     │ live (colors,    │     │                   │
│ Select       │     │ queue bars)      │     │ Compare designs   │
│ workload     │     │                  │     │ Run chaos tests   │
│              │     │ Progress bar     │     │                   │
└──────────────┘     └──────────────────┘     └───────────────────┘
    Canvas +              Canvas +                Dashboard +
    Inspector             Controls                Trace viewer
```

### Phase 1: BUILD — what the user does

| Action | What happens internally |
|--------|----------------------|
| Drag a node onto the canvas | A React Flow node is created with a `type` (e.g., "api-gateway") and default queue/processing params |
| Draw an edge between nodes | A React Flow edge is created with default latency, bandwidth, protocol |
| Click a node → Inspector opens | Right panel shows the node's configurable params: workers, queue capacity, service time distribution, timeout, SLO targets, resilience settings |
| Click an edge → Inspector opens | Right panel shows: latency distribution, path type, bandwidth, packet loss rate, protocol |
| Configure workload | Top bar: choose traffic pattern (constant / Poisson / spike / diurnal), set base RPS, set request mix |
| Configure faults | Failure panel: pick a node, choose fault type (crash / latency spike / error rate), set timing (at 15s / random / when CPU > 90%) |

**What exists today**: Nodes and edges on the React Flow canvas.
**What needs to be built**: Topology state store, inspector panel, JSON topology viewer, workload config, fault config, topology serializer, import/export controls.

### Phase 2: SIMULATE — what the user sees

| Moment | What the user sees | What's happening |
|--------|-------------------|------------------|
| Press "Run" | Button changes to "Running...", progress bar appears | Topology JSON is serialized from canvas, sent to Web Worker, engine initializes |
| During simulation | Nodes change color (green → yellow → red), edge thickness pulses, queue bars fill inside nodes | Worker streams `SNAPSHOT` messages every sim-second, `useLiveVisualization` hook maps utilization to colors |
| A node fails | Node flashes red, skull/warning icon appears | Failure injector activated the fault, node status = FAILED, all arrivals rejected |
| Cascade happens | Upstream nodes turn yellow then red one by one | Failure propagation engine walks the dependency graph, affected nodes degrade |
| Simulation ends | Progress bar completes, "Results" tab appears | Worker sends `COMPLETE` message with full `SimulationOutput` JSON |

**What exists today**: Nothing — no simulation controls, no live visualization.
**What needs to be built**: Web Worker (with playback speed throttling), useSimulation hook (with `setPlaybackSpeed`), useLiveVisualization hook, SimulationControls component (with speed selector).

### Phase 3: ANALYSE — what the user reads

| View | What it shows | Data source |
|------|-------------|-------------|
| Summary cards | P50/P90/P95/P99 latency, throughput, error rate, total requests | `output.summary` |
| Per-node table | Each node's utilization, queue depth, service time, rejection count | `output.perNode` |
| Latency chart | Latency vs time (line chart) — shows when latency spiked | `output.timeSeries[].global.avgLatency` |
| Queue depth chart | Queue depth per node over time | `output.timeSeries[].nodes[id].queueLength` |
| Request waterfall | One sampled request's journey: arrival → queue wait → service → edge → next node (like Chrome DevTools) | `output.traces[]` |
| Causal failure graph | Tree showing: DB crashed → API timed out → Gateway rejected → Users saw 503 | `output.causalGraph` |
| SLO breaches | Table of nodes that violated their P99 or availability targets | `output.sloBreaches[]` |
| Cost estimate | Per-node and total hourly/monthly cloud cost | Computed from `node.resources` + provider pricing |
| Anti-pattern warnings | "Your DB is a single point of failure" / "Sync RPC for a 10s operation" | Static analysis of topology, no simulation needed |

**What exists today**: Nothing.
**What needs to be built**: MetricsDashboard, WaterfallView, CausalGraphView, cost and anti-pattern analysis.

---

## 3. UI Representation

### 3.1 Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Scenario Bar  [Workload: Poisson ▾] [RPS: 1000] [Seed: abc]           │
│  ── [▶ Run] [⏸ Pause] [⏹ Stop] [⏩ Step]  Speed: [1×][5×][10×][Max]   │
│  ── [↓ Download] [↑ Upload] [Copy] [Paste]  ✓ Valid                     │
├────────┬──────────────────────────────────────┬─────────────────────────┤
│        │                                      │  [Inspector] [{ } JSON] │
│  Node  │              CANVAS                  │                         │
│  Palette│         (React Flow)                │  ← right panel shows    │
│        │                                      │    EITHER inspector     │
│ ┌────┐ │    ┌──────┐       ┌──────┐          │    OR JSON viewer       │
│ │ API│ │    │Users │──────►│ GW   │──────┐   │    (toggled by tabs)    │
│ └────┘ │    └──────┘       └──────┘      │   │                         │
│ ┌────┐ │                            ┌────▼─┐ │  Node:    api-gw        │
│ │ DB │ │                            │ API  │ │  Workers: [100]         │
│ └────┘ │                            └──┬───┘ │  Capacity:[500]         │
│ ┌────┐ │                          ┌───▼──┐  │  Timeout: [5000ms]      │
│ │Cache│ │                          │  DB  │  │                         │
│ └────┘ │                          └──────┘  │                         │
│        │                                      │                         │
├────────┴──────────────────────────────────────┴─────────────────────────┤
│  Results Tray (collapsed until simulation completes)                    │
│  [Summary] [Per-Node] [Traces] [Failures] [Cost]                       │
└─────────────────────────────────────────────────────────────────────────┘
```

There is one screen with five zones:

| Zone | Purpose | Exists today? |
|------|---------|---------------|
| **Scenario Bar** (top) | Configure workload, faults, seed. Run/Pause/Stop/Speed controls. Import/Export buttons. Validation badge. | No |
| **Node Palette** (left) | Draggable node types organized by category. | Partial (nodes exist, palette TBD) |
| **Canvas** (center) | React Flow graph. During simulation, nodes/edges animate. | Yes (nodes + edges) |
| **Right Panel** (right) | Tabbed: **Inspector** (form fields for selected node/edge) OR **JSON Viewer** (tree view of full topology). | No |
| **Results Tray** (bottom) | Tabbed panel that slides up after simulation completes. | No |

### 3.2 Canvas — During Each Phase

#### BUILD phase (before simulation)

The canvas is a static graph editor. Nodes are draggable, edges are connectable.

```
  ┌──────────┐          ┌──────────┐          ┌──────────┐
  │  Users   │─────────►│ Gateway  │─────────►│   API    │
  │  source  │  https   │  lb-l7   │  grpc    │  micro   │
  │          │  1ms     │          │  0.5ms   │  service │
  └──────────┘          └──────────┘          └─────┬────┘
                                                     │
                                               ┌─────▼────┐
                                               │    DB    │
                                               │ postgres │
                                               │          │
                                               └──────────┘
```

Each node shows:
- Label (user-defined name)
- Type badge (e.g., "lb-l7", "postgres")
- No metrics yet — system is idle

Each edge shows:
- Protocol label
- Latency hint (if configured)

#### SIMULATE phase (engine running)

The same canvas, but nodes and edges now reflect live state from snapshots:

```
  ┌──────────┐          ┌──────────┐          ┌──────────┐
  │  Users   │─────────►│ Gateway  │════════►│   API    │
  │  source  │  1.1ms   │  lb-l7   │  2.3ms  │  micro   │
  │ 980 rps  │          │ ██░░░ 40%│         │ ████▓ 85%│
  └──────────┘          └──────────┘          └─────┬────┘
                                                     │
                                               ┌─────▼────┐
                                               │ ██████ DB │
                                               │ ████████ │
                                               │  97% !!  │
                                               └──────────┘
```

Live node decorations:

| Visual | Meaning | Source |
|--------|---------|--------|
| Background color shifts: green → yellow → orange → red | Utilization: <60% → 60-85% → 85-95% → >95% | `snapshot.nodes[id].utilization` |
| Queue bar inside node: `████░░` | Queue fullness: filled / capacity | `snapshot.nodes[id].queueLength / node.queue.capacity` |
| Overlay text: "980 rps" | Current throughput | `snapshot.nodes[id].rps` |
| Red flash + icon | Node FAILED | `snapshot.nodes[id].status === "failed"` |

Live edge decorations:

| Visual | Meaning | Source |
|--------|---------|--------|
| Stroke width changes | Throughput volume (thicker = more traffic) | `snapshot.edges[id].throughput` |
| Color shifts: green → red | Latency health (green = normal, red = high) | `snapshot.edges[id].latencyP50` vs expected |
| Animated dashes | Active traffic flow | `snapshot.edges[id].throughput > 0` |
| Label shows current latency | "2.3ms" | `snapshot.edges[id].latencyP50` |

#### ANALYSE phase (after simulation)

Canvas returns to static. Nodes retain a final-state color as a heatmap. The results tray expands from the bottom.

### 3.3 Inspector Panel — What the User Configures

When a node is selected, the right panel shows:

```
┌─ Inspector: Gateway ────────────────────────┐
│                                              │
│  IDENTITY                                    │
│  Type:     load-balancer-l7                  │
│  Label:    [Gateway              ]           │
│                                              │
│  RESOURCES                                   │
│  CPU:      [2    ] vCPU                      │
│  Memory:   [4096 ] MB                        │
│  Replicas: [3    ]                           │
│                                              │
│  QUEUE MODEL (G/G/c/K)                       │
│  Workers (c):   [100  ]                      │
│  Capacity (K):  [500  ]                      │
│  Discipline:    [FIFO        ▾]              │
│                                              │
│  PROCESSING                                  │
│  Distribution:  [Log-Normal  ▾]              │
│    mu:    [2.3  ]   (log-space mean)         │
│    sigma: [0.8  ]   (log-space std dev)      │
│    → median ≈ 10ms, P99 ≈ 150ms             │
│  Timeout:       [5000 ] ms                   │
│                                              │
│  RESILIENCE                                  │
│  ☐ Circuit Breaker                           │
│    Failure threshold: [0.5]                  │
│    Recovery timeout:  [30000] ms             │
│  ☐ Rate Limiter                              │
│    Max tokens: [1000]  Refill: [100]/sec     │
│  ☐ Retry Policy                              │
│    Max attempts: [3]  Base delay: [100] ms   │
│                                              │
│  SLO TARGETS                                 │
│  P99 Latency:    [500  ] ms                  │
│  Availability:   [99.9 ] %                   │
│                                              │
│  SCALING                                     │
│  ☐ Autoscaling enabled                       │
│    Metric:          [Queue depth ▾]          │
│    Scale up at:     [100]                    │
│    Scale down at:   [10 ]                    │
│    Max replicas:    [10 ]                    │
│                                              │
└──────────────────────────────────────────────┘
```

When an edge is selected:

```
┌─ Inspector: Gateway → API ──────────────────┐
│                                              │
│  CONNECTION                                  │
│  Mode:     [Synchronous   ▾]                 │
│  Protocol: [gRPC          ▾]                 │
│                                              │
│  LATENCY                                     │
│  Path type:     [Same DC     ▾]              │
│  Distribution:  [Log-Normal  ▾]              │
│    mu:    [0.0]   sigma: [0.4]               │
│    → median ≈ 1ms                            │
│                                              │
│  CAPACITY                                    │
│  Bandwidth:        [1000] Mbps               │
│  Max concurrent:   [10000]                   │
│                                              │
│  RELIABILITY                                 │
│  Packet loss:  [0.001]  (0.1%)               │
│  Error rate:   [0.000]                       │
│                                              │
│  ROUTING                                     │
│  Weight: [1.0]                               │
│                                              │
└──────────────────────────────────────────────┘
```

### 3.4 Results Tray — Tabs

After the simulation completes, the bottom tray expands with these tabs:

#### Tab: Summary

```
┌─ Summary ───────────────────────────────────────────────────────┐
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  P50     │  │  P95     │  │  P99     │  │ Through- │        │
│  │  45ms    │  │  210ms   │  │  890ms   │  │  put     │        │
│  │          │  │          │  │  ▲ BREACH │  │  947/s   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Error   │  │  Total   │  │  Reject  │  │  Avail-  │        │
│  │  Rate    │  │ Requests │  │  Count   │  │  ability │        │
│  │  2.07%   │  │  58,000  │  │  1,200   │  │  97.93%  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  Little's Law check:  ✓ All nodes within 10% tolerance          │
│  Seed: "my-seed" — reproducible: yes                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Tab: Per-Node

```
┌─ Per-Node Metrics ──────────────────────────────────────────────┐
│                                                                  │
│  Node       │ Util% │ Avg Queue │ RPS  │ Rejected │ P99     │  │
│  ───────────┼───────┼───────────┼──────┼──────────┼─────────│  │
│  Gateway    │  42%  │    3.2    │  980 │        0 │   12ms  │  │
│  API        │  85%  │   42.0    │  970 │       30 │  210ms  │  │
│  DB         │  97%  │  148.0    │  500 │    1,170 │  890ms  │  │ ← bottleneck
│                                                                  │
│  [Sort by utilization ▾]                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Tab: Traces (Waterfall)

Shows a sampled request's journey through the system, rendered as horizontal bars on a time axis:

```
┌─ Trace: req-0042  (total: 145ms, status: success) ─────────────┐
│                                                                  │
│  0ms        50ms       100ms       150ms                        │
│  ├──────────┼──────────┼───────────┤                            │
│                                                                  │
│  Gateway  ██████░░░░░░                           12ms           │
│           ▓▓████                                                │
│           2ms wait, 10ms service                                │
│                                                                  │
│  API         ░░░░░██████████████████████████     54ms           │
│                   ▓▓▓▓▓████████████████████                     │
│                   5ms wait, 49ms service                        │
│                                                                  │
│  DB                                    ░░░░░████████████  59ms  │
│                                        ▓▓▓▓▓▓▓▓████████        │
│                                        15ms wait, 44ms svc     │
│                                                                  │
│  ░ = queue wait    █ = processing    gaps = edge latency        │
│                                                                  │
│  [◀ Prev trace]  [Next trace ▶]  [Show P99 trace]              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Tab: Failures

Shows the causal graph when cascading failures occurred:

```
┌─ Failure Cascade ───────────────────────────────────────────────┐
│                                                                  │
│  Root cause: DB crashed at t=12.0s                              │
│                                                                  │
│  t=12.0s   DB ──────[crash]─────────────────────────── ✗ FAILED │
│               │                                                  │
│  t=12.5s     └──► API ──[timeout_cascade]────────── ⚠ DEGRADED │
│                     │                                            │
│  t=14.0s            └──► Gateway ──[queue_full]──── ⚠ DEGRADED │
│                           │                                      │
│  t=15.0s                  └──► Users ──[503 errors]── ✗ FAILED  │
│                                                                  │
│  Impact: 4 nodes affected, cascade depth: 3, duration: 3.0s    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Tab: Cost

```
┌─ Cost Estimate (AWS) ───────────────────────────────────────────┐
│                                                                  │
│  Node       │ Type         │ Replicas │ $/hour │ $/month        │
│  ───────────┼──────────────┼──────────┼────────┼────────        │
│  Gateway    │ ALB          │    3     │  0.08  │   55.48        │
│  API        │ ECS Fargate  │    3     │  0.25  │  182.50        │
│  DB         │ RDS Postgres │    1     │  0.83  │  605.90        │
│  ───────────┼──────────────┼──────────┼────────┼────────        │
│  TOTAL      │              │          │  1.16  │  843.88        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.5 Scenario Bar — What the User Configures Before Running

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Workload: [Poisson ▾]   Base RPS: [1000]   Duration: [60]s   Seed: abc123  │
│                                                                              │
│ Faults: [+ Add fault]  ┌──────────────────────────────────────┐             │
│                         │ ✗ DB crash at t=15s for 5s          │             │
│                         │ ✗ API latency 10x at t=30s for 3s   │             │
│                         └──────────────────────────────────────┘             │
│                                                                              │
│ Presets: [Cache Stampede ▾] [DB Failover ▾] [Traffic Spike ▾]               │
│                                                                              │
│                                                    [▶ Run Simulation]       │
│                                                                              │
│ Speed: [1×] [5×] [10×] [Max]  ← shown when running/paused                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.6 JSON Topology Viewer — Inspect and Edit the Full Structure

The right panel has two tabs: **Inspector** (form fields for one selected node/edge) and **JSON Viewer** (tree view of the entire topology). The JSON Viewer is like Chrome DevTools' object inspector — a structured, expandable tree that is both readable and editable.

```
┌─ { } Topology Viewer ─────────────────────────────────────┐
│  🔍 [Search topology...]                                    │
│                                                              │
│  ▾ nodes                                        [4 nodes]    │
│    ▾ gateway                                                 │
│        id: "gateway"                                         │
│        type: "load-balancer-l7"                              │
│        ▸ queue: { workers: 100, capacity: 500, … }          │
│        ▸ processing: { distribution: "log-normal", … }      │
│        ▸ resilience: { circuitBreaker: { … } }              │
│        ▸ slo: { latencyP99: 500, availability: 99.9 }       │
│    ▸ api                                                     │
│    ▸ cache                                                   │
│    ▸ db                                                      │
│                                                              │
│  ▾ edges                                        [3 edges]    │
│    ▾ gateway → api                                           │
│        source: "gateway"  target: "api"                      │
│        mode: "synchronous"  protocol: "grpc"                 │
│        ▸ latency: { distribution: "log-normal", … }         │
│    ▸ api → cache                                             │
│    ▸ api → db                                                │
│                                                              │
│  ▾ workload                                                  │
│        pattern: "poisson"                                    │
│        baseRps: [1000]  ← click to edit inline               │
│        duration: 60000                                       │
│                                                              │
│  ▾ faults                                       [2 faults]   │
│    ▸ 0: DB crash at t=15000ms                                │
│    ▸ 1: API latency spike at t=30000ms                       │
│                                                              │
│  ▸ globalConfig                                              │
│                                                              │
│ ──────────────────────────────────────────────────────────── │
│  ⚠ Node "db" has 1 replica and is a critical dependency     │
│  ⚠ No timeout configured on node "cache"                    │
└──────────────────────────────────────────────────────────────┘
```

**This is NOT a raw text editor.** Users don't type JSON. It is a structured tree where:
- Sections expand/collapse (nodes, edges, workload, faults, globalConfig)
- Leaf values are editable inline (click a value → input appears → Enter to save)
- Enum fields show dropdowns (distribution type, protocol, mode)
- Number fields validate numeric input
- Clicking a node/edge name selects it on the canvas and opens the inspector tab
- Search filters the tree to matching paths (e.g., typing "workers" shows all nodes' worker counts)
- Validation warnings from the validator (T-003) appear at the bottom

**Why this matters**: The inspector shows one node at a time. The canvas shows connections but no config details. The JSON viewer shows **everything** — all nodes, all edges, all config, all at once. Users can scan the entire topology, spot misconfigured values, and verify that the structure is correct before running a simulation.

#### Two-Way Sync Architecture

All three editing surfaces (canvas, inspector, JSON viewer) read from and write to a single **Topology State Store** (T-043):

```
                    ┌──────────────────────┐
                    │   useTopologyStore    │
                    │   (Zustand store)     │
                    │                      │
                    │   nodes: Map<id, ComponentNode>
                    │   edges: Map<id, EdgeDefinition>
                    │   workload: WorkloadProfile
                    │   faults: FaultSpec[]
                    │   globalConfig: GlobalConfig
                    │   validationResult: auto-computed
                    └──────┬───────────────┘
                           │
              reads/writes │ reads/writes
         ┌─────────────────┼──────────────────┐
         │                 │                  │
         ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌───────────────┐
│ React Flow   │  │ Inspector    │  │ JSON Topology  │
│ Canvas       │  │ Panel        │  │ Viewer         │
│              │  │              │  │                │
│ Visual drag  │  │ Form fields  │  │ Tree view      │
│ & connect    │  │ for 1 node   │  │ inline edit    │
└──────────────┘  └──────────────┘  └───────────────┘

     All three are VIEWS of the same state.
     Any of them can WRITE to it.
     Changes in one instantly appear in the others.
```

There is no "sync" problem because there is nothing to sync — they all read and write the same store. Edit workers in the inspector → the JSON viewer updates. Edit workers in the JSON viewer → the inspector updates. Drag a node on the canvas → the JSON viewer's position updates.

#### Import / Export

The import/export controls sit in the scenario bar (always visible):

| Button | Action |
|--------|--------|
| **Download JSON** | Serializes topology store to a `.json` file |
| **Upload JSON** | Opens file picker, validates, loads into store + canvas |
| **Copy JSON** | Copies topology JSON to clipboard |
| **Paste JSON** | Reads clipboard, validates, loads into store + canvas |

When importing, if the JSON has node positions, they are used. If not (e.g., hand-written JSON), an auto-layout algorithm (dagre) positions the nodes automatically.

A **confirmation dialog** appears before replacing an existing topology: "This will replace your current topology. Continue?"

The **validation badge** (✓ Valid / ✗ 3 errors / ⚠ 2 warnings) is always visible in the scenario bar and updates in real-time as the topology changes.

### 3.7 Execution Modes and Playback Speed

The simulation engine always runs as fast as possible — it is event-driven and jumps from one event to the next with no wall-clock synchronization. **Playback speed** controls the presentation layer: how quickly the worker emits snapshots to the UI.

| Mode | Speed value | Behavior |
|------|-------------|----------|
| **Batch** (default) | `0` | Engine runs at full speed. Snapshots are emitted as fast as possible. Best for getting results quickly — the UI shows a progress bar but no live node animation. |
| **Real-time** | `1` | Snapshots are throttled so 1 simulated second ≈ 1 wall-clock second. Nodes animate at a watchable pace. |
| **5× accelerated** | `5` | 1 simulated second ≈ 200ms wall-clock. Faster but still watchable. |
| **10× accelerated** | `10` | 1 simulated second ≈ 100ms wall-clock. Quick overview of the simulation's progression. |

**How it works internally**: The worker inserts a `setTimeout(snapshotInterval / playbackSpeed)` delay between snapshot emissions when `playbackSpeed > 0`. At `playbackSpeed = 0` (batch), no delay is inserted and snapshots are posted immediately.

**User interaction**:
- Speed defaults to **Max** (batch) — users who just want results don't need to wait.
- Speed can be changed mid-run without restarting the simulation — clicking a different speed button sends a `SET_SPEED` command to the worker.
- The speed selector is a segmented button group: `[1×] [5×] [10×] [Max]`. The active speed is highlighted.
- The speed selector only appears when the simulation is running or paused.

**Additional execution controls** (already defined):

| Control | Description |
|---------|-------------|
| **Pause** | Halts the engine loop. No new events are processed. |
| **Resume** | Continues from where the engine paused. |
| **Step** | Advances the engine by N events (default 100), then pauses. Useful for debugging. |
| **Stop** | Terminates the simulation and returns partial results. |

### 3.8 Feature Summary: What the User Can Do

| Feature | Phase | Where in UI | Engine function | Ticket |
|---------|-------|-------------|-----------------|--------|
| Place nodes on canvas | BUILD | Canvas | — (UI only, React Flow) | existing |
| Connect nodes with edges | BUILD | Canvas | — (UI only, React Flow) | existing |
| Configure node params | BUILD | Inspector Panel | Writes to `ComponentNode` JSON | T-033 |
| Configure edge params | BUILD | Inspector Panel | Writes to `EdgeDefinition` JSON | T-033 |
| Choose workload pattern | BUILD | Scenario Bar | Sets `WorkloadProfile` | T-034 |
| Add fault injections | BUILD | Scenario Bar | Appends to `FaultSpec[]` | T-034 |
| Run simulation | SIMULATE | Scenario Bar | `useSimulation.run()` → Web Worker | T-025, T-026, T-034 |
| See live node colors | SIMULATE | Canvas | `useLiveVisualization()` from snapshots | T-027 |
| Pause/Resume/Stop | SIMULATE | Scenario Bar | `useSimulation.pause/resume/stop()` | T-026, T-034 |
| Step through events | SIMULATE | Scenario Bar | `useSimulation.step(n)` | T-026, T-034 |
| Change playback speed | SIMULATE | Scenario Bar | `useSimulation.setPlaybackSpeed(n)` | T-025, T-026, T-034 |
| View latency percentiles | ANALYSE | Results → Summary | `output.summary.latency` | T-017, T-020, T-035 |
| View per-node metrics | ANALYSE | Results → Per-Node | `output.perNode` | T-017, T-020, T-035 |
| View request waterfall | ANALYSE | Results → Traces | `output.traces[]` | T-018, T-036 |
| View failure cascade | ANALYSE | Results → Failures | `output.causalGraph` | T-021, T-037 |
| View cost estimate | ANALYSE | Results → Cost | `calculateCost(topology)` | T-031, T-038 |
| View anti-pattern warnings | ANALYSE | Results / Inspector | `detectAntiPatterns(topology)` | T-030, T-038 |
| Compare two designs | ANALYSE | Comparison view | `compareDesigns(a, b)` | T-032 |
| Run preset scenario | SIMULATE | Scenario Bar → Presets | `createCacheStampedeScenario()` etc. | T-023, T-034 |
| Drag node from palette | BUILD | Node Palette | Creates `ComponentNode` on canvas | T-039 |
| View full topology as tree | BUILD | JSON Viewer | Reads `useTopologyStore` | T-044 |
| Edit topology via tree view | BUILD | JSON Viewer | Writes to `useTopologyStore` | T-044 |
| Download topology JSON | BUILD | Scenario Bar | `store.exportTopology()` → file | T-046 |
| Upload topology JSON | BUILD | Scenario Bar | file → `importFromFile()` → store | T-045, T-046 |
| Copy/paste topology JSON | BUILD | Scenario Bar | clipboard ↔ `store.exportTopology()` | T-045, T-046 |
| See live validation status | BUILD | Scenario Bar / JSON Viewer | `store.validationResult` (auto-computed) | T-043 |
| Export/share results | ANALYSE | Results → Export | Serialize `SimulationOutput` to JSON | — |

---

## 4. CLI Representation

The simulation engine is pure TypeScript with no DOM dependencies. It can run in Node.js for a terminal-based workflow.

### 4.1 How the Simulation Shows in the Terminal

#### Running a simulation

```bash
$ dsds run topology.json --seed "abc123" --duration 60000

  HLD Simulator v1.0.0
  Topology: My E-Commerce System (4 nodes, 3 edges)
  Seed: abc123 | Duration: 60s | Workload: poisson @ 1000 rps

  Simulating... ████████████████████░░░░░░░░░░  68%  (412,000 events)
```

#### Final output

```
  ═══════════════════════════════════════════════════════
   SIMULATION COMPLETE
  ═══════════════════════════════════════════════════════

   Requests:  58,000 total  |  56,800 success  |  1,200 failed
   Duration:  60.0s         |  Throughput: 947 req/s

   Latency
   ───────
   P50:    45ms
   P90:   120ms
   P95:   210ms
   P99:   890ms  ▲ EXCEEDS SLO (target: 500ms)

   Error Rate:   2.07%
   Availability: 97.93%

  ─────────────────────────────────────────────────────
   PER-NODE BREAKDOWN
  ─────────────────────────────────────────────────────

   Node         Util%   Avg Queue   RPS    Rejected   P99
   ──────────   ─────   ─────────   ────   ────────   ─────
   Gateway       42%        3.2     980          0    12ms
   API           85%       42.0     970         30   210ms
   DB            97%      148.0     500      1,170   890ms  ← bottleneck

  ─────────────────────────────────────────────────────
   CHECKS
  ─────────────────────────────────────────────────────

   Little's Law:  ✓ All nodes within 10% tolerance
   SLO Breaches:  1 — DB P99 (890ms) exceeds target (500ms)
   Seed: abc123   Reproducible: yes
```

### 4.2 Textual Topology Visualization

Show the system as a text graph:

```bash
$ dsds show topology.json

   ┌──────────┐       ┌──────────┐       ┌──────────┐
   │  Users   │──────►│ Gateway  │──────►│   API    │
   │  source  │ https │  lb-l7   │ grpc  │  micro   │
   │          │ ~1ms  │ 100w/500q│ ~1ms  │ 20w/200q │
   └──────────┘       └──────────┘       └────┬─────┘
                                               │ tcp
                                               │ ~2ms
                                          ┌────▼─────┐
                                          │    DB    │
                                          │ postgres │
                                          │ 50w/100q │
                                          └──────────┘

   Nodes: 4   Edges: 3   Source: Users   Sinks: none (DB is terminal)
```

Show node details:

```bash
$ dsds inspect topology.json --node "db"

   Node: DB
   Type: relational-db (storage)
   ─────────────────────────────
   Workers:      50
   Queue:        100 (FIFO)
   Service time: log-normal(mu=3.0, sigma=0.6) → median ~20ms, P99 ~300ms
   Timeout:      5000ms
   Replicas:     1
   ─────────────────────────────
   Dependencies: none
   Dependents:   API (critical)
   ─────────────────────────────
   SLO:          P99 < 500ms, availability > 99.9%
   Scaling:      disabled
   Resilience:   none configured
   ─────────────────────────────
   ⚠ Warning: Single point of failure (1 replica, 1 critical dependent)
```

### 4.3 Live Simulation Progress (optional rich mode)

For terminals that support ANSI, show a live-updating view:

```bash
$ dsds run topology.json --live

   t=15.2s  ████████████████░░░░░░░░░░  25%

   Node         Status    Util%   Queue    RPS    Errors
   ──────────   ───────   ─────   ─────   ────   ──────
   Gateway      ● OK       42%    3/500    980    0.0%
   API          ◐ WARM     85%   42/200    970    0.3%
   DB           ◉ HOT      97%  148/100    500    2.1%  ← bottleneck

   Edges        Latency   Throughput
   ──────────   ───────   ──────────
   GW → API      2.3ms       970/s
   API → DB      4.1ms       500/s

   [Press q to stop, p to pause]
```

Status indicators: `●` OK (<60%), `◐` WARM (60-85%), `◉` HOT (85-95%), `✗` FAIL (>95% or failed)

### 4.4 CLI Commands

| Command | Purpose |
|---------|---------|
| `dsds run <file>` | Run simulation, print results |
| `dsds run <file> --live` | Run with live-updating terminal display |
| `dsds run <file> --json` | Output raw `SimulationOutput` as JSON (for piping) |
| `dsds run <file> --seed <s>` | Override the seed |
| `dsds run <file> --duration <ms>` | Override duration |
| `dsds show <file>` | Print the topology as a text graph |
| `dsds inspect <file> --node <id>` | Show detailed config for one node |
| `dsds inspect <file> --edge <id>` | Show detailed config for one edge |
| `dsds validate <file>` | Validate the topology JSON, print errors/warnings |
| `dsds compare <a.json> <b.json>` | Run both, print side-by-side comparison |
| `dsds cost <file> --provider aws` | Estimate cloud cost without running simulation |
| `dsds lint <file>` | Detect anti-patterns in the topology |
| `dsds chaos <file> --scenario cache-stampede` | Run a preset chaos experiment |
| `dsds replay <file> --seed <s>` | Replay a previous simulation with the same seed |
| `dsds export <file> --format svg` | Export topology as SVG (stretch goal) |

### 4.5 JSON Output (for Piping)

```bash
$ dsds run topology.json --json | jq '.summary.latency'
{
  "p50": 45,
  "p90": 120,
  "p95": 210,
  "p99": 890
}

$ dsds run topology.json --json | jq '.perNode | to_entries[] | select(.value.utilization > 0.9) | .key'
"db"
```

---

## 5. Component Inventory

Every UI component, what it does, what data it consumes, and what ticket builds it.

### 5.1 BUILD Phase Components

| Component | File | Role | Data In | Data Out | Ticket |
|-----------|------|------|---------|----------|--------|
| **TopologyCanvas** | existing | React Flow graph editor | user interaction | `rfNodes[]`, `rfEdges[]` | existing |
| **NodePalette** | `NodePalette.tsx` | Draggable list of node types by category | `ComponentType` taxonomy | new node on canvas | T-039 |
| **NodeConfigPanel** | `NodeConfigPanel.tsx` | Right panel: edit selected node's params | `ComponentNode` | updated `ComponentNode` | T-033 |
| **EdgeConfigPanel** | `EdgeConfigPanel.tsx` | Right panel: edit selected edge's params | `EdgeDefinition` | updated `EdgeDefinition` | T-033 |
| **WorkloadConfig** | `WorkloadConfig.tsx` | Scenario bar: traffic pattern, RPS, request mix | `WorkloadProfile` | updated `WorkloadProfile` | T-034 |
| **FaultConfig** | `FaultConfig.tsx` | Scenario bar: add/edit/delete fault injections | `FaultSpec[]` | updated `FaultSpec[]` | T-034 |
| **SimulationControls** | `SimulationControls.tsx` | Run/Pause/Stop/Step buttons + progress bar + speed selector (`[1×][5×][10×][Max]`) | `useSimulation` state | commands to worker | T-034 |
| **TopologyViewer** | `TopologyViewer.tsx` | Tree view of full topology — expand/collapse, inline edit, search | `useTopologyStore` | writes to store | T-044 |
| **ImportExportControls** | `ImportExportControls.tsx` | Download/Upload/Copy/Paste buttons + validation badge | `useTopologyStore` | file / clipboard | T-046 |
| **TopologySerializer** | `useTopologySerializer.ts` | Convert React Flow state → `TopologyJSON` (becomes `store.exportTopology()` after T-043) | `rfNodes`, `rfEdges`, configs | `TopologyJSON` | T-028 |
| **TopologyValidator** | `validator.ts` | Validate topology before simulation | `TopologyJSON` | errors/warnings | T-003 |

### 5.2 SIMULATE Phase Components

| Component | File | Role | Data In | Data Out | Ticket |
|-----------|------|------|---------|----------|--------|
| **ScenarioBar** | `ScenarioBar.tsx` | Container for workload, faults, and sim controls | all config state | — | T-034 |
| **SimulationWorker** | `simulation.worker.ts` | Runs engine in background thread | `TopologyJSON` | `PROGRESS`, `SNAPSHOT`, `COMPLETE` | T-025 |
| **useSimulation** | `useSimulation.ts` | React hook: manages worker lifecycle + state | `TopologyJSON` | `status`, `progress`, `result`, `snapshots` | T-026 |
| **useLiveVisualization** | `useLiveVisualization.ts` | React hook: maps snapshots → node/edge styles | `TimeSeriesSnapshot[]` | `nodeStyles`, `edgeStyles` | T-027 |

### 5.3 State Management (cross-phase)

| Component | File | Role | Data In | Data Out | Ticket |
|-----------|------|------|---------|----------|--------|
| **useTopologyStore** | `topologyStore.ts` | Canonical topology state — all views read/write here | canvas events, inspector edits, JSON viewer edits, imported files | `rfNodes`, `rfEdges`, `validationResult`, `TopologyJSON` | T-043 |
| **useTopologyDeserializer** | `useTopologyDeserializer.ts` | Import JSON → validate → populate store + auto-layout | `TopologyJSON` (file, clipboard, string) | `ImportResult` (success/errors) | T-045 |

### 5.4 ANALYSE Phase Components

| Component | File | Role | Data In | Data Out | Ticket |
|-----------|------|------|---------|----------|--------|
| **ResultsTray** | `ResultsTray.tsx` | Collapsible bottom tray with tabbed results | `SimulationOutput` | — | T-035 |
| **MetricsDashboard** | `MetricsDashboard.tsx` | Summary cards: P50/P90/P95/P99, throughput, errors | `SimulationOutput.summary` | rendered cards | T-035 |
| **PerNodeTable** | `PerNodeTable.tsx` | Sortable table of per-node metrics | `SimulationOutput.perNode` | rendered table | T-035 |
| **SLOBreachList** | `SLOBreachList.tsx` | Table of SLO violations | `SimulationOutput.sloBreaches` | rendered list | T-035 |
| **WaterfallView** | `WaterfallView.tsx` | Horizontal bar chart of one request's journey | `SimulationOutput.traces[]` | rendered waterfall | T-036 |
| **CausalGraphView** | `CausalGraphView.tsx` | Tree/timeline of failure cascade | `SimulationOutput.causalGraph` | rendered graph | T-037 |
| **CostPanel** | `CostPanel.tsx` | Per-node and total cost table | `CostEstimate` | rendered table | T-038 |
| **AntiPatternPanel** | `AntiPatternPanel.tsx` | Warnings list with recommendations | `AntiPatternDetection[]` | rendered list | T-038 |
| **ComparisonView** | `ComparisonView.tsx` | Side-by-side diff of two simulation outputs | `DesignComparison` | rendered diff | T-032 |

### 5.5 Engine Components (no UI — pure logic)

| Component | File | Role | Ticket |
|-----------|------|------|--------|
| **TimeUtils** | `time.ts` | BigInt microsecond conversions | T-004 |
| **PRNG** | `prng.ts` | SFC32 deterministic random | T-005 |
| **Distributions** | `distributions.ts` | Sample from 12 probability distributions | T-006 |
| **MinHeap** | `min-heap.ts` | Priority queue for events | T-007 |
| **GGcKNode** | `node.ts` | Queue model for each node | T-008 |
| **WorkloadGenerator** | `workload.ts` | Generate traffic patterns | T-009 |
| **RoutingTable** | `routing.ts` | Edge lookup + routing strategies | T-010 |
| **SimulationEngine** | `engine.ts` | Main event loop | T-011 |
| **NetworkEdge** | `edge.ts` | Latency, congestion, packet loss | T-012 |
| **FailureInjector** | `failure-injector.ts` | Activate/deactivate faults | T-013 |
| **FailurePropagation** | `failure-propagation.ts` | Cascade failures through dependency graph | T-014 |
| **CircuitBreaker** | `circuit-breaker.ts` | CLOSED/OPEN/HALF_OPEN state machine | T-015 |
| **RetryPolicy** | `retry.ts` | Exponential backoff + jitter | T-016 |
| **RateLimiter** | `rate-limiter.ts` | Token bucket | T-016 |
| **Bulkhead** | `bulkhead.ts` | Per-dependency concurrency limit | T-016 |
| **LoadShedder** | `load-shedder.ts` | Drop requests under overload | T-016 |
| **Timeout** | `timeout.ts` | Deadline propagation | T-016 |
| **MetricsCollector** | `metrics.ts` | Record + aggregate request outcomes | T-017 |
| **RequestTracer** | `tracer.ts` | Sample request waterfalls | T-018 |
| **Autoscaler** | `autoscaler.ts` | Scale workers up/down by metrics | T-029 |
| **ChaosRunner** | `chaos-runner.ts` | Run structured chaos experiments | T-022 |
| **ScenarioComposer** | `scenario-composer.ts` | Combine multiple scenarios | T-024 |

---

## 6. Feature-to-Ticket Map

### What exists today

| Feature | Status |
|---------|--------|
| React Flow canvas with nodes | Done |
| React Flow canvas with edges | Done |
| Drag to position nodes | Done |
| Connect nodes with edges | Done |

### What needs to be built (ordered by priority)

#### Critical Path (MVP — must be built in order)

| Priority | Feature | Ticket(s) | Blocked by |
|----------|---------|-----------|------------|
| 1 | TypeScript types for topology JSON | T-001 | — |
| 2 | Event types + factory functions | T-002 | — |
| 3 | BigInt time utilities | T-004 | — |
| 4 | Deterministic PRNG | T-005 | — |
| 5 | Distribution sampler | T-006 | T-005 |
| 6 | Min-heap priority queue | T-007 | T-002 |
| 7 | G/G/c/K node model | T-008 | T-004, T-005, T-006, T-002 |
| 8 | Workload generator | T-009 | T-005, T-006, T-004, T-002 |
| 9 | Routing table | T-010 | T-001 |
| 10 | **Simulation engine** (main event loop) | T-011 | T-007, T-008, T-009, T-010 |
| 11 | Metrics collector | T-017 | T-002, T-004 |
| 12 | Simulation output aggregator | T-020 | T-017 |
| 13 | Topology serializer (React Flow → JSON) | T-028 | T-001, T-003 |
| 14 | Topology validator | T-003 | T-001 |
| 15 | Web Worker wrapper | T-025 | T-011, T-020 |
| 16 | `useSimulation` React hook | T-026 | T-025 |

After these 16 tickets, you have: **a working simulation that runs from the canvas and returns results**.

#### UI Components (can develop in parallel with engine — only need T-001)

| Feature | Ticket(s) | Can start after |
|---------|-----------|-----------------|
| Node & Edge Inspector Panel | T-033 | T-001 |
| Node Palette (drag to canvas) | T-039 | T-001 |
| Scenario Bar (workload + faults + controls) | T-034 | T-001, T-026 |
| Results Tray — Summary & Per-Node | T-035 | T-020, T-026 |
| Results Tray — Waterfall Trace View | T-036 | T-018, T-035 |
| Results Tray — Failure Cascade View | T-037 | T-021, T-035 |
| Results Tray — Cost & Anti-Pattern | T-038 | T-030, T-031, T-035 |

#### Topology State & Viewer (can develop in parallel with engine — only need T-001 + T-003)

| Feature | Ticket(s) | Can start after |
|---------|-----------|-----------------|
| Topology state store | T-043 | T-001, T-003 |
| JSON Topology Viewer (tree view + inline edit) | T-044 | T-043 |
| Topology deserializer (JSON → canvas) | T-045 | T-043 |
| Import/Export controls (download, upload, copy, paste) | T-046 | T-043, T-045 |

#### Engine — Important but Parallel

| Feature | Ticket(s) | Can start after |
|---------|-----------|-----------------|
| Live canvas coloring | T-027 | T-026 |
| Network edge modeling | T-012 | T-006 |
| Circuit breaker | T-015 | T-004 |
| Retry, rate limiter, bulkhead, timeout | T-016 | T-004, T-005 |
| Request tracer (waterfall data) | T-018 | T-002 |
| Time-series snapshots | T-019 | T-008, T-012 |
| Failure injector | T-013 | T-002, T-004 |
| Failure propagation | T-014 | T-013 |
| Causal graph builder | T-021 | T-014 |

#### CLI

| Feature | Ticket(s) | Can start after |
|---------|-----------|-----------------|
| Base CLI (`dsds run/validate/show/inspect`) | T-040 | T-011, T-020, T-003 |
| Live mode (`dsds run --live`) | T-041 | T-040, T-019 |
| Compare, cost, lint commands | T-042 | T-040, T-030, T-031, T-032 |

#### Nice-to-Have (after core works)

| Feature | Ticket(s) |
|---------|-----------|
| Chaos experiment runner | T-022 |
| Pre-built scenarios (3) | T-023 |
| Scenario composer | T-024 |
| Autoscaling simulation | T-029 |
| Anti-pattern detector | T-030 |
| Cost calculator | T-031 |
| Design comparator | T-032 |

---

## 7. Design Foundations

Retained from the original design system, aligned with the components above.

### 7.1 Color System

| Token | Usage | Value (dark theme) |
|-------|-------|-------------------|
| `bg-canvas` | Canvas background | `#0a0a0a` |
| `bg-panel` | Side panels, trays | `#141414` |
| `bg-elevated` | Cards, tooltips | `#1e1e1e` |
| `text-primary` | Main text | `#e5e5e5` |
| `text-secondary` | Labels, descriptions | `#a3a3a3` |
| `text-muted` | Hints, placeholders | `#525252` |

#### Simulation State Colors

| State | Color | Hex | Used for |
|-------|-------|-----|----------|
| Healthy / OK | Green | `#22c55e` | Node < 60% util, edge normal latency |
| Warm | Yellow | `#eab308` | Node 60-85% util |
| Hot | Orange | `#f97316` | Node 85-95% util |
| Failed / Critical | Red | `#ef4444` | Node > 95% or FAILED, SLO breach |
| Info | Blue | `#3b82f6` | Informational badges |

### 7.2 Node Visual States

| State | Background | Border | Badge |
|-------|-----------|--------|-------|
| Idle (pre-sim) | `bg-elevated` | default | type label |
| Healthy | green tint | green | "42% · 980 rps" |
| Saturated | orange tint | orange | "92% · 500 rps ⚠" |
| Failed | red tint | red | "FAILED ✗" |
| Selected | — | blue focus ring | — |

### 7.3 Edge Visual States

| State | Stroke | Width | Animation |
|-------|--------|-------|-----------|
| Idle (pre-sim) | `#525252` | 1px | none |
| Active (low load) | green | 1-2px | flowing dashes |
| Active (high load) | yellow-orange | 3-5px | faster dashes |
| Congested | red | 5-8px | pulsing |
| Failed / dropped | red dashed | 1px | none |

### 7.4 Typography

| Usage | Font | Size | Weight |
|-------|------|------|--------|
| Metric values (P99, RPS) | Mono | 24px | Bold |
| Node labels | Sans | 14px | Medium |
| Inspector labels | Sans | 12px | Regular |
| Inspector values | Mono | 13px | Regular |
| Table headers | Sans | 11px | Semibold |
| Table cells | Mono | 12px | Regular |

### 7.5 Interaction Principles

- **Deterministic feedback**: same input always produces the same output. The seed is always visible.
- **No decorative animation**: every animation represents data (flowing dashes = throughput, color change = utilization).
- **Mathematical transparency**: hovering over any metric shows the formula (e.g., "utilization = activeWorkers / maxWorkers = 85/100 = 85%").
- **Causal highlighting**: clicking a failed node highlights the dependency chain that caused it.
- **Desktop-first**: minimum viewport 1280px. No mobile layout.

---

## Appendix: Gap Analysis — Old ui.md vs Current Implementation

The original `ui.md` was a design-system-first document (atomic design, tokens, variants). Here is what changed:

| Old ui.md item | Status | Notes |
|---------------|--------|-------|
| 10 primary screens | Reduced to **1 screen with 4 zones** | Fewer screens = less navigation, faster workflow |
| SQI (System Quality Index) | Removed | Not in engine or tickets. Can be added later as a derived score from P99 + error rate + cost |
| Scenario selector (Best/Average/Worst) | Replaced with **workload pattern selector** | More precise: the user picks Poisson/Spike/Diurnal, not vague "best/worst" |
| Trace-driven workload | Deferred | Not in Phase 1 tickets. Would be a `replay` workload pattern |
| Retry storm visualization | Covered by **causal failure graph** | The cascade view shows retry amplification naturally |
| Timeline Scheduler Component | Replaced by **FaultConfig** in scenario bar | Faults are configured as a list with timing, not a visual timeline (simpler to build) |
| Atomic design hierarchy (atoms/molecules/organisms) | Kept conceptually but **organized by phase** (BUILD/SIMULATE/ANALYSE) | Phase-based grouping is easier to reason about operationally |
| Design tokens (colors, typography, spacing) | Retained in Section 7 | Simplified to what's actually needed |
| 7.5 SQI sub-scores (Performance/Resilience/Cost/Scalability) | Removed | Over-engineered for v1. Raw metrics (P99, error rate, cost) are more useful |
