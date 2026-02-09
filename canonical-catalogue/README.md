# DSDS Canonical Catalogue

A reference specification for the Distributed System Design Simulator (DSDS). This catalogue defines every component type, failure mode, pattern, and scenario the simulator can model — serving as the single source of truth for building and validating distributed system architectures.

## What's in here

17 CSV files that together form a complete specification framework:

```
canonical-catalogue/
├── Component taxonomy.csv              # ~110+ component types across 13 categories
├── Component specification schema.csv  # YAML schema template for defining components
├── Uniform component attributes.csv    # Fields every component must support
├── Simulation primitives & events.csv  # Event types for deterministic simulation
├── Failure modes & propagation semantics.csv  # How failures cascade through systems
├── Patterns for scenario generation.csv       # 23 architectural patterns (CQRS, Saga, etc.)
├── Anti-patterns for scenario generation.csv  # 8 anti-patterns to test against
├── examples.csv                        # Pre-built choreography examples (payment, media, WebRTC, DB failover)
├── Metrics & SLIs.csv                  # Default metrics: latency percentiles, throughput, saturation, cost
├── Policies and invariants.csv         # Deterministic checks (idempotency, causal ordering, SLOs)
├── Simulation outputs.csv             # Debug artifacts: event traces, heatmaps, causal graphs
├── Scaling rules.csv                  # Horizontal/vertical scaling, sharding, autoscaler policies
├── scenarios to ship.csv              # 7 pre-configured test scenarios
├── Implementation guidance & suggestions.csv  # Architecture recommendations for the engine
├── Useful utilities & solver components.csv   # Helper tools (replay engine, fuzzing, cost calculator)
├── Provider mapping (quick).csv       # AWS / GCP / Azure equivalents for multi-cloud support
└── Quick checklist.csv                # Comprehensive "did you include everything" checklist
```

All files are prefixed with `DSDS Canonical Catalogue - ` in their actual filenames.

## File details

### Component taxonomy

Defines ~110+ component types organized into categories:

| Category | Examples |
|---|---|
| Compute | APIs, Microservices, Sidecars, Serverless Functions, GPUs |
| Network & Edge | Load Balancers, CDNs, API Gateways, Service Mesh, Proxies |
| Storage & Data | Relational DBs, NoSQL, Object Storage, Caches, Search Engines |
| Messaging & Streaming | Queues, Pub/Sub, Kafka-like Streams, Event Bus |
| Orchestration & Control | Kubernetes, Service Discovery, Config Stores, CI/CD |
| Security & Identity | IAM, WAF, PKI, Vault, KMS, SIEM |
| Observability | Logging, Tracing, Metrics, Alerting, Dashboards |
| DevOps & Delivery | Feature Flags, Chaos Engineering, Policy-as-Code |
| Data Infrastructure | ETL, Streaming Analytics, Feature Stores, Model Serving |
| Real-time & Media | WebSockets, WebRTC, SFU/MCU, Transcoding |
| External Integration | Webhooks, SaaS Adapters, Payment Gateways |
| Consensus & Coordination | Etcd, Leader Election, Distributed Locks, Zookeeper |

### Component specification schema

Example YAML template showing how to define a component with:
- Metadata (id, type, provider, region)
- Resource configuration (CPU, memory, replicas)
- Timeouts, retries, and circuit breaker settings
- Telemetry and SLA targets
- Failure modes with triggers and severity

### Uniform component attributes

Every component supports: identification, resource config, lifecycle, dependencies, health checks, telemetry hooks, SLO targets, fault injection hooks, scaling policies, persistence model, and security context.

### Simulation primitives & events

Event types the engine can fire: `request_arrival`, `node_failure`, `network_partition`, `latency_spike`, `backlog_buildup`, `config_rollout`, `deployment`, `scale_event`, `db_failover`, `security_breach`, `storage_full`, and more. Includes workload profiles (spike, steady-state, diurnal, bursty tail) and both deterministic and probabilistic fault injection.

### Failure modes & propagation semantics

Critical failure patterns to model: cascading failures, backpressure, resource exhaustion, split-brain, stale reads, thundering herd, configuration drift, and security failures. Defines propagation rules for how failures spread across components.

### Patterns & anti-patterns

**23 patterns:** CQRS, Event Sourcing, Saga, Circuit Breaker, Bulkhead, Strangler, Sidecar, BFF, Retry with Exponential Backoff + Jitter, Blue/Green, Canary, Cache-aside, Write-through, Materialized Views, and more.

**8 anti-patterns:** Monolithic shared DB, synchronous RPC for long operations, unlimited retries, infinite TTL caches, over-sharding, single expensive cross-service transactions, blocking calls in event handlers.

### Example choreographies

Four pre-built scenarios with failure injection:
1. **Payment flow** — API through auth, orders DB, payment gateway, notifications
2. **Media upload & encoding** — Client through CDN, queue, transcoder, object store
3. **Live call (WebRTC SFU)** — Signaling, SFU, TURN relays with NAT exhaustion
4. **DB failover** — Primary crash, replica promotion, replication lag handling

### Metrics & SLIs

Default metrics to track in every simulation: latency percentiles (P50/P95/P99), throughput, availability, error rate, saturation, durability, consistency lag, cost, and recovery time (MTTR).

### Scenarios to ship

7 deterministic test scenarios ready to run:
1. Cache stampede after TTL expiry (1M keys)
2. DB primary crash during heavy writes
3. Network partition with cross-region writes (split-brain)
4. Auth provider outage cascading to dependent services
5. 10x traffic spike with serverless cold start penalty
6. Price surge with cost impact and auto-scale mitigation
7. Feature flag rollback failing halfway

### Provider mapping

Cloud equivalents for multi-cloud simulation across AWS, GCP, and Azure — covering compute, databases, storage, messaging, orchestration, secrets, monitoring, and CDN.

## How to use this catalogue

- **Building a new system model:** Start with the component taxonomy to pick your building blocks, use the specification schema to configure each one, and wire them together using patterns.
- **Testing resilience:** Pick from the pre-built scenarios or compose your own using simulation primitives and failure modes.
- **Validating correctness:** Define policies and invariants, run the simulation, and check the outputs for violations.
- **Multi-cloud planning:** Use the provider mapping to translate designs across AWS, GCP, and Azure.
- **Completeness check:** Run through the quick checklist to make sure nothing is missing from your design.
