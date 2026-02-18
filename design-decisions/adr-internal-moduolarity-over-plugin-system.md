# Generalizing the Simulation Engine into a Domain-Agnostic Framework

The user is asking a deep architectural question about generalizing the simulation engine into a **domain-agnostic framework**.

This is a **research/design question**, not an implementation task.

Let’s reason through it carefully.

---

## 1. Understanding the Current Engine

From the tickets and `ui.md`, the current architecture includes:

| Ticket      | Component             | Description                                                   |
| ----------- | --------------------- | ------------------------------------------------------------- |
| T-011       | SimulationEngine      | Main event loop (Discrete Event Simulation)                   |
| T-007       | MinHeap               | Priority queue for events                                     |
| T-002       | Event types           | REQUEST_GENERATED, REQUEST_ARRIVAL, PROCESSING_COMPLETE, etc. |
| T-004       | BigInt time utilities | Microsecond-precision time                                    |
| T-005       | SFC32 PRNG            | Deterministic randomness                                      |
| T-006       | Distribution sampler  | Sampling from statistical distributions                       |
| T-008       | G/G/c/K node model    | Queueing model                                                |
| T-009       | Workload generator    | Traffic generation                                            |
| T-010       | Routing table         | Network routing                                               |
| T-012       | Network edge modeling | Latency, loss, bandwidth                                      |
| T-013–T-016 | Failure + resilience  | Fault injection, cascade, circuit breakers                    |
| T-017       | Metrics collector     | Observability                                                 |
| T-018       | Request tracer        | Distributed tracing                                           |

---

## 2. Core Observation

The **core DES loop** is already general:

```text
while (queue not empty):
    event = pop earliest event
    advance clock
    dispatch event to handler
```

This loop has **no inherent knowledge** of distributed systems.

The domain-specific parts are:

* Event types
* Entity logic
* How nodes react to events

This means the engine *can absolutely* be generalized.

---

# The Core Insight

A Discrete Event Simulation (DES) engine is fundamentally just:

1. **Clock** (BigInt microseconds)
2. **Priority Queue** (events sorted by time)
3. **Event Loop** (pull → advance → dispatch → repeat)
4. **Scheduling Function** (handlers schedule future events)
5. **Deterministic PRNG**

Everything else — queues, networks, failures, metrics — is **domain logic layered on top**.

Right now, these concerns are partially mixed.

The goal is to draw a clean separation.

---

# Three-Layer Architecture

```
┌───────────────────────────────────────────────┐
│                DOMAIN MODULES                │
│  Queueing | Network | Failures | Resilience  │
│  Metrics  | Tracing | Your New Module       │
├───────────────────────────────────────────────┤
│                MODULE CONTRACT               │
│  SimulationModule                            │
│  SimContext                                  │
├───────────────────────────────────────────────┤
│                CORE ENGINE                   │
│  Clock | MinHeap | PRNG | Distributions      │
│  Event Loop                                  │
└───────────────────────────────────────────────┘
```

---

# What Is Truly Domain-Agnostic?

These tickets are already generic:

| Ticket | Component     | Why It’s Generic         |
| ------ | ------------- | ------------------------ |
| T-004  | BigInt time   | Pure time arithmetic     |
| T-005  | PRNG          | Deterministic randomness |
| T-006  | Distributions | Pure statistical math    |
| T-007  | MinHeap       | Priority queue           |

These primitives are required by:

* Traffic simulations
* Hospital queue models
* Network packet simulations
* Supply chain systems
* Economic simulations

They are not tied to distributed systems.

---

# What Becomes a Module?

All domain behavior becomes modules.

| Current Component | Becomes Module        | Owns Events               |
| ----------------- | --------------------- | ------------------------- |
| G/G/c/K Node      | `queueing-theory`     | ARRIVAL, SERVICE_COMPLETE |
| Workload          | `workload`            | REQUEST_GENERATED         |
| Network Edge      | `network-physics`     | PACKET_SENT, ARRIVED      |
| Failure           | `failure-injection`   | FAULT_ACTIVATE            |
| Resilience        | `resilience-patterns` | CIRCUIT_OPEN              |
| Metrics           | `metrics-collector`   | Observes all              |
| Tracer            | `request-tracer`      | Observes all              |

---

# The Module Contract

### Core Event

```ts
interface SimEvent {
  time: bigint;
  type: string;
  payload: unknown;
  entityId?: string;
}
```

### Simulation Context

```ts
interface SimContext {
  clock: bigint;

  schedule(event: SimEvent): void;
  scheduleAfter(delay: bigint, type: string, payload: unknown): void;

  random(): number;
  sample(dist: DistributionSpec): number;

  entities: EntityStore;

  emit(metric: MetricEvent): void;
  config: Record<string, unknown>;
}
```

### Module Interface

```ts
interface SimulationModule {
  name: string;
  eventTypes: string[];

  init(ctx: SimContext): void;
  handle(event: SimEvent, ctx: SimContext): void;
  collect(ctx: SimContext): unknown;
}
```

### Engine Interface

```ts
interface SimulationEngine {
  register(module: SimulationModule): void;
  run(config: EngineConfig): SimulationResult;
}
```

---

# Entity Store (Shared State)

```ts
interface EntityStore {
  create<T>(kind: string, id: string, data: T): void;
  get<T>(kind: string, id: string): T | undefined;
  update<T>(kind: string, id: string, patch: Partial<T>): void;
  delete(kind: string, id: string): void;
  list<T>(kind: string): Map<string, T>;
  query<T>(kind: string, predicate: (entity: T) => boolean): T[];
}
```

Ownership model example:

```
queueing-theory   OWNS  "node"
network-physics   OWNS  "edge"
failure-injection READS "node", WRITES status
metrics           READS everything
```

---

# Example: Same Engine, Different Domains

## Distributed Systems

```ts
engine.register(queueingTheoryModule);
engine.register(networkPhysicsModule);
engine.register(workloadModule);
engine.register(failureInjectionModule);
engine.register(resilienceModule);
engine.register(metricsCollectorModule);
engine.register(requestTracerModule);

engine.run(topologyConfig);
```

## Hospital Simulation

```ts
engine.register(patientArrivalModule);
engine.register(triageModule);
engine.register(treatmentModule);
engine.register(bedCapacityModule);
engine.register(metricsCollectorModule);
```

## Packet Network Simulation

```ts
engine.register(packetGeneratorModule);
engine.register(routerModule);
engine.register(linkModule);
engine.register(congestionControlModule);
engine.register(metricsCollectorModule);
```

## Supply Chain Simulation

```ts
engine.register(orderGeneratorModule);
engine.register(warehouseModule);
engine.register(transportModule);
engine.register(supplierModule);
engine.register(metricsCollectorModule);
```

Same engine. Different modules.

---

# What Changes in Current Tickets?

| Current     | Becomes              | Change                        |
| ----------- | -------------------- | ----------------------------- |
| T-004–T-007 | Core primitives      | No change                     |
| T-002       | Core event interface | Move event types into modules |
| T-011       | Pure engine loop     | Add module registry           |
| T-008+      | Modules              | Wrap in module interface      |

This is a **structural refactor**, not a functional rewrite.

---

# Two Levels of Generalization

### Level 1 — Internal Modularity (Recommended Now)

* Modules exist conceptually
* Single package
* Clean separation
* No plugin runtime

Low complexity. High architectural clarity.

---

### Level 2 — Plugin Runtime (Future)

* Engine is standalone package
* Modules are external packages
* Versioned contracts
* Plugin discovery

Higher complexity. Separate project.

---

# Recommendation

Implement **Level 1 now**:

* Introduce module interface
* Add EntityStore abstraction
* Refactor engine to dispatch by event type
* Move domain logic into modules

You can extract into a plugin system later with minimal changes.