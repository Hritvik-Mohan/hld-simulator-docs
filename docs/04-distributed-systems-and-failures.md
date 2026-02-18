# PART 4: ADVANCED SYSTEM BEHAVIOR

## Multi-Component Systems, Network Physics, and Failure Propagation

---

## Chapter 20: From Single Nodes to Distributed Systems

### 20.1 The Leap in Complexity

In Part 3, we built individual components. Now we connect them into **realistic distributed systems**.

```
    PART 3: Single Component              PART 4: Distributed System
    ══════════════════════════            ══════════════════════════
    
    [Users] ──▶ [Server] ──▶ [Done]      [Users] ──▶ [CDN] ──▶ [Gateway]
                                                         │
                                                         ├──▶ [Auth] ──▶ [Auth DB]
                                                         │
                                                         ├──▶ [API] ──▶ [Cache]
                                                         │            │
                                                         │            └──▶ [DB]
                                                         │
                                                         └──▶ [Queue] ──▶ [Workers]
    
    
    NEW CHALLENGES:
    ───────────────
    • Requests traverse MULTIPLE nodes
    • Each hop adds LATENCY
    • Components have DEPENDENCIES
    • Failures CASCADE through the system
    • Routing decisions affect behavior
```

### 20.2 The Request Journey

A request in a distributed system follows a PATH through multiple components:

```
    REQUEST JOURNEY THROUGH E-COMMERCE SYSTEM
    ══════════════════════════════════════════
    
    T=0ms     [User Browser]
                   │
                   │ DNS lookup + TCP + TLS handshake
                   ▼
    T=50ms    [CDN Edge]
                   │
                   │ Cache MISS, forward to origin
                   ▼
    T=70ms    [Load Balancer]
                   │
                   │ Select backend server
                   ▼
    T=72ms    [API Gateway]
                   │
                   ├─── Validate JWT ───▶ [Auth Service] ───▶ [Auth Cache]
                   │                              │
                   │                              └──▶ [Auth DB] (if cache miss)
                   │
                   │ T=85ms (auth complete)
                   ▼
    T=86ms    [Product Service]
                   │
                   ├─── Check cache ───▶ [Redis] ─── HIT! ───┐
                   │                                          │
                   │ ◀─────────────────────────────────────────┘
                   │
                   │ T=90ms (product data retrieved)
                   ▼
    T=91ms    [API Gateway]
                   │
                   │ Serialize response
                   ▼
    T=95ms    [CDN Edge]
                   │
                   │ Cache response, return to user
                   ▼
    T=145ms   [User Browser]
    
    
    TOTAL LATENCY: 145ms
    
    Breakdown:
    • Network (User ↔ CDN):     50ms + 50ms = 100ms
    • CDN processing:           2ms
    • Internal routing:         5ms
    • Auth check:               13ms
    • Product lookup:           4ms
    • Response serialization:   4ms
    • CDN caching:              2ms
    • Other overhead:           15ms
```

### 20.3 Dependency Graphs

Every distributed system has an implicit **dependency graph**:

```
    DEPENDENCY GRAPH
    ════════════════
    
    A component DEPENDS ON another if it needs that component to function.
    
    
    DIRECT DEPENDENCIES (→):
    ────────────────────────
    
    API Gateway → Auth Service       (must authenticate requests)
    API Gateway → Product Service    (must fetch data)
    Product Service → Redis Cache    (caches product data)
    Product Service → PostgreSQL     (source of truth)
    
    
    VISUAL REPRESENTATION:
    ──────────────────────
    
                    ┌─────────────┐
                    │ API Gateway │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │   Auth   │ │ Product  │ │  Order   │
        │ Service  │ │ Service  │ │ Service  │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             ▼       ┌────┴────┐       ▼
        ┌─────────┐  │         │  ┌─────────┐
        │Auth DB  │  ▼         ▼  │Order DB │
        └─────────┘ ┌─────┐ ┌─────┐└─────────┘
                    │Redis│ │Postgres│
                    └─────┘ └───────┘
    
    
    DEPENDENCY PROPERTIES:
    ──────────────────────
    
    CRITICAL DEPENDENCY:   If it fails, caller CANNOT function
                          Example: Auth Service → Auth DB
    
    OPTIONAL DEPENDENCY:   If it fails, caller can DEGRADE gracefully
                          Example: Product Service → Redis (can fall back to DB)
    
    CIRCULAR DEPENDENCY:   A → B → A (dangerous! can cause deadlocks)
                          Should be avoided in design
```

### 20.4 Modeling Dependencies in the Simulator

```javascript
/**
 * Enhanced Node with Dependency Management
 */
class DependencyAwareNode {
    constructor(config) {
        // ... basic setup ...
        
        // Dependencies
        this.dependencies = new Map();  // nodeId -> DependencyConfig
        this.dependencyStates = new Map();  // nodeId -> 'healthy' | 'degraded' | 'failed'
    }
    
    /**
     * Register a dependency
     */
    addDependency(nodeId, config) {
        this.dependencies.set(nodeId, {
            type: config.type || 'critical',  // 'critical' | 'optional'
            timeout: config.timeout || 5000,
            retries: config.retries || 3,
            circuitBreaker: config.circuitBreaker || null,
            fallback: config.fallback || null
        });
        this.dependencyStates.set(nodeId, 'healthy');
    }
    
    /**
     * Check if we can process requests
     */
    canProcess() {
        // Check all CRITICAL dependencies
        for (const [nodeId, config] of this.dependencies) {
            if (config.type === 'critical') {
                const state = this.dependencyStates.get(nodeId);
                if (state === 'failed') {
                    return { 
                        canProcess: false, 
                        reason: `critical_dependency_failed:${nodeId}` 
                    };
                }
            }
        }
        return { canProcess: true };
    }
    
    /**
     * Update dependency state based on observed behavior
     */
    updateDependencyState(nodeId, success, latency) {
        const config = this.dependencies.get(nodeId);
        if (!config) return;
        
        if (config.circuitBreaker) {
            config.circuitBreaker.recordResult(success, latency);
            
            if (config.circuitBreaker.isOpen()) {
                this.dependencyStates.set(nodeId, 'failed');
            } else if (config.circuitBreaker.isHalfOpen()) {
                this.dependencyStates.set(nodeId, 'degraded');
            } else {
                this.dependencyStates.set(nodeId, 'healthy');
            }
        }
    }
    
    /**
     * Get fallback behavior for failed dependency
     */
    getFallback(nodeId) {
        const config = this.dependencies.get(nodeId);
        return config?.fallback || null;
    }
}
```

---

## Chapter 21: Network Physics — Realistic Latency Modeling

### 21.1 The Anatomy of Network Latency

Network communication is NOT instant. Every message incurs delays:

```
    NETWORK LATENCY COMPONENTS
    ══════════════════════════
    
    TOTAL LATENCY = Propagation + Transmission + Processing + Queuing
    
                    L = P + T + Pr + Q
    
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   1. PROPAGATION DELAY (P)                                         │
    │   ──────────────────────                                           │
    │   Time for signal to travel through medium.                        │
    │   Limited by speed of light!                                       │
    │                                                                     │
    │   P = Distance / Speed                                             │
    │                                                                     │
    │   • Fiber optic: ~200,000 km/sec (2/3 speed of light)             │
    │   • Copper: ~200,000 km/sec                                        │
    │                                                                     │
    │   Examples:                                                         │
    │   • Same datacenter: 0.001ms                                       │
    │   • Cross-country (US): 20-40ms                                    │
    │   • Cross-Atlantic: 40-60ms                                        │
    │   • Around the world: 100-150ms                                    │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   2. TRANSMISSION DELAY (T)                                        │
    │   ─────────────────────────                                        │
    │   Time to push all bits onto the wire.                            │
    │   Depends on message size and bandwidth.                           │
    │                                                                     │
    │   T = Message Size / Bandwidth                                     │
    │                                                                     │
    │   Examples (1 MB message):                                         │
    │   • 1 Gbps link:   8ms                                            │
    │   • 10 Gbps link:  0.8ms                                          │
    │   • 100 Gbps link: 0.08ms                                         │
    │                                                                     │
    │   Examples (1 KB message):                                         │
    │   • 1 Gbps link:   0.008ms (negligible)                           │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   3. PROCESSING DELAY (Pr)                                         │
    │   ────────────────────────                                         │
    │   Time for routers/switches to process packet headers.            │
    │   Usually small but can add up.                                    │
    │                                                                     │
    │   • Per hop: 0.01-0.1ms                                           │
    │   • Typical internet path: 10-20 hops                             │
    │   • Total: 0.1-2ms                                                │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   4. QUEUING DELAY (Q)                                             │
    │   ────────────────────                                             │
    │   Time waiting in router/switch buffers.                           │
    │   HIGHLY VARIABLE! Depends on congestion.                          │
    │                                                                     │
    │   • Light traffic: ~0ms                                            │
    │   • Moderate traffic: 1-10ms                                       │
    │   • Heavy congestion: 50-500ms (or packet drop!)                  │
    │                                                                     │
    │   This is what causes latency VARIANCE (jitter)!                   │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

### 21.2 Real-World Latency Numbers

```
    LATENCY REFERENCE TABLE
    ═══════════════════════
    
    ┌──────────────────────────────────────────────────────────────────┐
    │  OPERATION                           │  TYPICAL LATENCY         │
    ├──────────────────────────────────────┼──────────────────────────┤
    │                                      │                          │
    │  WITHIN SAME MACHINE                 │                          │
    │  ────────────────────                │                          │
    │  L1 cache reference                  │  0.0005ms (0.5ns)        │
    │  L2 cache reference                  │  0.007ms (7ns)           │
    │  Main memory reference               │  0.1ms (100ns)           │
    │  SSD random read                     │  0.15ms (150μs)          │
    │  HDD random read                     │  10ms                    │
    │                                      │                          │
    │  WITHIN SAME DATACENTER              │                          │
    │  ───────────────────────             │                          │
    │  Same rack (switch)                  │  0.1-0.5ms               │
    │  Different rack (2 switches)         │  0.3-1ms                 │
    │  Different zone (same DC)            │  0.5-2ms                 │
    │                                      │                          │
    │  BETWEEN DATACENTERS                 │                          │
    │  ────────────────────                │                          │
    │  Same region (e.g., us-east-1a ↔ b) │  1-3ms                   │
    │  Same metro (e.g., Virginia zones)   │  2-5ms                   │
    │  Cross-region (us-east ↔ us-west)   │  60-80ms                 │
    │  Cross-continent (US ↔ Europe)      │  80-120ms                │
    │  Cross-Pacific (US ↔ Asia)          │  150-200ms               │
    │                                      │                          │
    │  PUBLIC INTERNET                     │                          │
    │  ───────────────────                 │                          │
    │  User → nearby CDN                   │  5-20ms                  │
    │  User → origin (same country)        │  20-50ms                 │
    │  User → origin (cross-country)       │  50-100ms                │
    │  User → origin (intercontinental)    │  100-300ms               │
    │                                      │                          │
    └──────────────────────────────────────┴──────────────────────────┘
```

### 21.3 Modeling Network Edges

```javascript
/**
 * Network Edge with Realistic Latency Model
 */
class NetworkEdge {
    constructor(config) {
        this.id = config.id;
        this.source = config.source;
        this.target = config.target;
        
        // Physical properties
        this.distance = config.distance || 0;  // kilometers
        this.bandwidth = config.bandwidth || 1000;  // Mbps
        this.hops = config.hops || 1;
        
        // Latency components
        this.propagationDelay = this.calculatePropagationDelay();
        this.processingDelayPerHop = config.processingDelayPerHop || 0.05;  // ms
        
        // Distribution for variable components
        this.queuingDelayConfig = config.queuingDelay || {
            type: 'exponential',
            rate: 2  // mean 0.5ms
        };
        
        // Reliability
        this.packetLossRate = config.packetLossRate || 0;
        this.jitterConfig = config.jitter || null;
        
        // Congestion model
        this.congestionModel = config.congestionModel || null;
        this.currentLoad = 0;
        
        // Dependencies
        this.distributions = null;
    }
    
    /**
     * Calculate propagation delay from distance
     */
    calculatePropagationDelay() {
        // Speed of light in fiber: ~200,000 km/s = 0.005 ms/km
        const speedKmPerMs = 200;
        return this.distance / speedKmPerMs;
    }
    
    /**
     * Calculate transmission delay for given message size
     */
    calculateTransmissionDelay(messageSizeBytes) {
        // bandwidth is in Mbps, convert to bytes/ms
        const bytesPerMs = (this.bandwidth * 1000000) / 8 / 1000;
        return messageSizeBytes / bytesPerMs;
    }
    
    /**
     * Calculate total latency for a message
     */
    calculateLatency(messageSizeBytes) {
        // 1. Propagation (fixed, based on distance)
        const P = this.propagationDelay;
        
        // 2. Transmission (based on message size)
        const T = this.calculateTransmissionDelay(messageSizeBytes);
        
        // 3. Processing (per hop)
        const Pr = this.hops * this.processingDelayPerHop;
        
        // 4. Queuing (variable, depends on congestion)
        const Q = this.calculateQueuingDelay();
        
        // 5. Jitter (random variation)
        const J = this.calculateJitter();
        
        return P + T + Pr + Q + J;
    }
    
    /**
     * Calculate queuing delay based on current load
     */
    calculateQueuingDelay() {
        let baseDelay = this.distributions.fromConfig(this.queuingDelayConfig);
        
        // Apply congestion multiplier if congestion model exists
        if (this.congestionModel) {
            const congestionFactor = this.getCongestionFactor();
            baseDelay *= congestionFactor;
        }
        
        return Math.max(0, baseDelay);
    }
    
    /**
     * Get congestion factor based on current load
     */
    getCongestionFactor() {
        if (!this.congestionModel) return 1;
        
        const utilization = this.currentLoad / this.bandwidth;
        
        switch (this.congestionModel.type) {
            case 'linear':
                // Latency increases linearly with load
                return 1 + utilization * this.congestionModel.factor;
                
            case 'exponential':
                // Latency increases exponentially as we approach capacity
                // M/M/1 queue: delay = 1/(1-ρ) for utilization ρ
                if (utilization >= 0.99) return 100;  // Cap at 100x
                return 1 / (1 - utilization);
                
            case 'step':
                // Sudden increase at threshold
                if (utilization > this.congestionModel.threshold) {
                    return this.congestionModel.factor;
                }
                return 1;
                
            default:
                return 1;
        }
    }
    
    /**
     * Calculate random jitter
     */
    calculateJitter() {
        if (!this.jitterConfig) return 0;
        return this.distributions.fromConfig(this.jitterConfig);
    }
    
    /**
     * Check if packet is lost
     */
    isPacketLost() {
        if (this.packetLossRate === 0) return false;
        
        // Increase loss rate under congestion
        let effectiveLossRate = this.packetLossRate;
        if (this.congestionModel) {
            const utilization = this.currentLoad / this.bandwidth;
            if (utilization > 0.9) {
                // Loss increases dramatically over 90% utilization
                effectiveLossRate += (utilization - 0.9) * 0.5;
            }
        }
        
        return this.distributions.random() < effectiveLossRate;
    }
    
    /**
     * Simulate sending a message through this edge
     */
    send(message, currentTime) {
        // Check for packet loss
        if (this.isPacketLost()) {
            return {
                success: false,
                reason: 'packet_lost',
                arrivalTime: null
            };
        }
        
        // Calculate latency
        const latency = this.calculateLatency(message.size || 1024);
        const latencyMicros = BigInt(Math.round(latency * 1000));
        
        return {
            success: true,
            latency: latency,
            arrivalTime: currentTime + latencyMicros,
            breakdown: {
                propagation: this.propagationDelay,
                transmission: this.calculateTransmissionDelay(message.size || 1024),
                processing: this.hops * this.processingDelayPerHop,
                queuing: latency - this.propagationDelay - 
                        this.calculateTransmissionDelay(message.size || 1024) -
                        this.hops * this.processingDelayPerHop
            }
        };
    }
}
```

### 21.4 Latency Distribution Patterns

```
    REALISTIC LATENCY DISTRIBUTIONS
    ═══════════════════════════════
    
    
    1. SAME-DATACENTER (Low, Consistent)
    ────────────────────────────────────
    
    Distribution: Log-normal with low variance
    Parameters: μ = -0.5, σ = 0.3
    Result: Median ~0.6ms, P99 ~1.5ms
    
    │
    │  █
    │  ██
    │  ████
    │  ██████████▃▂▁
    └──────────────────▶ ms
       0  0.5  1  1.5  2
    
    
    2. CROSS-REGION (Higher, More Variable)
    ───────────────────────────────────────
    
    Distribution: Log-normal with moderate variance
    Parameters: μ = 4.0, σ = 0.5
    Result: Median ~55ms, P99 ~120ms
    
    │
    │       █
    │      ███
    │     ██████
    │   ████████████▃▂▁▁▁
    └───────────────────────────▶ ms
       0   40   80  120  160
    
    
    3. PUBLIC INTERNET (High Variance, Long Tail)
    ─────────────────────────────────────────────
    
    Distribution: Mixture (bimodal - fast path + slow path)
    
    │
    │  █              █
    │  ██            ███
    │  ████        ███████▃▂▁▁▁▁
    └────────────────────────────────▶ ms
       0  20  40  80  150  300  500
           ↑              ↑
        Fast users    Slow users
       (good routes)  (bad routes)
    
    
    4. UNDER CONGESTION (Extreme Tail)
    ───────────────────────────────────
    
    Distribution: Heavy-tailed (approaches Pareto)
    
    │
    │█
    │██
    │████▃▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▂
    └─────────────────────────────────▶ ms
       0   50  100     500    1000+
                          ↑
                    Tail timeout territory
```

### 21.5 Bandwidth and Throughput

```
    BANDWIDTH VS THROUGHPUT
    ═══════════════════════
    
    BANDWIDTH:  Maximum theoretical capacity
    THROUGHPUT: Actual achieved rate
    
    
    WHY THROUGHPUT < BANDWIDTH:
    ───────────────────────────
    
    1. Protocol overhead (TCP headers, ACKs)
    2. Congestion (sharing with other traffic)
    3. Packet loss (retransmissions)
    4. Round-trip limitations (TCP window)
    
    
    BANDWIDTH-DELAY PRODUCT (BDP):
    ──────────────────────────────
    
    The amount of data "in flight" needed to fully utilize a link.
    
    BDP = Bandwidth × Round-Trip Time
    
    Example:
    • 1 Gbps link, 100ms RTT
    • BDP = 1,000,000,000 bits/sec × 0.1 sec = 100,000,000 bits = 12.5 MB
    
    You need 12.5 MB of data in flight to fully utilize the link!
    This is why long-distance links are hard to saturate.
    
    
    IN SIMULATION:
    ──────────────
    
    Model bandwidth as a shared resource:
    
    ┌──────────────────────────────────────────────┐
    │                                              │
    │  Total Bandwidth: 1 Gbps                     │
    │                                              │
    │  Request 1: 100 Mbps ████████░░              │
    │  Request 2: 300 Mbps ████████████████████████│
    │  Request 3: 200 Mbps ████████████████░░░░░░░░│
    │  Available: 400 Mbps                         │
    │                                              │
    │  If Request 4 wants 500 Mbps:                │
    │  → Queuing delay until bandwidth frees up    │
    │  → Or: fair sharing (each gets reduced)      │
    │                                              │
    └──────────────────────────────────────────────┘
```

---

## Chapter 22: Failure Modes — What Can Go Wrong

### 22.1 Taxonomy of Failures

```
    FAILURE TAXONOMY
    ════════════════
    
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   1. CRASH FAILURES                                                │
    │   ───────────────────                                              │
    │   Component stops completely. No response at all.                  │
    │                                                                     │
    │   Examples:                                                         │
    │   • Process killed by OOM killer                                   │
    │   • Server hardware failure                                        │
    │   • Power outage                                                   │
    │   • Kernel panic                                                   │
    │                                                                     │
    │   Behavior: Connections timeout, health checks fail                │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   2. OMISSION FAILURES                                             │
    │   ────────────────────                                             │
    │   Component fails to send or receive some messages.                │
    │                                                                     │
    │   Examples:                                                         │
    │   • Packet loss in network                                         │
    │   • Full queue dropping messages                                   │
    │   • Disk full, can't write                                         │
    │                                                                     │
    │   Behavior: Some requests disappear, others work fine              │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   3. TIMING FAILURES                                               │
    │   ──────────────────                                               │
    │   Component responds, but too slowly.                              │
    │                                                                     │
    │   Examples:                                                         │
    │   • GC pause (stop-the-world)                                      │
    │   • CPU throttling                                                 │
    │   • Disk I/O saturation                                            │
    │   • Lock contention                                                │
    │   • Slow query                                                     │
    │                                                                     │
    │   Behavior: Requests succeed but latency spikes                    │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   4. RESPONSE FAILURES                                             │
    │   ────────────────────                                             │
    │   Component responds, but with wrong data.                         │
    │                                                                     │
    │   Examples:                                                         │
    │   • Bug returning incorrect result                                 │
    │   • Stale cache data                                               │
    │   • Deserialization error                                          │
    │   • Data corruption                                                │
    │                                                                     │
    │   Behavior: Requests complete but with bad data                    │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   5. BYZANTINE FAILURES                                            │
    │   ─────────────────────                                            │
    │   Component behaves arbitrarily (possibly maliciously).            │
    │                                                                     │
    │   Examples:                                                         │
    │   • Compromised server sending fake data                           │
    │   • Hardware bit-flip causing corruption                           │
    │   • Misconfigured server disagreeing with others                   │
    │                                                                     │
    │   Behavior: Unpredictable, potentially malicious                   │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

### 22.2 Failure Causes

```
    COMMON FAILURE CAUSES
    ═════════════════════
    
    
    RESOURCE EXHAUSTION
    ───────────────────
    
    ┌─────────────┬───────────────────────────────────────────────────┐
    │ Resource    │ What Happens When Exhausted                       │
    ├─────────────┼───────────────────────────────────────────────────┤
    │ Memory      │ OOM killer terminates process                     │
    │ CPU         │ Requests timeout, latency spikes                  │
    │ Disk space  │ Writes fail, database corruption                  │
    │ Disk I/O    │ Everything slows down                             │
    │ File desc.  │ "Too many open files", connection refused         │
    │ Threads     │ Can't accept new connections                      │
    │ Connections │ Database: "too many connections"                  │
    │ Sockets     │ Ephemeral port exhaustion                         │
    │ Network BW  │ Packet drops, extreme latency                     │
    └─────────────┴───────────────────────────────────────────────────┘
    
    
    DEPENDENCY FAILURES
    ───────────────────
    
    • Database goes down
    • Cache becomes unreachable
    • External API returns errors
    • DNS resolution fails
    • Certificate expires
    
    
    OVERLOAD
    ────────
    
    • Traffic spike (Black Friday, viral post)
    • Retry storm (failures cause retries cause more failures)
    • Cascading failure (one component's failure overloads others)
    
    
    OPERATIONAL ISSUES
    ──────────────────
    
    • Bad deployment (bug pushed to production)
    • Misconfiguration
    • Expired credentials
    • Network maintenance
    • Datacenter issues
```

### 22.3 Implementing Failure Injection

```javascript
/**
 * Failure Injection System
 */
class FailureInjector {
    constructor() {
        this.activeFailures = new Map();  // failureId -> Failure
        this.scheduledFailures = [];
    }
    
    /**
     * Schedule a failure to occur
     */
    scheduleFailure(failure) {
        const scheduledFailure = {
            id: failure.id || `failure-${Date.now()}`,
            
            // What to fail
            target: failure.target,  // { type: 'node' | 'edge', id: string }
            
            // When to fail
            timing: failure.timing,  // { type: 'deterministic' | 'probabilistic', ... }
            
            // How to fail
            failureType: failure.failureType,  // 'crash' | 'slow' | 'error' | 'partial'
            
            // Failure parameters
            params: failure.params || {},
            
            // Duration
            duration: failure.duration,  // { type: 'fixed' | 'until', ... }
            
            // State
            active: false,
            startTime: null,
            endTime: null
        };
        
        this.scheduledFailures.push(scheduledFailure);
        return scheduledFailure.id;
    }
    
    /**
     * Check and activate failures at current time
     */
    checkFailures(currentTime, context) {
        for (const failure of this.scheduledFailures) {
            if (failure.active) continue;
            
            let shouldActivate = false;
            
            switch (failure.timing.type) {
                case 'deterministic':
                    // Activate at specific time
                    if (currentTime >= failure.timing.atTime) {
                        shouldActivate = true;
                    }
                    break;
                    
                case 'probabilistic':
                    // Random chance at each check
                    if (context.random() < failure.timing.probability) {
                        shouldActivate = true;
                    }
                    break;
                    
                case 'conditional':
                    // Activate when condition is met
                    if (this.checkCondition(failure.timing.condition, context)) {
                        shouldActivate = true;
                    }
                    break;
            }
            
            if (shouldActivate) {
                this.activateFailure(failure, currentTime);
            }
        }
        
        // Check for failures that should end
        for (const [failureId, failure] of this.activeFailures) {
            if (this.shouldEndFailure(failure, currentTime)) {
                this.deactivateFailure(failureId, currentTime);
            }
        }
    }
    
    /**
     * Activate a failure
     */
    activateFailure(failure, currentTime) {
        failure.active = true;
        failure.startTime = currentTime;
        
        // Calculate end time if fixed duration
        if (failure.duration?.type === 'fixed') {
            failure.endTime = currentTime + BigInt(failure.duration.ms * 1000);
        }
        
        this.activeFailures.set(failure.id, failure);
        
        console.log(`[FAILURE] Activated: ${failure.id} on ${failure.target.type}:${failure.target.id}`);
        
        return {
            type: 'FAILURE_STARTED',
            failureId: failure.id,
            target: failure.target,
            failureType: failure.failureType
        };
    }
    
    /**
     * Deactivate a failure
     */
    deactivateFailure(failureId, currentTime) {
        const failure = this.activeFailures.get(failureId);
        if (!failure) return;
        
        failure.active = false;
        failure.endTime = currentTime;
        this.activeFailures.delete(failureId);
        
        console.log(`[FAILURE] Deactivated: ${failureId}`);
        
        return {
            type: 'FAILURE_ENDED',
            failureId: failureId,
            target: failure.target
        };
    }
    
    /**
     * Check if a failure should end
     */
    shouldEndFailure(failure, currentTime) {
        switch (failure.duration?.type) {
            case 'fixed':
                return currentTime >= failure.endTime;
                
            case 'until':
                // Check condition
                return this.checkCondition(failure.duration.condition, { currentTime });
                
            case 'permanent':
                return false;
                
            default:
                return false;
        }
    }
    
    /**
     * Check if a target is currently failed
     */
    isTargetFailed(targetType, targetId) {
        for (const failure of this.activeFailures.values()) {
            if (failure.target.type === targetType && 
                failure.target.id === targetId &&
                failure.failureType === 'crash') {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get active failure affecting a target
     */
    getActiveFailure(targetType, targetId) {
        for (const failure of this.activeFailures.values()) {
            if (failure.target.type === targetType && failure.target.id === targetId) {
                return failure;
            }
        }
        return null;
    }
    
    /**
     * Apply failure effects to a request
     */
    applyFailureEffects(targetType, targetId, request, context) {
        const failure = this.getActiveFailure(targetType, targetId);
        if (!failure) {
            return { affected: false };
        }
        
        switch (failure.failureType) {
            case 'crash':
                return {
                    affected: true,
                    effect: 'reject',
                    reason: 'node_crashed'
                };
                
            case 'slow':
                return {
                    affected: true,
                    effect: 'delay',
                    addedLatencyMs: failure.params.addedLatencyMs || 1000
                };
                
            case 'error':
                // Probabilistic error
                if (context.random() < (failure.params.errorRate || 0.5)) {
                    return {
                        affected: true,
                        effect: 'error',
                        errorCode: failure.params.errorCode || '500'
                    };
                }
                return { affected: false };
                
            case 'partial':
                // Only affects some percentage
                if (context.random() < (failure.params.affectedPercent || 0.5)) {
                    return {
                        affected: true,
                        effect: failure.params.effect || 'error',
                        ...failure.params
                    };
                }
                return { affected: false };
                
            default:
                return { affected: false };
        }
    }
}
```

### 22.4 Common Failure Scenarios

```javascript
/**
 * Pre-built failure scenarios
 */
const FailureScenarios = {
    
    /**
     * Single node crash
     */
    nodeCrash: (nodeId, atTimeMs, durationMs) => ({
        id: `crash-${nodeId}`,
        target: { type: 'node', id: nodeId },
        timing: { type: 'deterministic', atTime: BigInt(atTimeMs * 1000) },
        failureType: 'crash',
        duration: durationMs ? { type: 'fixed', ms: durationMs } : { type: 'permanent' }
    }),
    
    /**
     * Latency spike (slow node)
     */
    latencySpike: (nodeId, atTimeMs, durationMs, addedLatencyMs) => ({
        id: `slow-${nodeId}`,
        target: { type: 'node', id: nodeId },
        timing: { type: 'deterministic', atTime: BigInt(atTimeMs * 1000) },
        failureType: 'slow',
        params: { addedLatencyMs },
        duration: { type: 'fixed', ms: durationMs }
    }),
    
    /**
     * Intermittent errors
     */
    intermittentErrors: (nodeId, atTimeMs, durationMs, errorRate) => ({
        id: `errors-${nodeId}`,
        target: { type: 'node', id: nodeId },
        timing: { type: 'deterministic', atTime: BigInt(atTimeMs * 1000) },
        failureType: 'error',
        params: { errorRate, errorCode: '503' },
        duration: { type: 'fixed', ms: durationMs }
    }),
    
    /**
     * Network partition
     */
    networkPartition: (edgeId, atTimeMs, durationMs) => ({
        id: `partition-${edgeId}`,
        target: { type: 'edge', id: edgeId },
        timing: { type: 'deterministic', atTime: BigInt(atTimeMs * 1000) },
        failureType: 'crash',  // Complete connectivity loss
        duration: { type: 'fixed', ms: durationMs }
    }),
    
    /**
     * Network degradation (high latency + packet loss)
     */
    networkDegradation: (edgeId, atTimeMs, durationMs, addedLatencyMs, packetLossRate) => ({
        id: `degraded-${edgeId}`,
        target: { type: 'edge', id: edgeId },
        timing: { type: 'deterministic', atTime: BigInt(atTimeMs * 1000) },
        failureType: 'partial',
        params: { 
            effect: 'degrade',
            addedLatencyMs,
            packetLossRate
        },
        duration: { type: 'fixed', ms: durationMs }
    }),
    
    /**
     * Random failures (probabilistic)
     */
    randomFailures: (nodeId, probability, durationMs) => ({
        id: `random-${nodeId}`,
        target: { type: 'node', id: nodeId },
        timing: { type: 'probabilistic', probability },
        failureType: 'crash',
        duration: { type: 'fixed', ms: durationMs }
    }),
    
    /**
     * Resource exhaustion (gradual degradation)
     */
    resourceExhaustion: (nodeId, atTimeMs, rampDurationMs) => ({
        id: `exhaustion-${nodeId}`,
        target: { type: 'node', id: nodeId },
        timing: { type: 'deterministic', atTime: BigInt(atTimeMs * 1000) },
        failureType: 'slow',
        params: {
            progressive: true,
            rampDurationMs,
            maxAddedLatencyMs: 5000
        },
        duration: { type: 'permanent' }
    })
};
```

---

## Chapter 23: Failure Propagation — The Domino Effect

### 23.1 How Failures Cascade

```
    THE CASCADING FAILURE PATTERN
    ═════════════════════════════
    
    
    STEP 1: Initial Failure
    ───────────────────────
    
    Database gets slow (disk I/O saturation)
    
    [Users] → [Gateway] → [Service] → [Database 🐌]
                                           │
                                      Latency: 50ms → 2000ms
    
    
    STEP 2: Upstream Impact
    ───────────────────────
    
    Service's requests to DB start timing out
    
    [Users] → [Gateway] → [Service ⚠️] → [Database 🐌]
                              │
                         Requests queue up
                         Threads blocked waiting
    
    
    STEP 3: Retry Storm
    ───────────────────
    
    Clients retry failed requests → MORE load on the sick system
    
    [Users] → [Gateway] → [Service 🔥] → [Database 🐌]
                  │            │
             Retrying      3x the load!
    
    
    STEP 4: Resource Exhaustion
    ───────────────────────────
    
    Service runs out of threads/connections
    
    [Users] → [Gateway ⚠️] → [Service 💀] → [Database 🐌]
                  │               │
             Requests        Out of threads
             queue up        Connection pool exhausted
    
    
    STEP 5: Full Cascade
    ────────────────────
    
    Everything fails
    
    [Users ❌] → [Gateway 💀] → [Service 💀] → [Database 💀]
         │
    "503 Service Unavailable"
    
    
    TIMELINE:
    ─────────
    
    T=0:      Database slow (initial cause)
    T=5s:     Service latency increases
    T=10s:    Retries begin
    T=20s:    Service thread pool exhausted
    T=25s:    Gateway connections timing out
    T=30s:    Complete outage
    
    Total time from first symptom to full outage: 30 seconds!
```

### 23.2 Propagation Patterns

```
    FAILURE PROPAGATION PATTERNS
    ════════════════════════════
    
    
    1. TIMEOUT CASCADE
    ──────────────────
    
    Downstream timeout → Upstream waits → Upstream times out → ...
    
        A ──[wait]──▶ B ──[wait]──▶ C ──[slow]──▶ D
        │             │             │
    timeout=5s   timeout=5s    timeout=5s
        │             │             │
    A times out  B times out   C waits for D
    at T=15s     at T=10s      (D is slow)
    
    FIX: Timeout budget that decreases along the chain
    
    
    2. RETRY AMPLIFICATION
    ──────────────────────
    
    Each layer retries, multiplying load exponentially
    
        A ─(3 retries)─▶ B ─(3 retries)─▶ C
        
        If C fails once:
        • B retries 3 times → C sees 3 requests
        • A retries 3 times → B sees 3 requests → C sees 9 requests
        • Total: 1 user request → 9 backend requests!
    
    FIX: Retry budgets, circuit breakers, exponential backoff
    
    
    3. RESOURCE STARVATION
    ──────────────────────
    
    Slow component holds resources, starving others
    
        Connection pool: [■ ■ ■ ■ ■ ■ ■ ■ ■ ■] (10 connections)
        
        Normal:     [A][B][C][_][_][_][_][_][_][_]  (3 active, 7 free)
        
        C gets slow: [A][A][A][A][A][A][A][A][A][A]  (all waiting for C!)
                     │                            │
                     └──── No connections left ───┘
                           New requests rejected
    
    FIX: Connection timeouts, separate pools per dependency
    
    
    4. THUNDERING HERD
    ──────────────────
    
    Many clients retry simultaneously after a brief outage
    
        Normal:     ●   ●   ●   ●   ●   (spread out)
        
        Outage:     ╳   ╳   ╳   ╳   ╳   (all fail)
                    │   │   │   │   │
        Recovery:   ●●●●●●●●●●●●●●●●●   (all retry at once!)
                           │
                    Instant overload
    
    FIX: Jittered retries, circuit breakers, load shedding
    
    
    5. CACHE STAMPEDE
    ─────────────────
    
    Cache expires → All requests hit origin simultaneously
    
        Cache: [Product A: $99] ─── TTL expires ───▶ [Empty]
                                                       │
        Requests:  ●   ●   ●   ●   ●                   │
                   │   │   │   │   │                   │
                   └───┴───┴───┴───┴─── All go to DB! ─┘
                                              │
                                       DB overwhelmed
    
    FIX: Staggered TTLs, cache warming, request coalescing
```

### 23.3 Implementing Failure Propagation

```javascript
/**
 * Failure Propagation Engine
 */
class FailurePropagationEngine {
    constructor(systemModel) {
        this.nodes = systemModel.nodes;
        this.edges = systemModel.edges;
        this.dependencyGraph = this.buildDependencyGraph();
        
        // Propagation rules
        this.propagationRules = [];
    }
    
    /**
     * Build dependency graph from edges
     */
    buildDependencyGraph() {
        const graph = {
            downstream: new Map(),  // node -> nodes it depends on
            upstream: new Map()     // node -> nodes that depend on it
        };
        
        for (const [nodeId] of this.nodes) {
            graph.downstream.set(nodeId, []);
            graph.upstream.set(nodeId, []);
        }
        
        for (const [edgeId, edge] of this.edges) {
            // Source depends on target (downstream)
            graph.downstream.get(edge.source)?.push(edge.target);
            // Target has upstream dependent
            graph.upstream.get(edge.target)?.push(edge.source);
        }
        
        return graph;
    }
    
    /**
     * Add a propagation rule
     */
    addPropagationRule(rule) {
        this.propagationRules.push({
            name: rule.name,
            
            // When does this rule trigger?
            trigger: rule.trigger,  // { type: 'dependency_failure' | 'error_rate' | 'latency', ... }
            
            // What does it affect?
            propagateTo: rule.propagateTo,  // 'upstream' | 'downstream' | 'specific'
            
            // What effect does it have?
            effect: rule.effect,  // { type: 'increase_latency' | 'increase_errors' | 'fail', ... }
            
            // Delay before propagation
            delayMs: rule.delayMs || 0
        });
    }
    
    /**
     * Check if propagation should occur
     */
    checkPropagation(nodeId, nodeState, currentTime) {
        const propagationEvents = [];
        
        for (const rule of this.propagationRules) {
            if (this.shouldTrigger(rule, nodeId, nodeState)) {
                const affectedNodes = this.getAffectedNodes(rule, nodeId);
                
                for (const affectedNodeId of affectedNodes) {
                    propagationEvents.push({
                        type: 'FAILURE_PROPAGATION',
                        fromNode: nodeId,
                        toNode: affectedNodeId,
                        rule: rule.name,
                        effect: rule.effect,
                        scheduledTime: currentTime + BigInt(rule.delayMs * 1000)
                    });
                }
            }
        }
        
        return propagationEvents;
    }
    
    /**
     * Check if a rule should trigger
     */
    shouldTrigger(rule, nodeId, nodeState) {
        switch (rule.trigger.type) {
            case 'dependency_failure':
                // Check if a dependency has failed
                const downstream = this.dependencyGraph.downstream.get(nodeId) || [];
                for (const depId of downstream) {
                    const depNode = this.nodes.get(depId);
                    if (depNode?.getState()?.status === 'failed') {
                        return true;
                    }
                }
                return false;
                
            case 'error_rate':
                return nodeState.errorRate > rule.trigger.threshold;
                
            case 'latency':
                return nodeState.avgLatency > rule.trigger.thresholdMs;
                
            case 'queue_depth':
                return nodeState.queueLength > rule.trigger.threshold;
                
            case 'timeout_rate':
                return nodeState.timeoutRate > rule.trigger.threshold;
                
            default:
                return false;
        }
    }
    
    /**
     * Get nodes affected by propagation
     */
    getAffectedNodes(rule, sourceNodeId) {
        switch (rule.propagateTo) {
            case 'upstream':
                return this.dependencyGraph.upstream.get(sourceNodeId) || [];
                
            case 'downstream':
                return this.dependencyGraph.downstream.get(sourceNodeId) || [];
                
            case 'all_dependents':
                return this.getAllDependents(sourceNodeId);
                
            case 'specific':
                return rule.targetNodes || [];
                
            default:
                return [];
        }
    }
    
    /**
     * Get all transitive dependents (upstream)
     */
    getAllDependents(nodeId, visited = new Set()) {
        if (visited.has(nodeId)) return [];
        visited.add(nodeId);
        
        const directUpstream = this.dependencyGraph.upstream.get(nodeId) || [];
        const allDependents = [...directUpstream];
        
        for (const upstreamId of directUpstream) {
            allDependents.push(...this.getAllDependents(upstreamId, visited));
        }
        
        return [...new Set(allDependents)];
    }
}


// ═══════════════════════════════════════════════════════════════
// EXAMPLE: Defining Propagation Rules
// ═══════════════════════════════════════════════════════════════

const propagationEngine = new FailurePropagationEngine(systemModel);

// Rule 1: Database failure causes service to fail
propagationEngine.addPropagationRule({
    name: 'db_failure_propagates',
    trigger: { type: 'dependency_failure' },
    propagateTo: 'upstream',
    effect: { 
        type: 'increase_errors', 
        errorRate: 0.9,  // 90% of requests fail
        errorCode: '503'
    },
    delayMs: 100  // Small delay before effect is visible
});

// Rule 2: High latency downstream causes timeout upstream
propagationEngine.addPropagationRule({
    name: 'latency_causes_timeouts',
    trigger: { type: 'latency', thresholdMs: 5000 },
    propagateTo: 'upstream',
    effect: { 
        type: 'increase_latency', 
        factor: 2.0  // Double the latency
    },
    delayMs: 0
});

// Rule 3: High error rate triggers circuit breaker
propagationEngine.addPropagationRule({
    name: 'errors_trigger_circuit_breaker',
    trigger: { type: 'error_rate', threshold: 0.5 },
    propagateTo: 'upstream',
    effect: { 
        type: 'circuit_breaker_open'
    },
    delayMs: 1000  // After observing errors for 1 second
});
```

### 23.4 Visualizing Failure Propagation

```
    FAILURE PROPAGATION VISUALIZATION
    ══════════════════════════════════
    
    
    TIME-SERIES VIEW:
    ─────────────────
    
    T=0s     T=5s     T=10s    T=15s    T=20s    T=25s
    ─────────────────────────────────────────────────────
    
    Database    [SLOW━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]
    
    API         [OK━━━][SLOW━━━━━━━━][FAILING━━━━━━━━━━]
                       ↑             ↑
                   Latency up    Errors start
    
    Gateway     [OK━━━━━━━━━][SLOW━━━━━][FAILING━━━━━━]
                            ↑           ↑
                        Latency up  Circuit open
    
    Users       [OK━━━━━━━━━━━━━━][ERRORS━━━━━━━━━━━━━]
                                  ↑
                            503 responses
    
    
    HEATMAP VIEW:
    ─────────────
    
    Component   │ T=0  │ T=5  │ T=10 │ T=15 │ T=20 │ T=25 │
    ────────────┼──────┼──────┼──────┼──────┼──────┼──────┤
    Database    │  🟢  │  🟡  │  🟠  │  🔴  │  🔴  │  🔴  │
    API Service │  🟢  │  🟢  │  🟡  │  🟠  │  🔴  │  🔴  │
    Gateway     │  🟢  │  🟢  │  🟢  │  🟡  │  🟠  │  🔴  │
    Cache       │  🟢  │  🟢  │  🟢  │  🟢  │  🟢  │  🟢  │
    ────────────┴──────┴──────┴──────┴──────┴──────┴──────┘
    
    🟢 Healthy (<10% errors, <100ms latency)
    🟡 Degraded (10-30% errors, 100-500ms latency)  
    🟠 Warning (30-50% errors, 500ms-2s latency)
    🔴 Critical (>50% errors, >2s latency or down)
    
    
    CAUSAL GRAPH VIEW:
    ──────────────────
    
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │  [T=0s: Database Disk Full]                                │
    │            │                                                │
    │            ▼                                                │
    │  [T=5s: Database Latency Spike]                            │
    │            │                                                │
    │            ├────────────────────┐                          │
    │            ▼                    ▼                          │
    │  [T=8s: API Timeouts]    [T=10s: API Queue Full]          │
    │            │                    │                          │
    │            ▼                    ▼                          │
    │  [T=12s: API Error Rate 50%]───┴───▶ [T=15s: Gateway CB Open]
    │                                              │              │
    │                                              ▼              │
    │                                    [T=20s: User 503 Errors]│
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

---

## Chapter 24: Resilience Patterns — Preventing Cascade Failures

### 24.1 Circuit Breaker Pattern

```
    CIRCUIT BREAKER
    ═══════════════
    
    A circuit breaker STOPS calling a failing service,
    giving it time to recover.
    
    
    STATE MACHINE:
    ──────────────
    
                        ┌─────────────────────────────────────┐
                        │                                     │
                        ▼                                     │
                  ┌──────────┐    failures > threshold   ┌────┴─────┐
                  │  CLOSED  │ ─────────────────────────▶│   OPEN   │
                  │ (normal) │                           │ (reject) │
                  └──────────┘                           └────┬─────┘
                        ▲                                     │
                        │                                     │
                        │      recovery timeout               │
                        │            ▼                        │
                        │      ┌───────────┐                  │
                        └──────│ HALF-OPEN │◀─────────────────┘
                      success  │  (test)   │
                               └─────┬─────┘
                                     │
                                     │ failure
                                     ▼
                               Back to OPEN
    
    
    BEHAVIOR BY STATE:
    ──────────────────
    
    CLOSED:    All requests pass through normally.
               Track success/failure rate.
               If failure rate > threshold → OPEN
    
    OPEN:      All requests FAIL IMMEDIATELY (no call to downstream).
               Return cached response or error.
               After timeout period → HALF-OPEN
    
    HALF-OPEN: Allow LIMITED requests through (e.g., 1-3).
               If they succeed → CLOSED
               If they fail → OPEN
```

### 24.2 Circuit Breaker Implementation

```javascript
/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
    constructor(config) {
        this.name = config.name;
        
        // Thresholds
        this.failureThreshold = config.failureThreshold || 0.5;  // 50% failures
        this.failureCount = config.failureCount || 5;  // Minimum failures to trip
        this.recoveryTimeoutMs = config.recoveryTimeoutMs || 30000;  // 30 seconds
        this.halfOpenRequests = config.halfOpenRequests || 3;  // Test requests
        
        // State
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = null;
        this.halfOpenSuccesses = 0;
        this.halfOpenFailures = 0;
        
        // Sliding window for rate calculation
        this.windowMs = config.windowMs || 10000;  // 10 second window
        this.requestHistory = [];  // [{timestamp, success}]
    }
    
    /**
     * Check if request should be allowed
     */
    allowRequest(currentTime) {
        this.cleanOldHistory(currentTime);
        
        switch (this.state) {
            case 'CLOSED':
                return { allowed: true };
                
            case 'OPEN':
                // Check if recovery timeout has passed
                if (this.lastFailureTime && 
                    Number(currentTime - this.lastFailureTime) / 1000 > this.recoveryTimeoutMs) {
                    this.transitionTo('HALF_OPEN', currentTime);
                    return { allowed: true, isTest: true };
                }
                return { 
                    allowed: false, 
                    reason: 'circuit_open',
                    retryAfterMs: this.recoveryTimeoutMs - 
                                 Number(currentTime - this.lastFailureTime) / 1000
                };
                
            case 'HALF_OPEN':
                // Allow limited requests
                const totalHalfOpen = this.halfOpenSuccesses + this.halfOpenFailures;
                if (totalHalfOpen < this.halfOpenRequests) {
                    return { allowed: true, isTest: true };
                }
                return { allowed: false, reason: 'half_open_limit' };
                
            default:
                return { allowed: true };
        }
    }
    
    /**
     * Record result of a request
     */
    recordResult(success, currentTime) {
        this.requestHistory.push({ timestamp: currentTime, success });
        
        switch (this.state) {
            case 'CLOSED':
                if (success) {
                    this.successes++;
                } else {
                    this.failures++;
                    this.lastFailureTime = currentTime;
                    
                    // Check if should trip
                    if (this.shouldTrip()) {
                        this.transitionTo('OPEN', currentTime);
                    }
                }
                break;
                
            case 'HALF_OPEN':
                if (success) {
                    this.halfOpenSuccesses++;
                    
                    // Check if enough successes to close
                    if (this.halfOpenSuccesses >= this.halfOpenRequests) {
                        this.transitionTo('CLOSED', currentTime);
                    }
                } else {
                    this.halfOpenFailures++;
                    this.lastFailureTime = currentTime;
                    this.transitionTo('OPEN', currentTime);
                }
                break;
        }
    }
    
    /**
     * Check if circuit should trip
     */
    shouldTrip() {
        const total = this.failures + this.successes;
        if (total < this.failureCount) return false;
        
        const failureRate = this.failures / total;
        return failureRate >= this.failureThreshold;
    }
    
    /**
     * Transition to new state
     */
    transitionTo(newState, currentTime) {
        const oldState = this.state;
        this.state = newState;
        
        console.log(`[CircuitBreaker:${this.name}] ${oldState} → ${newState}`);
        
        // Reset counters on state change
        if (newState === 'CLOSED') {
            this.failures = 0;
            this.successes = 0;
        } else if (newState === 'HALF_OPEN') {
            this.halfOpenSuccesses = 0;
            this.halfOpenFailures = 0;
        }
    }
    
    /**
     * Clean old entries from history
     */
    cleanOldHistory(currentTime) {
        const cutoff = currentTime - BigInt(this.windowMs * 1000);
        this.requestHistory = this.requestHistory.filter(r => r.timestamp > cutoff);
        
        // Recalculate from history
        this.successes = this.requestHistory.filter(r => r.success).length;
        this.failures = this.requestHistory.filter(r => !r.success).length;
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            failureRate: (this.failures + this.successes) > 0 
                ? this.failures / (this.failures + this.successes) 
                : 0
        };
    }
}
```

### 24.3 Bulkhead Pattern

```
    BULKHEAD PATTERN
    ════════════════
    
    Isolate components so failure in one doesn't sink the whole ship.
    (Named after ship compartments that contain flooding)
    
    
    WITHOUT BULKHEAD:
    ─────────────────
    
    ┌─────────────────────────────────────────────────────────────┐
    │                   SHARED THREAD POOL (100 threads)          │
    │                                                             │
    │   API A ────▶ ████████████████████████████████ (60 threads)│
    │   API B ────▶ ████████████████████ (40 threads)            │
    │   API C ────▶ (0 threads - starved!)                       │
    │                                                             │
    │   If API A's backend is slow, it consumes all threads!     │
    └─────────────────────────────────────────────────────────────┘
    
    
    WITH BULKHEAD:
    ──────────────
    
    ┌─────────────────────────────────────────────────────────────┐
    │                   ISOLATED POOLS                            │
    │                                                             │
    │   ┌─────────────────┐   ┌─────────────────┐                │
    │   │ API A Pool (40) │   │ API B Pool (40) │                │
    │   │ ████████████████│   │ ████████████    │                │
    │   │ (full - rejects)│   │ (has capacity)  │                │
    │   └─────────────────┘   └─────────────────┘                │
    │                                                             │
    │   ┌─────────────────┐                                      │
    │   │ API C Pool (20) │   API A slow? Only A is affected!   │
    │   │ ████            │   B and C continue normally.         │
    │   └─────────────────┘                                      │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
    
    
    BULKHEAD TYPES:
    ───────────────
    
    1. Thread Pool Isolation
       Separate thread pools per dependency
    
    2. Connection Pool Isolation
       Separate DB connection pools per service
    
    3. Semaphore Isolation
       Limit concurrent requests per dependency
    
    4. Process Isolation
       Separate processes/containers
```

### 24.4 Other Resilience Patterns

```javascript
/**
 * Resilience Patterns Collection
 */

// ═══════════════════════════════════════════════════════════════
// RETRY WITH EXPONENTIAL BACKOFF
// ═══════════════════════════════════════════════════════════════

class RetryPolicy {
    constructor(config) {
        this.maxAttempts = config.maxAttempts || 3;
        this.baseDelayMs = config.baseDelayMs || 100;
        this.maxDelayMs = config.maxDelayMs || 10000;
        this.multiplier = config.multiplier || 2;
        this.jitterFactor = config.jitterFactor || 0.2;
    }
    
    getDelay(attempt, random) {
        // Exponential backoff
        let delay = this.baseDelayMs * Math.pow(this.multiplier, attempt - 1);
        
        // Cap at max
        delay = Math.min(delay, this.maxDelayMs);
        
        // Add jitter to prevent thundering herd
        const jitter = delay * this.jitterFactor * (random() * 2 - 1);
        delay += jitter;
        
        return Math.max(0, delay);
    }
    
    shouldRetry(attempt, error) {
        if (attempt >= this.maxAttempts) return false;
        
        // Only retry on transient errors
        const retryableErrors = ['timeout', 'connection_error', '503', '502', '504'];
        return retryableErrors.includes(error?.code);
    }
}


// ═══════════════════════════════════════════════════════════════
// TIMEOUT WITH DEADLINE PROPAGATION
// ═══════════════════════════════════════════════════════════════

class TimeoutPolicy {
    constructor(config) {
        this.defaultTimeoutMs = config.defaultTimeoutMs || 5000;
    }
    
    /**
     * Calculate remaining timeout budget
     */
    getRemainingTimeout(request, currentTime) {
        if (!request.deadline) {
            // No deadline set, use default
            return this.defaultTimeoutMs;
        }
        
        const remaining = Number(request.deadline - currentTime) / 1000;
        return Math.max(0, remaining);
    }
    
    /**
     * Set deadline on outgoing request
     */
    propagateDeadline(parentRequest, childRequest, currentTime) {
        if (parentRequest.deadline) {
            // Child inherits parent's deadline
            childRequest.deadline = parentRequest.deadline;
        } else {
            // Set new deadline
            childRequest.deadline = currentTime + BigInt(this.defaultTimeoutMs * 1000);
        }
        
        return childRequest;
    }
    
    /**
     * Check if request has exceeded deadline
     */
    isExpired(request, currentTime) {
        if (!request.deadline) return false;
        return currentTime >= request.deadline;
    }
}


// ═══════════════════════════════════════════════════════════════
// LOAD SHEDDING
// ═══════════════════════════════════════════════════════════════

class LoadShedder {
    constructor(config) {
        this.maxQueueSize = config.maxQueueSize || 1000;
        this.maxLatencyMs = config.maxLatencyMs || 5000;
        this.shedStrategy = config.strategy || 'oldest';
    }
    
    /**
     * Decide whether to accept a new request
     */
    shouldAccept(queueState, request) {
        // Reject if queue is too long
        if (queueState.length >= this.maxQueueSize) {
            return { accept: false, reason: 'queue_full' };
        }
        
        // Reject if estimated wait time is too high
        const estimatedWait = this.estimateWaitTime(queueState);
        if (estimatedWait > this.maxLatencyMs) {
            return { accept: false, reason: 'wait_too_long' };
        }
        
        return { accept: true };
    }
    
    /**
     * Shed load when overloaded
     */
    shedLoad(queue) {
        switch (this.shedStrategy) {
            case 'oldest':
                // Drop oldest requests (likely already timed out)
                return queue.slice(-Math.floor(queue.length * 0.9));
                
            case 'newest':
                // Drop newest (preserve requests that waited)
                return queue.slice(0, Math.floor(queue.length * 0.9));
                
            case 'random':
                // Random sampling
                return queue.filter(() => Math.random() > 0.1);
                
            case 'priority':
                // Keep high priority, drop low
                return queue
                    .sort((a, b) => a.priority - b.priority)
                    .slice(0, Math.floor(queue.length * 0.9));
                
            default:
                return queue;
        }
    }
    
    estimateWaitTime(queueState) {
        return queueState.length * queueState.avgServiceTime;
    }
}


// ═══════════════════════════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════════════════════════

class RateLimiter {
    constructor(config) {
        this.algorithm = config.algorithm || 'token_bucket';
        this.rate = config.rate;  // requests per second
        this.burst = config.burst || config.rate;  // max burst
        
        // Token bucket state
        this.tokens = this.burst;
        this.lastRefill = null;
    }
    
    /**
     * Try to acquire permission to proceed
     */
    tryAcquire(currentTime) {
        if (this.algorithm === 'token_bucket') {
            return this.tokenBucketAcquire(currentTime);
        }
        // Add other algorithms as needed
        return { allowed: true };
    }
    
    tokenBucketAcquire(currentTime) {
        // Refill tokens based on time elapsed
        if (this.lastRefill) {
            const elapsedMs = Number(currentTime - this.lastRefill) / 1000;
            const tokensToAdd = (elapsedMs / 1000) * this.rate;
            this.tokens = Math.min(this.burst, this.tokens + tokensToAdd);
        }
        this.lastRefill = currentTime;
        
        // Try to consume a token
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return { allowed: true, remainingTokens: this.tokens };
        }
        
        // Calculate wait time
        const waitMs = ((1 - this.tokens) / this.rate) * 1000;
        return { 
            allowed: false, 
            reason: 'rate_limited',
            retryAfterMs: waitMs
        };
    }
}
```

---

## Chapter 25: Summary — Part 4 Key Takeaways

```
    PART 4 KEY TAKEAWAYS
    ════════════════════
    
    ✓ DISTRIBUTED SYSTEMS have complex request paths
      - Requests traverse multiple nodes
      - Each hop adds latency
      - Dependencies create failure coupling
    
    ✓ DEPENDENCY GRAPHS reveal failure propagation paths
      - Critical vs optional dependencies
      - Upstream vs downstream relationships
      - Transitive dependencies
    
    ✓ NETWORK LATENCY has multiple components
      - Propagation (distance / speed of light)
      - Transmission (size / bandwidth)
      - Processing (per-hop overhead)
      - Queuing (congestion-dependent, highly variable)
    
    ✓ REALISTIC LATENCY uses appropriate distributions
      - Same-DC: Log-normal, low variance
      - Cross-region: Log-normal, moderate variance
      - Internet: Mixture distributions, heavy tails
    
    ✓ FAILURES come in many forms
      - Crash, omission, timing, response, Byzantine
      - Resource exhaustion, overload, dependency failures
      - Deterministic vs probabilistic injection
    
    ✓ FAILURES PROPAGATE through the system
      - Timeout cascade
      - Retry amplification
      - Resource starvation
      - Thundering herd
      - Cache stampede
    
    ✓ RESILIENCE PATTERNS prevent cascades
      - Circuit Breaker: Stop calling failing services
      - Bulkhead: Isolate failure domains
      - Retry with backoff: Avoid retry storms
      - Timeout budgets: Propagate deadlines
      - Load shedding: Reject excess load gracefully
      - Rate limiting: Control request rate
```

---

**What's Next in Part 5:**
- DEVS (Discrete Event System Specification) formalism
- Hierarchical and coupled models
- Chaos engineering methodology
- Simulation output analysis
- Visualization and debugging tools
- Building production-ready simulators

---

*End of Part 4*