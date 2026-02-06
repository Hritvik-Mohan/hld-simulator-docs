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
│   └── complete_simulator_schema.ts  # Full TypeScript type definitions
└── canonical-catalogue/
    └── *.csv                         # 17 reference catalogue files
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

- Component taxonomy and specification schema
- Failure modes and propagation semantics
- Metrics and SLIs
- Simulation primitives and events
- Scaling rules
- Patterns and anti-patterns for scenario generation
- Policies and invariants
- Provider mappings, implementation guidance, and example scenarios

## Schema

`schema/complete_simulator_schema.ts` consolidates the full type system for the simulator, incorporating definitions from both the documentation and the canonical catalogue. It covers compute types, storage types, network types, component specifications, failure modes, scaling rules, and more.
