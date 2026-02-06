# System Design & Discrete-Event Simulation: A First Principles Approach

# PART 1: FOUNDATIONS — Understanding System Diagrams

---

## Chapter 1: What Are We Even Looking At?

### 1.1 The Universal Problem

Before we draw a single box or arrow, let's understand WHY we need diagrams at all.

**The Problem:** You want to build something that handles many things happening at once.

```
Examples across domains:

    🏥 Hospital         → Patients arrive, get treated, leave
    🏭 Factory          → Raw materials enter, get processed, products exit
    🛒 Online Store     → Customers browse, order, receive goods
    🌐 Website          → Requests arrive, get processed, responses sent
    🚗 Traffic System   → Cars enter intersections, wait, pass through
```

**The Core Challenge:** How do you THINK about systems with:
- Multiple things happening simultaneously?
- Unpredictable arrivals?
- Limited resources?
- Things that can break?

**The Answer:** We draw pictures. But not just any pictures—structured diagrams that capture the ESSENCE of how things flow through a system.

---

### 1.2 The Simplest Possible System

Let's start with the absolute minimum:

```
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │     SOMETHING      ───────────▶      SOMETHING ELSE         │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

That's it. That's the seed of every system diagram ever drawn.

**In words:** "Something goes from one place to another."

**Examples:**
- Water flows from tank A to tank B
- A customer walks from entrance to checkout
- A request travels from browser to server
- A car drives from point A to point B

**Two fundamental elements emerge:**
1. **PLACES** where things exist or happen (the boxes)
2. **PATHS** along which things travel (the arrows)

We call these **NODES** and **EDGES**.

---

## Chapter 2: NODES — The Places Where Things Happen

### 2.1 What IS a Node?

**Definition:** A node is a bounded location where something EXISTS, WAITS, or is TRANSFORMED.

Think of it as a "room" in your system. Things enter, something happens (or doesn't), and things leave.

```
    ┌───────────────────────────────────────┐
    │                                       │
    │              NODE                     │
    │                                       │
    │    • Has an INSIDE (things can be     │
    │      inside it)                       │
    │    • Has a BOUNDARY (finite space)    │
    │    • Has BEHAVIOR (what happens       │
    │      to things inside)                │
    │                                       │
    └───────────────────────────────────────┘
```

### 2.2 The Three Questions Every Node Answers

When you see a node, ask:

```
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │   1. WHAT enters this node?                                 │
    │      (The INPUT)                                            │
    │                                                             │
    │   2. WHAT happens inside this node?                         │
    │      (The TRANSFORMATION)                                   │
    │                                                             │
    │   3. WHAT leaves this node?                                 │
    │      (The OUTPUT)                                           │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

**Example: A Coffee Machine Node**

```
         INPUT                TRANSFORMATION              OUTPUT
           │                       │                        │
           ▼                       ▼                        ▼
    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
    │             │         │             │         │             │
    │  Water +    │  ────▶  │   Brewing   │  ────▶  │   Coffee    │
    │  Coffee     │         │   Process   │         │             │
    │  Grounds    │         │             │         │             │
    │             │         │  (takes     │         │             │
    │             │         │   3 min)    │         │             │
    └─────────────┘         └─────────────┘         └─────────────┘
```

### 2.3 Node Properties: The Essential Characteristics

Every node has these fundamental properties:

```
    NODE ANATOMY
    ════════════
    
    ┌─────────────────────────────────────────────────────────────┐
    │                         NODE                                │
    │  ┌───────────────────────────────────────────────────────┐  │
    │  │                                                       │  │
    │  │   IDENTITY          What is this node called?         │  │
    │  │   ─────────         "coffee-machine-01"               │  │
    │  │                                                       │  │
    │  │   CAPACITY          How much can fit inside?          │  │
    │  │   ────────          "10 cups at a time"               │  │
    │  │                                                       │  │
    │  │   PROCESSING        How fast does it work?            │  │
    │  │   ──────────        "3 minutes per cup"               │  │
    │  │                                                       │  │
    │  │   AVAILABILITY      Is it working right now?          │  │
    │  │   ────────────      "Yes / No / Degraded"             │  │
    │  │                                                       │  │
    │  │   BEHAVIOR          What rules govern it?             │  │
    │  │   ────────          "First-in-first-out"              │  │
    │  │                                                       │  │
    │  └───────────────────────────────────────────────────────┘  │
    └─────────────────────────────────────────────────────────────┘
```

### 2.4 Node Types: A Taxonomy

Not all nodes are the same. They differ in WHAT they do:

```
    NODE TYPE TAXONOMY
    ══════════════════
    
    
    1. SOURCE NODES (Origins)
    ─────────────────────────
    • Generate or introduce things INTO the system
    • Have no inputs, only outputs
    • Example: "Customers arriving", "Requests from internet"
    
        ┌──────────┐
        │  SOURCE  │ ────────▶
        │    ◉     │
        └──────────┘
    
    
    2. PROCESSING NODES (Transformers)
    ──────────────────────────────────
    • Take inputs, do work, produce outputs
    • The "workers" of your system
    • Example: "Web server", "Barista", "Assembly line"
    
             ┌──────────────┐
        ────▶│  PROCESSOR   │────▶
             │      ⚙       │
             └──────────────┘
    
    
    3. STORAGE NODES (Holders)
    ──────────────────────────
    • Hold things without transforming them
    • Things enter, wait, then leave unchanged
    • Example: "Database", "Warehouse", "Waiting room"
    
             ┌──────────────┐
        ────▶│   STORAGE    │────▶
             │      ▤       │
             └──────────────┘
    
    
    4. ROUTING NODES (Directors)
    ────────────────────────────
    • Decide WHERE things go next
    • Split one input into multiple possible outputs
    • Example: "Load balancer", "Traffic light", "Triage nurse"
    
             ┌──────────────┐────▶ Path A
        ────▶│   ROUTER     │────▶ Path B
             │      ◇       │────▶ Path C
             └──────────────┘
    
    
    5. SINK NODES (Endpoints)
    ─────────────────────────
    • Things leave the system here
    • Have inputs, no outputs
    • Example: "Completed orders", "Satisfied customers"
    
             ┌──────────────┐
        ────▶│    SINK      │
             │      ◎       │
             └──────────────┘
    
    
    6. COMPOSITE NODES (Containers)
    ───────────────────────────────
    • Contain OTHER nodes inside them
    • Represent subsystems
    • Example: "The kitchen" (contains stove, sink, fridge)
    
             ┌──────────────────────────┐
        ────▶│   COMPOSITE              │────▶
             │  ┌────┐  ┌────┐  ┌────┐  │
             │  │ A  │─▶│ B  │─▶│ C  │  │
             │  └────┘  └────┘  └────┘  │
             └──────────────────────────┘
```

### 2.5 Concrete Examples of Node Types

Let's ground this in reality:

```
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                         │
    │   DOMAIN          SOURCE          PROCESSOR       STORAGE      SINK     │
    │   ══════          ══════          ═════════       ═══════      ════     │
    │                                                                         │
    │   Hospital        Emergency       Operating       Waiting      Discharged│
    │                   entrance        room            room         patient   │
    │                                                                         │
    │   E-commerce      Website         Order           Product      Delivered │
    │                   visitors        processing      warehouse    package   │
    │                                                                         │
    │   Web System      Internet        API             Database     Response  │
    │                   users           server          cache        sent      │
    │                                                                         │
    │   Factory         Raw             Assembly        Inventory    Shipped   │
    │                   materials       line                         product   │
    │                                                                         │
    │   Restaurant      Hungry          Kitchen         Pantry       Fed       │
    │                   customers                                    customer  │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
```

### 2.6 Node States: What Condition Is It In?

At any moment, a node is in a STATE:

```
    NODE STATES
    ═══════════
    
    ┌─────────────┐
    │   IDLE      │     Nothing inside, waiting for work
    │    😴       │     
    └─────────────┘
          │
          ▼ (something arrives)
    ┌─────────────┐
    │   BUSY      │     Processing something
    │    🔧       │     
    └─────────────┘
          │
          ▼ (too much arrives)
    ┌─────────────┐
    │   QUEUED    │     Working + things waiting
    │   🔧📋      │     
    └─────────────┘
          │
          ▼ (queue overflows)
    ┌─────────────┐
    │  SATURATED  │     Full, rejecting new arrivals
    │    🚫       │     
    └─────────────┘
          │
          ▼ (something breaks)
    ┌─────────────┐
    │   FAILED    │     Not working at all
    │    💀       │     
    └─────────────┘
```

### 2.7 Visual Exercise: Identify the Nodes

Look at this scenario and identify the nodes:

```
    SCENARIO: Online Food Ordering
    ═══════════════════════════════
    
    "A customer opens an app, browses restaurants, places an order,
     the kitchen prepares the food, a driver picks it up and delivers it."
    
    
    YOUR TASK: What are the NODES?
    
    
    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │         │    │         │    │         │    │         │    │         │
    │    ?    │───▶│    ?    │───▶│    ?    │───▶│    ?    │───▶│    ?    │
    │         │    │         │    │         │    │         │    │         │
    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
    
      SOURCE       PROCESSOR      PROCESSOR      PROCESSOR       SINK
```

**Answer:**

```
    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │Customer │    │  Order  │    │ Kitchen │    │ Driver  │    │Delivered│
    │  (App)  │───▶│ System  │───▶│         │───▶│         │───▶│  Food   │
    │         │    │         │    │         │    │         │    │         │
    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
    
      SOURCE       PROCESSOR      PROCESSOR      PROCESSOR       SINK
      (origin)     (receives      (prepares      (transports)   (endpoint)
                    order)         food)
```

---

## Chapter 3: EDGES — The Paths Between Places

### 3.1 What IS an Edge?

**Definition:** An edge is a CONNECTION between two nodes that represents HOW things flow from one place to another.

```
    ┌──────────┐                                    ┌──────────┐
    │          │                                    │          │
    │  NODE A  │ ══════════════════════════════════▶│  NODE B  │
    │          │              EDGE                  │          │
    └──────────┘                                    └──────────┘
    
    
    The edge answers: "How does something get from A to B?"
```

### 3.2 The Three Questions Every Edge Answers

```
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │   1. WHAT travels along this edge?                          │
    │      (The PAYLOAD)                                          │
    │                                                             │
    │   2. HOW does it travel?                                    │
    │      (The MECHANISM)                                        │
    │                                                             │
    │   3. WHAT affects the journey?                              │
    │      (The CONSTRAINTS)                                      │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

### 3.3 Edge Properties: The Essential Characteristics

```
    EDGE ANATOMY
    ════════════
    
    NODE A ═══════════════════════════════════════════════▶ NODE B
                              │
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    │   DIRECTION       │     A → B (one-way)
                    │   ─────────       │     A ↔ B (two-way)
                    │                   │
                    │   CAPACITY        │     How much can flow?
                    │   ────────        │     "100 items/second"
                    │                   │
                    │   LATENCY         │     How long to traverse?
                    │   ───────         │     "50 milliseconds"
                    │                   │
                    │   RELIABILITY     │     Does it always work?
                    │   ───────────     │     "99.9% success"
                    │                   │
                    │   COST            │     What does it take?
                    │   ────            │     "Energy, money, time"
                    │                   │
                    └───────────────────┘
```

### 3.4 Edge Types: A Taxonomy

```
    EDGE TYPE TAXONOMY
    ══════════════════
    
    
    1. SYNCHRONOUS EDGES (Wait for response)
    ────────────────────────────────────────
    • Sender WAITS until receiver responds
    • Like a phone call: you wait for the answer
    • Example: HTTP request-response, function call
    
        A ════════════▶ B
          ◀════════════
             (wait)
    
    
    2. ASYNCHRONOUS EDGES (Fire and forget)
    ───────────────────────────────────────
    • Sender does NOT wait for response
    • Like sending a letter: you continue with your day
    • Example: Message queue, email, event bus
    
        A ════════════▶ B
          (don't wait)
    
    
    3. STREAMING EDGES (Continuous flow)
    ────────────────────────────────────
    • Data flows continuously, not in discrete chunks
    • Like a water pipe: always flowing
    • Example: Video stream, sensor data, log stream
    
        A ═══════════════════════════▶ B
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
               (continuous flow)
    
    
    4. CONDITIONAL EDGES (Sometimes taken)
    ──────────────────────────────────────
    • Flow only happens IF a condition is met
    • Like a gate: opens only sometimes
    • Example: Error path, overflow path
    
        A ══════════════════════════▶ B
              [if condition=true]
    
    
    5. WEIGHTED EDGES (Proportional distribution)
    ─────────────────────────────────────────────
    • Flow is split according to weights
    • Like a river fork: 70% goes left, 30% right
    • Example: Load balancer distribution
    
        A ═══════════════════════════▶ B (70%)
          ═══════════════════════════▶ C (30%)
```

### 3.5 Edge Physics: What Happens in Transit?

Things don't teleport between nodes. The edge represents REAL constraints:

```
    WHAT HAPPENS ON THE WIRE
    ════════════════════════
    
    NODE A                                                    NODE B
       │                                                         │
       │  ┌─────────────────────────────────────────────────┐   │
       │  │                                                 │   │
       └──│  1. SERIALIZATION                               │───┘
          │     Convert to transmittable format             │
          │     (Time: ~1ms)                                │
          │                                                 │
          │  2. TRANSMISSION                                │
          │     Physically send the data                    │
          │     (Time: depends on size & bandwidth)         │
          │                                                 │
          │  3. PROPAGATION                                 │
          │     Signal travels through medium               │
          │     (Time: speed of light × distance)           │
          │                                                 │
          │  4. QUEUING                                     │
          │     Wait if the path is congested               │
          │     (Time: depends on traffic)                  │
          │                                                 │
          │  5. DESERIALIZATION                             │
          │     Convert back to usable format               │
          │     (Time: ~1ms)                                │
          │                                                 │
          └─────────────────────────────────────────────────┘
    
    
    TOTAL EDGE LATENCY = Serialization + Transmission + Propagation 
                        + Queuing + Deserialization
```

### 3.6 The Latency Formula

For network edges specifically:

```
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │                    L = P + S/B + Q                          │
    │                                                             │
    │   Where:                                                    │
    │   • L = Total latency (time to traverse edge)              │
    │   • P = Propagation delay (distance ÷ speed of light)      │
    │   • S = Size of data being sent (bytes)                    │
    │   • B = Bandwidth of the connection (bytes/second)         │
    │   • Q = Queuing delay (waiting in line)                    │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
    
    
    EXAMPLE:
    ────────
    
    Sending 1MB from New York to London:
    
    • P = 3,500 miles ÷ 186,000 miles/sec = ~19ms (propagation)
    • S/B = 1,000,000 bytes ÷ 12,500,000 bytes/sec = ~80ms (transmission @ 100Mbps)
    • Q = ~5ms (typical internet queuing)
    
    Total: L = 19 + 80 + 5 = ~104ms
```

### 3.7 Edge Failure Modes

Edges can fail in various ways:

```
    EDGE FAILURE MODES
    ══════════════════
    
    1. COMPLETE FAILURE (0% success)
    ────────────────────────────────
    
        A ════════╳═══════▶ B
                  │
            Connection dead
    
    
    2. PARTIAL FAILURE (some % lost)
    ────────────────────────────────
    
        A ════════════════▶ B
              │    │
              ✓    ╳
              │    │
           90% ok  10% lost
    
    
    3. LATENCY SPIKE (sudden slowdown)
    ──────────────────────────────────
    
        Normal:    A ═══▶ B  (50ms)
        Spike:     A ═══════════════════════▶ B  (2000ms)
    
    
    4. BANDWIDTH DEGRADATION (reduced capacity)
    ───────────────────────────────────────────
    
        Normal:    A ═══════════▶ B  (1000 items/sec)
        Degraded:  A ═══▶ B          (100 items/sec)
    
    
    5. CORRUPTION (data damaged in transit)
    ───────────────────────────────────────
    
        Sent:      A ═══════════▶ "Hello World"
        Received:  "He$lo W@rld" ═══════════▶ B
```

### 3.8 Concrete Examples of Edge Types

```
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                         │
    │   EDGE TYPE         REAL EXAMPLE              CHARACTERISTICS           │
    │   ═════════         ════════════              ═══════════════           │
    │                                                                         │
    │   Synchronous       HTTP API call             Wait for response         │
    │                     Phone call                Blocking                  │
    │                     Bank transaction          Guaranteed delivery       │
    │                                                                         │
    │   Asynchronous      Email                     Non-blocking              │
    │                     SMS message               Eventually delivered      │
    │                     Kafka message             Decoupled                 │
    │                                                                         │
    │   Streaming         Video call                Continuous                │
    │                     Stock ticker              Real-time                 │
    │                     IoT sensor feed           High volume               │
    │                                                                         │
    │   Conditional       Error handler path        Only when error           │
    │                     Retry logic               Only when failure         │
    │                     Fraud detection           Only when suspicious      │
    │                                                                         │
    │   Weighted          Load balancer             70/30 split               │
    │                     A/B testing               50/50 split               │
    │                     Canary deployment         95/5 split                │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
```

### 3.9 Visual Vocabulary: How Edges Are Drawn

Different arrow styles convey different meanings:

```
    VISUAL VOCABULARY FOR EDGES
    ═══════════════════════════
    
    
    SYNCHRONOUS (solid line, filled arrow)
    ──────────────────────────────────────
        A ─────────────────────────────────▶ B
    
    
    ASYNCHRONOUS (dashed line)
    ──────────────────────────
        A ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ▷ B
    
    
    BIDIRECTIONAL (arrows on both ends)
    ────────────────────────────────────
        A ◀────────────────────────────────▶ B
    
    
    STREAMING (wavy line)
    ─────────────────────
        A ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿▶ B
    
    
    CONDITIONAL (diamond or label)
    ──────────────────────────────
        A ───────────────◇───────────────▶ B
                     [if error]
    
    
    HIGH VOLUME (thick line)
    ────────────────────────
        A ═══════════════════════════════▶ B
    
    
    LOW RELIABILITY (dotted line)
    ─────────────────────────────
        A ·······························▷ B
```

---

## Chapter 4: COMBINING NODES AND EDGES — Building Systems

### 4.1 The Emergence of Structure

Individual nodes and edges are simple. STRUCTURE emerges when we combine them:

```
    INDIVIDUAL ELEMENTS                    COMBINED STRUCTURE
    ════════════════════                   ══════════════════
    
    [Node A]                               [Node A]───▶[Node B]
    [Node B]                                    │
    [Node C]               ─────▶              ▼
    [Edge 1]                               [Node C]───▶[Node D]
    [Edge 2]
    [Edge 3]
    [Edge 4]
    
    
    Separate parts have                    Combined parts have
    no meaning alone                       EMERGENT BEHAVIOR
```

### 4.2 Basic Patterns: The Building Blocks

Just as letters form words, nodes and edges form PATTERNS:

```
    PATTERN 1: SEQUENCE (Pipeline)
    ═══════════════════════════════
    
    Things flow through stages in order.
    
        A ───▶ B ───▶ C ───▶ D
    
    Examples:
    • Assembly line
    • HTTP request → Server → Database → Response
    • Order → Payment → Fulfillment → Delivery
    
    
    PATTERN 2: FORK (Fan-out)
    ═════════════════════════
    
    One input goes to multiple outputs.
    
              ┌───▶ B
              │
        A ────┼───▶ C
              │
              └───▶ D
    
    Examples:
    • Notification sent to email AND SMS AND push
    • Load balancer distributing to servers
    • Event published to multiple subscribers
    
    
    PATTERN 3: JOIN (Fan-in)
    ════════════════════════
    
    Multiple inputs merge into one output.
    
        A ────┐
              │
        B ────┼───▶ D
              │
        C ────┘
    
    Examples:
    • Aggregating data from multiple sources
    • Collecting votes from multiple users
    • Merging results from parallel workers
    
    
    PATTERN 4: BRANCH (Decision)
    ════════════════════════════
    
    Input goes to ONE of multiple outputs based on condition.
    
              ┌───▶ B (if condition X)
              │
        A ────◇
              │
              └───▶ C (if condition Y)
    
    Examples:
    • Valid order → Fulfillment, Invalid → Rejection
    • Premium user → Fast path, Free user → Slow path
    • Success → Continue, Failure → Error handler
    
    
    PATTERN 5: LOOP (Cycle)
    ═══════════════════════
    
    Output feeds back to input.
    
        ┌──────────────────┐
        │                  │
        ▼                  │
        A ───▶ B ───▶ C ───┘
    
    Examples:
    • Retry loop (failed → retry → failed → retry...)
    • Feedback loop (output influences input)
    • Iterative processing (refine until done)
    
    
    PATTERN 6: PARALLEL (Concurrent)
    ════════════════════════════════
    
    Multiple paths process simultaneously.
    
              ┌───▶ B ───┐
              │          │
        A ────┤          ├───▶ E
              │          │
              └───▶ C ───┘
              │          │
              └───▶ D ───┘
    
    Examples:
    • Map-reduce: split work, process in parallel, merge
    • Parallel API calls to different services
    • Multi-threaded processing
```

### 4.3 Building a Real System: Step by Step

Let's build an online store system incrementally:

**Step 1: The Simplest Version**

```
    ┌──────────┐         ┌──────────┐
    │ Customer │ ───────▶│  Store   │
    └──────────┘         └──────────┘
    
    "Customer interacts with store"
```

**Step 2: Separate the Store's Responsibilities**

```
    ┌──────────┐         ┌──────────┐         ┌──────────┐
    │ Customer │ ───────▶│   Web    │ ───────▶│ Database │
    └──────────┘         │  Server  │         └──────────┘
                         └──────────┘
    
    "Web server handles requests, database stores data"
```

**Step 3: Add Specialization**

```
    ┌──────────┐         ┌──────────┐         ┌──────────┐
    │ Customer │ ───────▶│   Web    │ ───────▶│ Product  │
    └──────────┘         │  Server  │         │    DB    │
                         └────┬─────┘         └──────────┘
                              │
                              │               ┌──────────┐
                              └──────────────▶│  Order   │
                                              │    DB    │
                                              └──────────┘
    
    "Different databases for different data"
```

**Step 4: Add Services**

```
                                              ┌──────────┐
                                         ┌───▶│ Product  │
                                         │    │ Service  │
    ┌──────────┐         ┌──────────┐    │    └────┬─────┘
    │ Customer │ ───────▶│   API    │────┤         │
    └──────────┘         │ Gateway  │    │         ▼
                         └──────────┘    │    ┌──────────┐
                                         │    │ Product  │
                                         │    │    DB    │
                                         │    └──────────┘
                                         │
                                         │    ┌──────────┐
                                         └───▶│  Order   │
                                              │ Service  │
                                              └────┬─────┘
                                                   │
                                                   ▼
                                              ┌──────────┐
                                              │  Order   │
                                              │    DB    │
                                              └──────────┘
    
    "Services encapsulate business logic"
```

**Step 5: Add Supporting Infrastructure**

```
                         ┌──────────┐
                         │   CDN    │
                         └────┬─────┘
                              │
                              ▼
    ┌──────────┐         ┌──────────┐         ┌──────────┐
    │ Customer │ ───────▶│   Load   │────────▶│   API    │
    └──────────┘         │ Balancer │         │ Gateway  │
                         └──────────┘         └────┬─────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                              ▼                    ▼                    ▼
                         ┌─────────┐         ┌─────────┐         ┌─────────┐
                         │ Product │         │  Order  │         │  User   │
                         │ Service │         │ Service │         │ Service │
                         └────┬────┘         └────┬────┘         └────┬────┘
                              │                   │                    │
                         ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
                         ▼         ▼         ▼         ▼         ▼         ▼
                    ┌────────┐ ┌───────┐ ┌────────┐ ┌───────┐ ┌────────┐ ┌───────┐
                    │Product │ │ Cache │ │ Order  │ │ Queue │ │  User  │ │ Cache │
                    │   DB   │ │       │ │   DB   │ │       │ │   DB   │ │       │
                    └────────┘ └───────┘ └────────┘ └───────┘ └────────┘ └───────┘
    
    "Full system with caching, load balancing, and async processing"
```

### 4.4 Naming Conventions and Labels

Clarity comes from consistent naming:

```
    NAMING CONVENTIONS
    ══════════════════
    
    NODES:
    ──────
    • Use nouns: "Order Service" not "Process Orders"
    • Be specific: "PostgreSQL-Orders" not just "Database"
    • Include version if relevant: "API-v2"
    • Use consistent casing: kebab-case (order-service) or PascalCase (OrderService)
    
    
    EDGES:
    ──────
    • Label with the ACTION: "HTTP GET /products"
    • Include protocol: "gRPC", "HTTP/2", "WebSocket"
    • Show direction: "writes to", "reads from", "subscribes to"
    • Indicate sync/async: "(async)" or "(blocking)"
    
    
    EXAMPLE:
    ────────
    
                    HTTP POST /orders
    ┌─────────────┐ ──────────────────▶ ┌─────────────────┐
    │ API Gateway │                     │  Order Service  │
    │   (nginx)   │ ◀────────────────── │    (Go 1.21)    │
    └─────────────┘   JSON Response     └────────┬────────┘
                                                 │
                                     Kafka publish (async)
                                     "orders.created"
                                                 │
                                                 ▼
                                        ┌───────────────┐
                                        │ Notification  │
                                        │    Service    │
                                        └───────────────┘
```

### 4.5 Chapter Summary: The Foundation

```
    WHAT YOU NOW UNDERSTAND
    ═══════════════════════
    
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │   NODES                                                     │
    │   • Places where things exist, wait, or transform           │
    │   • Have: identity, capacity, processing speed, state       │
    │   • Types: source, processor, storage, router, sink         │
    │                                                             │
    │   EDGES                                                     │
    │   • Connections that show how things flow                   │
    │   • Have: direction, capacity, latency, reliability         │
    │   • Types: sync, async, streaming, conditional, weighted    │
    │                                                             │
    │   PATTERNS                                                  │
    │   • Sequence (pipeline)                                     │
    │   • Fork (fan-out) and Join (fan-in)                       │
    │   • Branch (decision) and Loop (cycle)                     │
    │   • Parallel (concurrent)                                   │
    │                                                             │
    │   STRUCTURE                                                 │
    │   • Emerges from combining nodes and edges                  │
    │   • Built incrementally from simple to complex              │
    │   • Reveals system behavior and bottlenecks                 │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

---

## Chapter 5: From Static Diagrams to Dynamic Behavior

### 5.1 The Limitation of Static Diagrams

We've built beautiful diagrams, but they're FROZEN. They show structure, not behavior.

```
    STATIC DIAGRAM (What we have)
    ═════════════════════════════
    
        A ───▶ B ───▶ C
    
    This tells us:
    ✓ Things flow from A to B to C
    ✓ A connects to B, B connects to C
    
    This does NOT tell us:
    ✗ How FAST do things flow?
    ✗ What happens when TOO MANY things arrive?
    ✗ What happens when B breaks?
    ✗ How LONG does C take to process?
    ✗ Can the system handle 1000 requests/second?
```

### 5.2 The Questions We Need to Answer

```
    OPERATIONAL QUESTIONS
    ═════════════════════
    
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │   CAPACITY                                                  │
    │   "Can this system handle 10,000 users?"                   │
    │                                                             │
    │   LATENCY                                                   │
    │   "How long will a request take end-to-end?"               │
    │                                                             │
    │   BOTTLENECKS                                               │
    │   "Which component will fail first under load?"            │
    │                                                             │
    │   RESILIENCE                                                │
    │   "What happens when the database goes down?"              │
    │                                                             │
    │   COST                                                      │
    │   "How much will it cost to handle Black Friday traffic?"  │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

### 5.3 The Bridge to Simulation

To answer these questions, we need to make our diagram COME ALIVE.

```
    STATIC DIAGRAM                          SIMULATION
    ══════════════                          ══════════
    
    ┌───┐     ┌───┐                    ┌───┐     ┌───┐
    │ A │────▶│ B │      ─────▶       │ A │●───▶│ B │
    └───┘     └───┘                    └───┘     └───┘
                                         │         │
    "A connects to B"                    │    ●    │
                                         │   ●●●   │
                                         │ ●●●●●●● │
                                         │         │
                                       "Things are flowing,
                                        B is getting busy,
                                        a queue is forming"
```

**This is what SIMULATION does:** It takes a static structure and adds TIME, EVENTS, and BEHAVIOR.

---

**End of Part 1**

In Part 2, we'll make these diagrams come alive through simulation.