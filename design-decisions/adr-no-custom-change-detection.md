# Change Detection & Reactivity Between Engine and UI

The question is about the **change detection / reactivity mechanism** between the simulation engine and the UI.

This is an excellent architectural question.

There are actually **two completely different state flows** involved — and they require different solutions.

---

# Two Distinct State Flows

## 1️⃣ BUILD Phase

**Topology editing and configuration**

```
User edits → Topology state changes → UI updates
```

* Canvas
* Inspector panel
* JSON viewer
* Imported/exported topology

## 2️⃣ SIMULATE Phase

**Engine produces simulation data**

```
Engine (Web Worker) → Snapshots → UI visualization
```

These are fundamentally different problems.

---

# Flow 1: BUILD Phase (Topology Reactivity)

This is handled by **Zustand (T-043)**.

### Architecture

```
User action
   ↓
Zustand store mutation
   ↓
Selector subscriptions fire
   ↓
React components re-render
```

No mutation observer is needed.

---

## Example: Zustand Store

```ts
const useTopologyStore = create<TopologyState>((set, get) => ({
  nodes: new Map(),
  edges: new Map(),

  updateNode: (id, patch) => set(state => {
    const updated = new Map(state.nodes);
    updated.set(id, { ...updated.get(id)!, ...patch });
    return { nodes: updated };
  }),
}));
```

---

## Components Interacting with the Same Store

### Inspector (writes)

```tsx
function InspectorPanel({ nodeId }) {
  const updateNode = useTopologyStore(s => s.updateNode);

  return (
    <input
      onChange={e =>
        updateNode(nodeId, { workers: +e.target.value })
      }
    />
  );
}
```

### JSON Viewer (reads)

```tsx
function TopologyViewer() {
  const nodes = useTopologyStore(s => s.nodes);

  return <TreeView data={nodes} />;
}
```

### Canvas (reads derived state)

```tsx
function Canvas() {
  const rfNodes = useTopologyStore(s => s.rfNodes);

  return <ReactFlow nodes={rfNodes} />;
}
```

---

## How Zustand Reactivity Works

Each component subscribes to a **selector**:

```ts
s => s.nodes
```

After every `set()` call:

1. Zustand runs the selector.
2. Performs **shallow equality** on the result.
3. If changed → component re-renders.
4. If not → nothing happens.

### Key Properties

| Property      | Behavior                  |
| ------------- | ------------------------- |
| Detection     | Triggered on `set()`      |
| Granularity   | Per-selector subscription |
| Polling       | None (pure push)          |
| Comparison    | Shallow equality          |
| Outside React | Store usable anywhere     |

---

## Why Not a Mutation Observer?

Because we **control all writes**.

Every mutation goes through:

* `updateNode()`
* `addEdge()`
* `deleteNode()`

When you control the mutation path, you don't need to observe changes — you notify on write.

---

# Flow 2: SIMULATE Phase (Engine → UI)

This is fundamentally different.

The engine runs inside a **Web Worker** and communicates through `postMessage`.

---

## Thread Boundary

```
┌─────────────────────┐         postMessage         ┌──────────────────────┐
│    Web Worker        │ ──────────────────────────► │    Main Thread        │
│                      │                              │                      │
│  SimulationEngine    │                              │  useSimulation hook   │
│  Runs event loop     │                              │                      │
│                      │                              │  setState() →        │
│  Emits SNAPSHOT      │                              │  React re-render     │
│  Emits PROGRESS      │                              │                      │
│  Emits COMPLETE      │                              │                      │
└─────────────────────┘                              └──────────────────────┘
```

The engine knows nothing about:

* React
* Zustand
* The DOM

It only emits structured messages.

---

# The Bridge: `useSimulation` (T-026)

```ts
function useSimulation() {
  const [snapshots, setSnapshots] = useState([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const worker = new Worker("simulation.worker.ts");

    worker.onmessage = (e) => {
      switch (e.data.type) {
        case "SNAPSHOT":
          setSnapshots(prev => [...prev, e.data.payload]);
          break;

        case "COMPLETE":
          setStatus("complete");
          break;

        case "PROGRESS":
          setProgress(e.data.payload.percent);
          break;
      }
    };

    return () => worker.terminate();
  }, []);
}
```

The `setState()` calls here **are the change detection**.

React handles the rest.

---

# Transforming Snapshots → Visual State

Handled by `useLiveVisualization` (T-027):

```ts
function useLiveVisualization(snapshots) {
  const latest = snapshots[snapshots.length - 1];

  const nodeStyles = useMemo(() => {
    if (!latest) return {};

    const styles = {};

    for (const [id, metrics] of Object.entries(latest.nodes)) {
      styles[id] = {
        backgroundColor: utilizationToColor(metrics.utilization),
        queueFill: metrics.queueLength / metrics.queueCapacity,
        label: `${(metrics.utilization * 100).toFixed(0)}% · ${metrics.rps} rps`,
      };
    }

    return styles;
  }, [latest]);

  return { nodeStyles };
}
```

This recomputes only when the **latest snapshot changes**.

---

# Answering the Core Questions

## How does the UI know something changed?

It depends on the state:

| State Type        | Mechanism                         |
| ----------------- | --------------------------------- |
| Topology          | Zustand selector subscriptions    |
| Simulation output | `worker.onmessage` → `setState()` |

---

## Subscription model, event emitter, or reactive store?

Both — but in different places.

* **Reactive store (Zustand)** → Topology editing
* **Event emitter (postMessage)** → Simulation output

---

## Is there a centralized state container?

Yes.

* `useTopologyStore` → topology state
* `useSimulation` → simulation output state

Both ultimately feed into React’s render cycle.

---

## Are we observing structural graph mutations?

No.

We never observe.

We control all writes.

Observation is only needed when mutations happen outside your control.

---

# The Full System Picture

```
                 BUILD PHASE
┌─────────────────────────────────────┐
│  useTopologyStore (Zustand)         │
│                                     │
│  Selector subscriptions notify UI   │
└───────────────┬─────────────────────┘
                │
          exportTopology()
                │
                ▼

                SIMULATE PHASE
┌─────────────────────────────────────┐
│  Web Worker (SimulationEngine)     │
│                                     │
│  Emits:                             │
│   • SNAPSHOT                        │
│   • PROGRESS                        │
│   • COMPLETE                        │
└───────────────┬─────────────────────┘
                │
        worker.onmessage
                │
                ▼
┌─────────────────────────────────────┐
│  useSimulation (React hook)        │
│                                     │
│  setState() → React re-render       │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  useLiveVisualization              │
│                                     │
│  snapshot → nodeStyles             │
│  snapshot → edgeStyles             │
│  Canvas consumes styles            │
└─────────────────────────────────────┘
```

---

# Final Summary

* No mutation observer is required.
* BUILD-phase reactivity is handled by **Zustand subscriptions**.
* SIMULATE-phase data flow is handled by **Web Worker `postMessage`**.
* Both ultimately trigger **React’s normal re-render cycle**.
* The engine and UI are fully decoupled.
* The `postMessage` protocol is the only contract boundary.

Clean separation. No hidden reactivity. No polling. No structural observation.

Just controlled writes and explicit message passing.