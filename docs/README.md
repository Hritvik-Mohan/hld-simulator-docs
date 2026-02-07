# System Design & Discrete-Event Simulation: A First Principles Guide

## From Zero to Chaos Engineering in Five Parts

---

## 📖 Overview

This is a comprehensive, beginner-to-expert teaching curriculum for understanding **system design** and **discrete-event simulation**. It takes you from "What is a node?" to "Run chaos experiments and analyze root causes" through progressive, hands-on learning.

**What you'll build:** A complete discrete-event simulator capable of modeling distributed systems, injecting failures, and analyzing results—all from first principles.

**Who this is for:**
- Software engineers wanting to understand system behavior
- Architects designing resilient distributed systems
- Students learning simulation and queueing theory
- Anyone preparing for system design interviews with deeper understanding

**Total content:** ~7,200 lines across 5 parts, 30 chapters

---

## 🎯 Learning Objectives

By the end of this curriculum, you will be able to:

1. **Model** any distributed system as nodes and edges
2. **Simulate** realistic behavior with proper probability distributions
3. **Implement** efficient data structures (heaps, PRNGs) for simulation
4. **Inject** failures to test system resilience
5. **Analyze** results to find bottlenecks and root causes
6. **Apply** formal methods (DEVS) for rigorous modeling
7. **Design** chaos engineering experiments
8. **Make** data-driven capacity planning decisions

---

## 📋 Prerequisites

```
REQUIRED KNOWLEDGE
══════════════════

✓ Basic programming (examples in JavaScript)
✓ Understanding of functions, objects, arrays
✓ Basic math (arithmetic, simple algebra)

HELPFUL BUT NOT REQUIRED
════════════════════════

○ Probability basics (will be taught)
○ Data structures (heaps explained from scratch)
○ Distributed systems concepts (introduced progressively)

NO PRIOR KNOWLEDGE NEEDED
═════════════════════════

✗ Queueing theory
✗ Simulation theory
✗ DEVS formalism
✗ Chaos engineering
```

---

## 🗂️ Curriculum Index

### Part 1 & 2: Foundations & Simulation Basics
**File:** `system_design_simulation_parts_1_and_2.md`  
**Lines:** ~1,800  
**Time:** 4-6 hours

| Chapter | Title | Key Concepts |
|---------|-------|--------------|
| 1 | What Are We Looking At? | Why diagrams, simplest system |
| 2 | Nodes | Input/transformation/output, node types, states |
| 3 | Edges | Connections, latency formula, edge types |
| 4 | Combining Nodes & Edges | Patterns (sequence, fork, join, branch, loop) |
| 5 | Static to Dynamic | Limitation of diagrams, bridge to simulation |
| 6 | What Is Simulation? | Dollhouse mental model, simulation properties |
| 7 | How Simulations Work | Model, engine, observer |
| 8 | Events and States | Event anatomy, state changes |
| 9 | The Event Loop | Priority queue, time jumps, walkthrough |
| 10 | Parameters | λ, μ, K, c, utilization formula |
| 11 | Queues | Why queues exist, overflow handling, Little's Law |
| 12 | Randomness & Distributions | Exponential, log-normal, seeds |
| 13 | Summary | Key takeaways, concept map |

---

### Part 3: Core Data Structures & Mechanics
**File:** `part3_core_data_structures.md`  
**Lines:** ~2,300  
**Time:** 6-8 hours

| Chapter | Title | Key Concepts |
|---------|-------|--------------|
| 14 | The Min-Heap | Why heaps, array representation, O(log n) |
| 15 | Precision & Determinism | BigInt, floating-point problems, seeded PRNGs |
| 16 | G/G/c/K Queueing Model | Kendall notation, why G/G/c/K for real systems |
| 17 | Workload Generation | Traffic patterns, arrival distributions |
| 18 | Complete Simulation Engine | Full implementation, event handlers |
| 19 | Summary | Key takeaways |

---

### Part 4: Advanced System Behavior
**File:** `part4_advanced_system_behavior.md`  
**Lines:** ~2,100  
**Time:** 6-8 hours

| Chapter | Title | Key Concepts |
|---------|-------|--------------|
| 20 | Distributed Systems | Request journeys, dependency graphs |
| 21 | Network Physics | L = P + S/B + Q, realistic latency modeling |
| 22 | Failure Modes | Crash, omission, timing, Byzantine |
| 23 | Failure Propagation | Cascades, retry storms, thundering herd |
| 24 | Resilience Patterns | Circuit breaker, bulkhead, retry, rate limit |
| 25 | Summary | Key takeaways |

---

### Part 5: DEVS, Chaos Engineering & Output Analysis
**File:** `part5_devs_chaos_analysis.md`  
**Lines:** ~1,000  
**Time:** 4-6 hours

| Chapter | Title | Key Concepts |
|---------|-------|--------------|
| 26 | DEVS Formalism | Atomic DEVS, Coupled DEVS, formal semantics |
| 27 | Chaos Engineering | Hypothesis, experiments, steady state |
| 28 | Output Analysis | Metrics, visualization, trace analysis |
| 29 | Summary | Key takeaways |
| A | Quick Reference | Formulas, distributions, cheat sheets |
| B | Common Pitfalls | 8 mistakes and solutions |
| C | Glossary | Term definitions |

---

## 🏗️ Architecture Walkthrough

This section explains the **complete simulator architecture** that you'll build through the curriculum.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SIMULATION SYSTEM                                   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        CONFIGURATION LAYER                            │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   System    │  │   Traffic   │  │   Failure   │  │    Chaos    │  │  │
│  │  │   Config    │  │   Patterns  │  │  Scenarios  │  │ Experiments │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        SIMULATION ENGINE                              │  │
│  │                                                                       │  │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │  │
│  │  │                 │    │                 │    │                 │   │  │
│  │  │  EVENT QUEUE    │    │     CLOCK       │    │   SCHEDULER     │   │  │
│  │  │  (Min-Heap)     │◀──▶│   (BigInt)      │◀──▶│                 │   │  │
│  │  │                 │    │                 │    │                 │   │  │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘   │  │
│  │           │                                             │            │  │
│  │           ▼                                             ▼            │  │
│  │  ┌─────────────────────────────────────────────────────────────┐    │  │
│  │  │                     EVENT HANDLERS                           │    │  │
│  │  │                                                              │    │  │
│  │  │  REQUEST_ARRIVAL │ PROCESSING_COMPLETE │ TIMEOUT │ FAILURE  │    │  │
│  │  └─────────────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                          SYSTEM MODEL                                 │  │
│  │                                                                       │  │
│  │   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐       │  │
│  │   │Workload │────▶│ Gateway │────▶│ Service │────▶│Database │       │  │
│  │   │Generator│     │ G/G/c/K │     │ G/G/c/K │     │ G/G/c/K │       │  │
│  │   └─────────┘     └────┬────┘     └────┬────┘     └─────────┘       │  │
│  │                        │               │                             │  │
│  │                   ┌────┴────┐     ┌────┴────┐                        │  │
│  │                   │  Edge   │     │  Edge   │                        │  │
│  │                   │(Network)│     │(Network)│                        │  │
│  │                   └─────────┘     └─────────┘                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        ANALYSIS LAYER                                 │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Metrics   │  │    Trace    │  │   Causal    │  │    ASCII    │  │  │
│  │  │  Collector  │  │  Analyzer   │  │  Analyzer   │  │   Charts    │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Deep Dive

#### 1. Configuration Layer (Part 1-2)

```
CONFIGURATION
═════════════

Purpose: Define WHAT to simulate

┌─────────────────────────────────────────────────────────────┐
│ System Config                                               │
├─────────────────────────────────────────────────────────────┤
│ {                                                           │
│   seed: "simulation-seed",      // Reproducibility         │
│   duration: 60000,              // Simulation time (ms)    │
│                                                             │
│   nodes: [                      // Components              │
│     { id, type, workers, capacity, serviceTime }           │
│   ],                                                        │
│                                                             │
│   edges: [                      // Connections             │
│     { source, target, latency, packetLoss }                │
│   ]                                                         │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘

You learn: Nodes, edges, parameters, system modeling
```

#### 2. Simulation Engine (Part 2-3)

```
ENGINE CORE
═══════════

Purpose: Execute the simulation (HOW time progresses)

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  EVENT QUEUE (Min-Heap)           CLOCK (BigInt)           │
│  ┌─────────────────────┐          ┌─────────────────┐      │
│  │      T=50           │          │                 │      │
│  │     /    \          │          │  Current Time   │      │
│  │   T=75   T=200      │   ───▶   │  = 50000n μs    │      │
│  │   / \               │          │                 │      │
│  │ T=100 T=150         │          └─────────────────┘      │
│  └─────────────────────┘                                   │
│                                                             │
│  THE LOOP:                                                  │
│  ─────────                                                  │
│  1. event = queue.extractMin()    // O(log n)              │
│  2. clock = event.timestamp       // Time jump             │
│  3. process(event)                // May schedule more     │
│  4. repeat until empty or done                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

You learn: Min-heap, BigInt precision, event loop, scheduling
```

#### 3. System Model (Part 3-4)

```
NODES (G/G/c/K Queues)
══════════════════════

Purpose: Model component behavior

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ┌───────────────────────────────────┐    │
│   Arrivals ───────▶│  QUEUE (capacity K)               │    │
│      λ             │  [req1][req2][req3][...][reqK]    │    │
│                    └──────────────┬────────────────────┘    │
│                                   │                         │
│                    ┌──────────────┴────────────────────┐    │
│                    │  WORKERS (c parallel)             │    │
│                    │  ┌────┐ ┌────┐ ┌────┐     ┌────┐ │    │
│                    │  │ W1 │ │ W2 │ │ W3 │ ... │ Wc │ │    │
│                    │  │BUSY│ │BUSY│ │IDLE│     │IDLE│ │    │
│                    │  └────┘ └────┘ └────┘     └────┘ │    │
│                    └──────────────┬────────────────────┘    │
│                                   │                         │
│   Departures ◀────────────────────┘                         │
│      μ                                                      │
│                                                             │
│   Utilization: ρ = λ / (c × μ)                             │
│   Stable if: ρ < 1                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘


EDGES (Network)
═══════════════

Purpose: Model communication between nodes

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   LATENCY = Propagation + Transmission + Queuing           │
│                                                             │
│        L = P + S/B + Q                                      │
│                                                             │
│   Where:                                                    │
│   • P = distance / speed_of_light                          │
│   • S/B = message_size / bandwidth                         │
│   • Q = congestion_delay (variable!)                       │
│                                                             │
│   Distribution: Log-normal (captures long tail)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

You learn: Queueing theory, Kendall notation, network physics
```

#### 4. Failure & Resilience (Part 4)

```
FAILURE INJECTION
═════════════════

Purpose: Test system under adverse conditions

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   FAILURE TYPES:                                           │
│   ──────────────                                           │
│   • Crash      - Component stops completely                │
│   • Slow       - Latency increases dramatically            │
│   • Error      - Returns errors probabilistically          │
│   • Partial    - Affects subset of requests                │
│                                                             │
│   INJECTION:                                                │
│   ──────────                                               │
│   {                                                         │
│     target: "database",                                    │
│     type: "crash",                                         │
│     timing: { at: 30000 },    // Deterministic            │
│     duration: { ms: 60000 }   // 60 seconds               │
│   }                                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘


FAILURE PROPAGATION
═══════════════════

Purpose: Model how failures cascade

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   DATABASE SLOW                                            │
│        │                                                    │
│        ▼                                                    │
│   SERVICE QUEUES BUILD UP                                  │
│        │                                                    │
│        ▼                                                    │
│   SERVICE THREADS EXHAUST                                  │
│        │                                                    │
│        ▼                                                    │
│   GATEWAY TIMES OUT                                        │
│        │                                                    │
│        ▼                                                    │
│   USERS SEE 503 ERRORS                                     │
│                                                             │
│   Total cascade time: ~30 seconds                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘


RESILIENCE PATTERNS
═══════════════════

Purpose: Prevent cascades

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   CIRCUIT BREAKER                                          │
│   ────────────────                                         │
│   CLOSED ──[failures]──▶ OPEN ──[timeout]──▶ HALF-OPEN    │
│      ▲                                            │        │
│      └────────────────[success]───────────────────┘        │
│                                                             │
│   BULKHEAD                                                 │
│   ────────                                                 │
│   Isolate failure domains with separate resource pools     │
│                                                             │
│   RETRY + BACKOFF                                          │
│   ───────────────                                          │
│   Exponential delay with jitter prevents retry storms      │
│                                                             │
│   LOAD SHEDDING                                            │
│   ─────────────                                            │
│   Reject excess load gracefully to protect core function   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

You learn: Failure taxonomy, cascade patterns, resilience
```

#### 5. DEVS Formalism (Part 5)

```
DEVS: Formal Foundation
═══════════════════════

Purpose: Mathematical rigor for simulation

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ATOMIC DEVS: M = <X, Y, S, δext, δint, λ, ta>           │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                                                     │  │
│   │  X (Input)  ───▶  [  STATE S  ]  ───▶  Y (Output)  │  │
│   │                        │                            │  │
│   │                   ┌────┴────┐                       │  │
│   │                   │         │                       │  │
│   │                 δext      δint                      │  │
│   │              (external) (internal)                  │  │
│   │                   │         │                       │  │
│   │                   │    ta(S) = time to next        │  │
│   │                   │    internal event              │  │
│   │                   │         │                       │  │
│   │                   └────┬────┘                       │  │
│   │                        │                            │  │
│   │                   λ(S) = output                     │  │
│   │                                                     │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   COUPLED DEVS: Connect multiple atomic models             │
│   hierarchically to build complex systems                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

You learn: Formal semantics, composability, verification
```

#### 6. Chaos Engineering (Part 5)

```
CHAOS ENGINEERING WORKFLOW
══════════════════════════

Purpose: Build confidence through controlled experiments

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   1. DEFINE STEADY STATE                                   │
│      ────────────────────                                  │
│      • Latency P99 < 200ms                                │
│      • Error rate < 0.1%                                   │
│      • Throughput > 1000 req/sec                          │
│                                                             │
│   2. HYPOTHESIZE                                           │
│      ──────────                                            │
│      "If database fails, system failovers in <60s         │
│       with <5% errors during transition"                   │
│                                                             │
│   3. DESIGN EXPERIMENT                                     │
│      ─────────────────                                     │
│      • Failure type: DB primary crash                     │
│      • Duration: 60 seconds                                │
│      • Metrics: latency, error rate                       │
│      • Abort if: error rate > 50%                         │
│                                                             │
│   4. RUN                                                   │
│      ───                                                   │
│      Simulation first, then production (carefully!)        │
│                                                             │
│   5. ANALYZE                                               │
│      ───────                                               │
│      Steady state held? → Confidence increased            │
│      Steady state broke? → Fix and re-test                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

You learn: Experiment design, steady state, hypothesis testing
```

#### 7. Analysis Layer (Part 5)

```
OUTPUT ANALYSIS
═══════════════

Purpose: Understand what happened and why

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   METRICS COLLECTION                                       │
│   ──────────────────                                       │
│   • Time series (latency, throughput over time)           │
│   • Histograms (latency distribution)                     │
│   • Counters (total requests, errors)                     │
│   • Percentiles (P50, P90, P99, P999)                    │
│                                                             │
│   TRACE ANALYSIS                                           │
│   ──────────────                                           │
│   • Waterfall diagrams (request path timing)              │
│   • Bottleneck identification                             │
│   • Slow path detection                                    │
│                                                             │
│   CAUSAL ANALYSIS                                          │
│   ───────────────                                          │
│   • Build causal graph from events                        │
│   • Find root cause (earliest failure)                    │
│   • Calculate blast radius                                 │
│                                                             │
│   VERIFICATION                                             │
│   ────────────                                             │
│   • Little's Law: L ≈ λ × W                               │
│   • If violated, you have a bug!                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

You learn: Metrics, visualization, debugging, root cause analysis
```

---

## 📊 Key Formulas Reference

```
ESSENTIAL FORMULAS
══════════════════

Utilization (stability check):
    ρ = λ / (c × μ)
    
    λ = arrival rate (requests/sec)
    c = number of workers
    μ = service rate (1/processing_time)
    
    ρ < 1 → Stable
    ρ ≥ 1 → Overload!


Little's Law (verification):
    L = λ × W
    
    L = average items in system
    W = average time in system
    
    Always true. Use to verify simulation correctness.


Network Latency:
    L = P + S/B + Q
    
    P = propagation (distance/speed_of_light)
    S = message size
    B = bandwidth
    Q = queuing delay (variable)


Percentile Calculation:
    P99 = value exceeded by only 1% of samples
    
    sorted_data[ceil(n * 0.99) - 1]
```

---

## 🔧 Code Components Index

| Component | Part | Purpose | Complexity |
|-----------|------|---------|------------|
| `MinHeap` | 3 | Event queue, O(log n) operations | ~80 lines |
| `TimeUtils` | 3 | BigInt time conversion | ~15 lines |
| `sfc32` / `xmur3` | 3 | Seeded PRNG | ~30 lines |
| `Distributions` | 3 | Generate random values | ~70 lines |
| `GGcKNode` | 3 | Queueing model implementation | ~120 lines |
| `WorkloadGenerator` | 3 | Traffic pattern generation | ~100 lines |
| `SimulationEngine` | 3 | Complete simulator | ~300 lines |
| `NetworkEdge` | 4 | Realistic latency model | ~120 lines |
| `FailureInjector` | 4 | Fault injection system | ~150 lines |
| `CircuitBreaker` | 4 | Resilience pattern | ~120 lines |
| `RetryPolicy` | 4 | Exponential backoff | ~30 lines |
| `LoadShedder` | 4 | Overload protection | ~50 lines |
| `ServerAtomicDEVS` | 5 | DEVS atomic model | ~80 lines |
| `DEVSSimulator` | 5 | DEVS coordinator | ~100 lines |
| `ChaosExperiment` | 5 | Experiment definition | ~80 lines |
| `MetricsCollector` | 5 | Statistics gathering | ~100 lines |
| `TraceAnalyzer` | 5 | Distributed tracing | ~80 lines |
| `CausalAnalyzer` | 5 | Root cause analysis | ~70 lines |
| `ASCIICharts` | 5 | Terminal visualization | ~60 lines |

---

## 📚 Recommended Learning Path

```
SUGGESTED PROGRESSION
═════════════════════

WEEK 1-2: Foundations (Parts 1-2)
─────────────────────────────────
□ Read chapters 1-5 (nodes, edges, patterns)
□ Draw a system you know as nodes and edges
□ Read chapters 6-13 (simulation basics)
□ Trace through event loop by hand
□ Understand Little's Law intuitively


WEEK 3-4: Implementation (Part 3)
─────────────────────────────────
□ Implement MinHeap from scratch
□ Understand BigInt precision issues
□ Implement distribution generators
□ Build a simple single-queue simulator
□ Verify with Little's Law


WEEK 5-6: Distributed Systems (Part 4)
──────────────────────────────────────
□ Model a multi-component system
□ Add realistic network latency
□ Implement failure injection
□ Observe cascade behavior
□ Add circuit breaker


WEEK 7-8: Advanced Topics (Part 5)
──────────────────────────────────
□ Reframe simulator in DEVS terms
□ Design a chaos experiment
□ Run experiment, analyze results
□ Find and fix a weakness
□ Build confidence!


CAPSTONE PROJECT
────────────────
Model a system you work with:
• Define nodes and edges
• Add realistic parameters
• Inject failures
• Find bottlenecks
• Propose improvements
```

---

## 📖 Additional Resources

### Books
- **"The Art of Computer Systems Performance Analysis"** by Raj Jain — Comprehensive performance modeling
- **"Theory of Modeling and Simulation"** by Zeigler, Praehofer, Kim — DEVS formalism
- **"Designing Data-Intensive Applications"** by Martin Kleppmann — Distributed systems
- **"Release It!"** by Michael Nygard — Resilience patterns

### Papers
- **Little's Law** (1961) — Original proof of L = λW
- **DEVS Formalism** (Zeigler, 1976) — Foundation of discrete event specification
- **Principles of Chaos Engineering** — Netflix's chaos manifesto

### Tools (for comparison)
- **SimPy** (Python) — Discrete event simulation library
- **JMT** (Java) — Queueing network analyzer
- **Chaos Monkey** — Netflix's failure injection tool
- **Gremlin** — Chaos engineering platform

### Online
- [Queueing Theory Calculator](https://www.supositorio.com/rcalc/rcalclite.htm)
- [DEVS Standardization](http://www.sce.carleton.ca/faculty/wainer/standard/)

---

## ⚠️ Common Mistakes to Avoid

```
TOP 8 PITFALLS
══════════════

1. Using averages instead of distributions
   ✗ processingTime = 50
   ✓ processingTime = logNormal(μ=3.9, σ=0.8)

2. Ignoring queue capacity
   ✗ Unlimited queue
   ✓ Bounded with rejection handling

3. No network latency
   ✗ Instant communication
   ✓ L = P + S/B + Q

4. Same PRNG seed everywhere
   ✗ All components correlated
   ✓ Fork seeds per component

5. Floating-point timestamps
   ✗ Precision errors accumulate
   ✓ BigInt microseconds

6. No failure testing
   ✗ Only happy path
   ✓ Chaos experiments

7. Not verifying Little's Law
   ✗ Bugs go unnoticed
   ✓ L ≈ λ × W always

8. No warmup period
   ✗ Transients skew metrics
   ✓ Discard initial samples
```

---

## 🎓 Assessment Checkpoints

After each part, you should be able to:

### After Parts 1-2
- [ ] Draw any system as nodes and edges
- [ ] Identify node types (source, processor, sink, router)
- [ ] Explain what an event is
- [ ] Trace through an event loop by hand
- [ ] Calculate utilization ρ
- [ ] Apply Little's Law

### After Part 3
- [ ] Implement a min-heap
- [ ] Explain why BigInt matters
- [ ] Generate values from distributions
- [ ] Implement a G/G/c/K queue
- [ ] Build a working simulator
- [ ] Verify with Little's Law

### After Part 4
- [ ] Model multi-component systems
- [ ] Calculate realistic network latency
- [ ] Identify failure modes
- [ ] Explain cascade patterns
- [ ] Implement circuit breaker
- [ ] Apply resilience patterns

### After Part 5
- [ ] Define an Atomic DEVS model
- [ ] Design a chaos experiment
- [ ] Collect and analyze metrics
- [ ] Create trace visualizations
- [ ] Perform root cause analysis
- [ ] Build confidence through experimentation

---

## 📝 Quick Start

```bash
# 1. Start with Parts 1-2
open system_design_simulation_parts_1_and_2.md

# 2. Progress through each part in order
open part3_core_data_structures.md
open part4_advanced_system_behavior.md
open part5_devs_chaos_analysis.md

# 3. Code along with examples
# All code is JavaScript, runnable in Node.js or browser

# 4. Build your own simulator for a system you know!
```

---

## 🏁 Conclusion

This curriculum takes you from first principles to production-ready simulation skills. By the end, you'll understand not just HOW to simulate systems, but WHY each technique exists and WHEN to apply it.

**Remember:** The best way to learn is to BUILD. Take a system you know, model it, break it, fix it, and make it better.

Happy simulating! 🚀

---

*Total Curriculum: ~7,200 lines across 5 parts, 30 chapters*
*Estimated Time: 20-30 hours of focused study*