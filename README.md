# HLD Simulator Docs

A comprehensive guide to building discrete event simulation engines for modeling and validating high-level system designs.

## Overview

This repository provides everything needed to understand and build a **Discrete Event Simulation (DES) engine** for distributed system architecture. It walks through the theory, data structures, and implementation details required to simulate system behavior — letting you discover bottlenecks, test scaling strategies, and validate designs before writing production code.

## Repository Structure

```
hld-simulator-docs/
├── docs/
│   ├── part-1.md                     # Foundations
│   ├── part-2.md                     # Introduction to Simulation
│   └── part-3.md                     # Core Data Structures & Mechanics
├── schema/
│   ├── complete_simulator_schema.ts  # Full TypeScript type definitions
│   └── README.md                     # Schema documentation
└── canonical-catalogue/
    ├── *.csv                         # 17 reference catalogue files
    └── README.md                     # Catalogue documentation
```

## Documentation Roadmap

### Part 1 — Foundations: Understanding System Diagrams

Covers the building blocks of any system diagram:

- **Nodes** — source, processing, storage, routing, sink, and composite nodes with their properties (capacity, processing speed, availability)
- **Edges** — synchronous, asynchronous, streaming, conditional, and weighted connections with failure modes
- **Patterns** — sequence, fork, join, branch, loop, and parallel composition
- Real-world examples across domains (hospitals, factories, e-commerce, web systems)

### Part 2 — Introduction to Simulation

Introduces core simulation concepts:

- The three ingredients: **model** (structure), **engine** (time progression), **observer** (measurements)
- Events, state, and the event loop
- Key parameters: arrival rate (lambda), capacity (K, c), service rate (mu), utilization (rho)
- Queues, overflow strategies, and Little's Law
- Randomness, distributions (exponential, log-normal, Poisson), and deterministic replay via seeded PRNGs

### Part 3 — Core Data Structures & Mechanics

Covers implementation in depth with working code:

- **Min-heap** — O(log n) event queue with full JavaScript implementation
- **Precision & determinism** — BigInt timestamps, SFC32 PRNG, distribution generators
- **G/G/c/K queueing model** — formalizing node behavior with Kendall's notation
- **Workload generation** — constant, Poisson, bursty, diurnal, and spike traffic patterns
- **Simulation engine** — complete implementation with event handlers, latency percentiles (p50/p90/p95/p99), and Little's Law verification

## Canonical Catalogue

The `canonical-catalogue/` directory contains 17 CSV reference files (the DSDS Canonical Catalogue) covering:

- **Component taxonomy** — ~110+ component types across 13 categories (compute, network, storage, messaging, orchestration, security, observability, DevOps, data infra, real-time, integration, consensus, DNS)
- **Component specification** — YAML schema template and uniform attributes every component must support
- **Simulation primitives** — event types, workload profiles (spike, steady-state, diurnal, bursty), and fault injection modes
- **Failure modes** — cascading failures, backpressure, split-brain, thundering herd, resource exhaustion, and propagation rules
- **Patterns & anti-patterns** — 23 architectural patterns (CQRS, Saga, Circuit Breaker, etc.) and 8 anti-patterns to detect
- **Metrics & SLIs** — latency percentiles, throughput, availability, saturation, cost, and recovery time
- **Policies & invariants** — idempotency, causal ordering, consistency, and security checks
- **Pre-built scenarios** — 7 deterministic test scenarios (cache stampede, DB failover, network partition, auth outage, traffic spike, and more)
- **Provider mapping** — AWS / GCP / Azure equivalents for multi-cloud simulation
- **Implementation guidance** — architecture recommendations, utility components, and a completeness checklist

See [`canonical-catalogue/README.md`](canonical-catalogue/README.md) for detailed descriptions of each file.

## Schema

`schema/complete_simulator_schema.ts` consolidates the full type system for the simulator (2300+ lines), incorporating definitions from both the documentation and the canonical catalogue. It is organized into 17 parts:

- **Component types** — union types for all ~110+ component types plus a unified `ComponentType`
- **Component specification** — `ComponentDefinition` with identity, resources, lifecycle, dependencies, health checks, telemetry, SLOs, fault injection, scaling, and security
- **Simulation events** — `SimulationEvent` with 50+ event types and typed `EventData` variants
- **Failure propagation** — `FailurePropagation` with conditions and cascading effects
- **Workload profiles** — 8 traffic pattern types (steady-state, spike, diurnal, sawtooth, bursty, long-tail, replay, custom)
- **Fault injection** — `FaultInjection` with 14 fault types and deterministic/probabilistic/conditional timing
- **Metrics & outputs** — `MetricsDefinition`, `SimulationOutput` with traces, heatmaps, causal graphs, and reproducibility specs
- **Scaling & invariants** — horizontal/vertical scaling simulation, shard rebalancing, and invariant checks
- **Provider configs** — cloud-specific latency, quotas, and cost profiles (includes pre-built `AWS_PROFILE`)
- **Utilities** — `ScenarioComposer`, `CostCalculator`, `ImpactCalculator`, `ReplayEngine`, `DesignComparator`
- **Built-in scenarios** — 5 pre-configured `BUILT_IN_SCENARIOS` (cache stampede, DB crash, network partition, auth outage, traffic spike)
- **Distribution configs** — 12 statistical distributions (normal, log-normal, exponential, Poisson, Weibull, gamma, beta, Pareto, empirical, mixture, etc.)
- **Component configs** — type-specific configurations for APIs, databases, caches, queues, streams, serverless functions, CDNs, SFUs, and gateways

See [`schema/README.md`](schema/README.md) for the full breakdown.
