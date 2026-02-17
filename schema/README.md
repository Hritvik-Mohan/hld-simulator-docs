# Simulator Schema

The complete TypeScript type system for the Distributed System Design Simulator. This single file consolidates definitions from both the documentation series and the canonical catalogue into one importable schema.

## File

- **`complete_simulator_schema.ts`** — 2300+ lines covering every type, interface, and configuration the simulator uses.

## Structure

The schema is organized into 17 parts:

| Part | What it defines |
|---|---|
| 1. Component Taxonomy | Union types for all ~110+ component types across 14 categories (compute, network, storage, messaging, orchestration, security, observability, DevOps, data infra, real-time, integration, DNS, consensus, auxiliary) |
| 2. Patterns & Anti-patterns | `ArchitecturalPattern` (23 patterns) and `AntiPattern` (7 anti-patterns) types with detection interfaces |
| 3. Component Specification | `ComponentDefinition` — the full component interface with identity, deployment context, resources, lifecycle, dependencies, health checks, telemetry, SLOs, fault injection, scaling, security, and failure modes |
| 4. Simulation Events | `SimulationEvent` and all `EventData` variants — request lifecycle, node failures, network partitions, scaling, DB failover, security breaches, cache events, circuit breaker state changes, etc. |
| 5. Failure Modes & Propagation | `FailurePropagation` and `PropagationRule` — how failures cascade (timeouts, backpressure, thundering herd, split-brain, etc.) with conditions and effects |
| 6. Workload Profiles | `WorkloadProfile` union type — steady-state, spike, diurnal, sawtooth, bursty, long-tail, replay, and custom traffic patterns |
| 7. Fault Injection | `FaultInjection` and `FaultSpec` — deterministic/probabilistic/conditional timing, 14 fault types (latency, errors, packet loss, CPU/memory stress, DNS failure, clock skew, process crash, etc.) |
| 8. Metrics & SLIs | `MetricsDefinition` — latency percentiles, throughput, availability, errors, saturation, durability, consistency, cost, and recovery metrics. `SLOBreachEvent` for tracking violations |
| 9. Scaling Simulation | `ScalingSimulation` — horizontal scaling with cold start modeling, vertical scaling, and shard rebalancing |
| 10. Invariants & Policies | `SimulationInvariant` — idempotency, causal ordering, consistency, security, SLO, and custom invariant checks |
| 11. Simulation Outputs | `SimulationOutput` — the complete output structure including event traces, request traces, metrics, time series, heatmaps, causal graphs, invariant violations, SLO breaches, anti-pattern detection, and reproducibility specs |
| 12. Provider Mapping | `ProviderConfig` — cloud-specific latency profiles, quotas, cost structures, and service configs. Includes a pre-built `AWS_PROFILE` |
| 13. Utilities & Tools | `DeterministicRandomController`, `ScenarioComposer`, `CostCalculator`, `ImpactCalculator`, `ReplayEngine`, `DesignComparator` |
| 14. Example Scenarios | `BUILT_IN_SCENARIOS` — 5 pre-configured scenarios (cache stampede, DB primary crash, network partition, auth outage, 10x traffic spike) |
| 15. System Architecture | `SystemArchitecture` — the top-level interface that ties components, edges, patterns, providers, failure scenarios, and invariants together. Includes `GlobalConfig` and `EdgeDefinition` |
| 16. Distribution Configs | `DistributionConfig` — 12 statistical distributions (constant, uniform, normal, log-normal, exponential, Poisson, Weibull, gamma, beta, Pareto, empirical, mixture) |
| 17. Component Configs | Type-specific configurations for APIs, microservices, load balancers, databases, caches, queues, streams, serverless functions, CDNs, SFUs, and gateways |

## Key types

```typescript
// Top-level architecture definition
SystemArchitecture

// Component with all attributes
ComponentDefinition

// Simulation event with causality tracking
SimulationEvent

// Complete simulation output
SimulationOutput

// Fault injection specification
FaultInjection

// Workload/traffic pattern
WorkloadProfile

// Statistical distribution for latency, jitter, etc.
DistributionConfig
```

## Exports

The file exports all major types and interfaces, plus two pre-built constants:

- **`BUILT_IN_SCENARIOS`** — 5 ready-to-use test scenarios
- **`AWS_PROFILE`** — Pre-configured AWS provider profile with latency, quotas, and cost data

s

- **`canonical-catalogue/`** — The CSV reference files that this schema codifies into TypeScript types
- **`docs/`** — The documentation series that explains the theory behind these data structures (min-heaps, queueing models, workload generation, etc.)
