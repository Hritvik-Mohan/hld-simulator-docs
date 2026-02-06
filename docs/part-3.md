# PART 3: CORE DATA STRUCTURES & MECHANICS

## The Engine Room of Simulation

---

## Chapter 14: The Min-Heap — The Heart of Event Scheduling

### 14.1 The Problem We're Solving

In Part 2, we said "the event queue sorts events by timestamp." But HOW?

```
    THE CHALLENGE
    ═════════════
    
    We constantly need to:
    1. ADD new events (when things are scheduled)
    2. GET the earliest event (to process next)
    3. Do both FAST (millions of events!)
    
    
    NAIVE APPROACH: Sorted Array
    ────────────────────────────
    
    Events: [T=10, T=25, T=50, T=100, T=200]
    
    • Get minimum: O(1) ✓ (just take first element)
    • Insert new event: O(n) ✗ (must shift elements!)
    
    With 1 million events, insert takes 1 million operations!
    
    
    BETTER APPROACH: Min-Heap
    ─────────────────────────
    
    • Get minimum: O(1) ✓
    • Insert: O(log n) ✓
    • Remove minimum: O(log n) ✓
    
    With 1 million events, insert takes only ~20 operations!
```

### 14.2 What IS a Heap?

A **heap** is a special kind of binary tree with two properties:

```
    HEAP PROPERTIES
    ═══════════════
    
    1. SHAPE PROPERTY (Complete Binary Tree)
    ────────────────────────────────────────
    
    Every level is completely filled, except possibly the last.
    The last level fills left-to-right.
    
    Valid:                    Invalid:
    
          1                        1
        /   \                    /   \
       2     3                  2     3
      / \   /                  / \     \
     4   5 6                  4   5     6
                                      (gap!)
    
    
    2. HEAP PROPERTY (Parent ≤ Children for Min-Heap)
    ─────────────────────────────────────────────────
    
    Every parent is SMALLER than its children.
    The root is always the MINIMUM.
    
    Valid Min-Heap:           Invalid (5 > 2):
    
          1                        5
        /   \                    /   \
       2     3                  2     3
      / \   /                  / \   /
     4   5 6                  4   1 6
    
    Root (1) is minimum ✓     Root (5) is NOT minimum ✗
```

### 14.3 Why a Tree? The Power of Halving

```
    THE MAGIC OF BINARY TREES
    ═════════════════════════
    
    With 1,000,000 elements:
    
    Array search:    Check 1,000,000 elements
    Tree traversal:  Check ~20 levels (log₂ 1,000,000 ≈ 20)
    
    
    VISUALIZATION:
    
    Level 0:    1 node                    (root)
    Level 1:    2 nodes
    Level 2:    4 nodes
    Level 3:    8 nodes
    Level 4:    16 nodes
    ...
    Level 19:   524,288 nodes
    Level 20:   1,048,576 nodes           (leaves)
    
    
    To go from root to any leaf: only 20 steps!
    This is O(log n) — the secret sauce of efficient data structures.
```

### 14.4 Heap as an Array (The Clever Trick)

We DON'T actually store pointers. We use array indices:

```
    TREE VIEW                          ARRAY VIEW
    ═════════                          ══════════
    
              10                       Index:  0   1   2   3   4   5   6
            /    \                     Value: [10, 20, 15, 30, 25, 18, 17]
          20      15                           ↑
         /  \    /  \                         root
       30   25  18   17
    
    
    THE FORMULAS (0-indexed):
    ─────────────────────────
    
    For node at index i:
    
    • Parent index:      Math.floor((i - 1) / 2)
    • Left child index:  2 * i + 1
    • Right child index: 2 * i + 2
    
    
    EXAMPLE: Node at index 1 (value 20)
    
    • Parent: (1-1)/2 = 0 → value 10 ✓
    • Left child: 2*1+1 = 3 → value 30 ✓
    • Right child: 2*1+2 = 4 → value 25 ✓
    
    
    WHY ARRAY?
    ──────────
    
    • No pointer overhead (saves memory)
    • Cache-friendly (elements are contiguous)
    • Simple arithmetic instead of pointer chasing
```

### 14.5 Heap Operations: Insert (Bubble Up)

```
    INSERT: Add new element and restore heap property
    ═════════════════════════════════════════════════
    
    ALGORITHM:
    1. Add element at the END (maintains shape property)
    2. "Bubble up": swap with parent while smaller than parent
    
    
    EXAMPLE: Insert 5 into [10, 20, 15, 30, 25]
    
    
    Step 1: Add at end
    ──────────────────
    
              10                       [10, 20, 15, 30, 25, 5]
            /    \                                         ↑
          20      15                                    new element
         /  \    /
       30   25  5  ← New element (index 5)
    
    
    Step 2: Compare with parent
    ───────────────────────────
    
    5 at index 5
    Parent at index (5-1)/2 = 2, value = 15
    
    Is 5 < 15? YES → SWAP!
    
              10                       [10, 20, 5, 30, 25, 15]
            /    \                              ↑
          20      5  ← Moved up!
         /  \    /
       30   25  15
    
    
    Step 3: Continue comparing
    ─────────────────────────
    
    5 at index 2
    Parent at index (2-1)/2 = 0, value = 10
    
    Is 5 < 10? YES → SWAP!
    
              5  ← Now at root!         [5, 20, 10, 30, 25, 15]
            /    \
          20      10
         /  \    /
       30   25  15
    
    
    Step 4: Check again
    ───────────────────
    
    5 at index 0 (root)
    No parent. DONE!
    
    
    COMPLEXITY: O(log n)
    ─────────────────────
    At most, we traverse from leaf to root = tree height = log n
```

### 14.6 Heap Operations: Extract Min (Bubble Down)

```
    EXTRACT MIN: Remove root and restore heap property
    ═══════════════════════════════════════════════════
    
    ALGORITHM:
    1. Save the root (minimum) to return
    2. Move LAST element to root (maintains shape)
    3. "Bubble down": swap with smaller child while larger
    
    
    EXAMPLE: Extract min from [5, 20, 10, 30, 25, 15]
    
    
    Step 1: Save root, move last to root
    ─────────────────────────────────────
    
    Saved: 5 (will return this)
    
              15 ← Was at end          [15, 20, 10, 30, 25]
            /    \
          20      10
         /  \
       30   25
    
    
    Step 2: Bubble down
    ───────────────────
    
    15 at index 0
    Left child (index 1): 20
    Right child (index 2): 10
    
    Smaller child: 10 (index 2)
    Is 15 > 10? YES → SWAP!
    
              10                       [10, 20, 15, 30, 25]
            /    \
          20      15 ← Swapped down
         /  \
       30   25
    
    
    Step 3: Continue bubbling
    ─────────────────────────
    
    15 at index 2
    Left child (index 5): doesn't exist
    Right child (index 6): doesn't exist
    
    No children. DONE!
    
    Return saved value: 5
    
    
    COMPLEXITY: O(log n)
    ─────────────────────
    At most, we traverse from root to leaf = tree height = log n
```

### 14.7 Complete Min-Heap Implementation

```javascript
/**
 * MinHeap for Event Queue
 * 
 * Each element is an event with a 'timestamp' property.
 * The event with the smallest timestamp is always at the root.
 */
class MinHeap {
    constructor() {
        this.heap = [];
    }
    
    // ═══════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════
    
    // Get parent index
    parent(i) {
        return Math.floor((i - 1) / 2);
    }
    
    // Get left child index
    leftChild(i) {
        return 2 * i + 1;
    }
    
    // Get right child index
    rightChild(i) {
        return 2 * i + 2;
    }
    
    // Swap two elements
    swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
    
    // Compare by timestamp
    isSmaller(i, j) {
        return this.heap[i].timestamp < this.heap[j].timestamp;
    }
    
    // ═══════════════════════════════════════════════════════════
    // CORE OPERATIONS
    // ═══════════════════════════════════════════════════════════
    
    /**
     * INSERT: Add event to heap
     * Time: O(log n)
     */
    insert(event) {
        // Add at end
        this.heap.push(event);
        
        // Bubble up
        let i = this.heap.length - 1;
        while (i > 0 && this.isSmaller(i, this.parent(i))) {
            this.swap(i, this.parent(i));
            i = this.parent(i);
        }
    }
    
    /**
     * EXTRACT MIN: Remove and return smallest event
     * Time: O(log n)
     */
    extractMin() {
        if (this.heap.length === 0) {
            return null;
        }
        
        if (this.heap.length === 1) {
            return this.heap.pop();
        }
        
        // Save minimum
        const min = this.heap[0];
        
        // Move last to root
        this.heap[0] = this.heap.pop();
        
        // Bubble down
        this.bubbleDown(0);
        
        return min;
    }
    
    /**
     * BUBBLE DOWN: Restore heap property from index i
     */
    bubbleDown(i) {
        const n = this.heap.length;
        
        while (true) {
            const left = this.leftChild(i);
            const right = this.rightChild(i);
            let smallest = i;
            
            // Check if left child is smaller
            if (left < n && this.isSmaller(left, smallest)) {
                smallest = left;
            }
            
            // Check if right child is smaller
            if (right < n && this.isSmaller(right, smallest)) {
                smallest = right;
            }
            
            // If current is smallest, we're done
            if (smallest === i) {
                break;
            }
            
            // Swap and continue
            this.swap(i, smallest);
            i = smallest;
        }
    }
    
    /**
     * PEEK: Look at minimum without removing
     * Time: O(1)
     */
    peek() {
        return this.heap.length > 0 ? this.heap[0] : null;
    }
    
    /**
     * SIZE: Get number of elements
     * Time: O(1)
     */
    size() {
        return this.heap.length;
    }
    
    /**
     * IS EMPTY: Check if heap is empty
     * Time: O(1)
     */
    isEmpty() {
        return this.heap.length === 0;
    }
}


// ═══════════════════════════════════════════════════════════════
// USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════

const eventQueue = new MinHeap();

// Schedule events (not in order!)
eventQueue.insert({ timestamp: 100, type: 'ARRIVAL', id: 'R1' });
eventQueue.insert({ timestamp: 50,  type: 'ARRIVAL', id: 'R2' });
eventQueue.insert({ timestamp: 200, type: 'TIMEOUT', id: 'R1' });
eventQueue.insert({ timestamp: 75,  type: 'COMPLETE', id: 'R2' });

// Process in order
while (!eventQueue.isEmpty()) {
    const event = eventQueue.extractMin();
    console.log(`T=${event.timestamp}: ${event.type} for ${event.id}`);
}

// Output:
// T=50: ARRIVAL for R2
// T=75: COMPLETE for R2
// T=100: ARRIVAL for R1
// T=200: TIMEOUT for R1
```

### 14.8 Visual Trace of Event Processing

```
    COMPLETE TRACE: Event Queue with Min-Heap
    ══════════════════════════════════════════
    
    INITIAL: Insert 4 events
    
    insert(T=100) → heap: [100]
    insert(T=50)  → heap: [50, 100]        (50 bubbled up)
    insert(T=200) → heap: [50, 100, 200]
    insert(T=75)  → heap: [50, 75, 200, 100]  (75 bubbled up)
    
    Heap structure:
              50
            /    \
          75      200
         /
       100
    
    
    PROCESSING: Extract events in order
    
    extractMin() → returns 50
                   heap becomes [75, 100, 200]
    
              75
            /    \
          100    200
    
    extractMin() → returns 75
                   heap becomes [100, 200]
    
              100
             /
           200
    
    extractMin() → returns 100
                   heap becomes [200]
    
              200
    
    extractMin() → returns 200
                   heap becomes []
    
    
    EVENTS PROCESSED IN ORDER: 50, 75, 100, 200 ✓
```

---

## Chapter 15: Precision and Determinism — BigInt and Seeded PRNGs

### 15.1 The Floating-Point Problem

```
    THE PROBLEM WITH REGULAR NUMBERS
    ════════════════════════════════
    
    JavaScript (and most languages) use floating-point numbers.
    They have PRECISION LIMITS.
    
    
    DEMONSTRATION:
    ──────────────
    
    > 0.1 + 0.2
    0.30000000000000004    ← NOT exactly 0.3!
    
    > 0.1 + 0.2 === 0.3
    false                   ← Equality fails!
    
    
    WHY IT MATTERS FOR SIMULATION:
    ──────────────────────────────
    
    After millions of events, small errors accumulate:
    
    Event 1:     timestamp = 0.001
    Event 2:     timestamp = 0.001 + 0.001 = 0.002
    Event 3:     timestamp = 0.002 + 0.001 = 0.003
    ...
    Event 1M:    timestamp = 999.999999999847  ← Error creeping in!
    
    Eventually: Two events that SHOULD be at the same time... aren't!
    
    This breaks DETERMINISM.
```

### 15.2 The Solution: BigInt for Timestamps

```
    BIGINT: Arbitrary Precision Integers
    ════════════════════════════════════
    
    JavaScript's BigInt can represent ANY integer exactly.
    
    
    APPROACH:
    ─────────
    
    Instead of:  timestamp = 0.001  (seconds, float)
    Use:         timestamp = 1000n  (microseconds, BigInt)
    
    
    CONVERSION:
    ───────────
    
    1 second     = 1,000,000 microseconds = 1000000n
    1 millisecond = 1,000 microseconds    = 1000n
    1 microsecond = 1 microsecond         = 1n
    
    
    EXAMPLE:
    ────────
    
    // Old way (imprecise)
    const time1 = 0.001;
    const time2 = time1 + 0.001;  // Might have floating-point error
    
    // New way (exact)
    const time1 = 1000n;          // 1 millisecond in microseconds
    const time2 = time1 + 1000n;  // Exactly 2000n, no error ever
    
    
    OPERATIONS:
    ───────────
    
    const a = 1000000n;
    const b = 500000n;
    
    a + b    // 1500000n ✓
    a - b    // 500000n ✓
    a * 2n   // 2000000n ✓ (must use BigInt literal)
    a / 3n   // 333333n (integer division, truncates)
    a > b    // true ✓
    a === b  // false ✓
    
    // CANNOT mix with regular numbers!
    a + 1    // TypeError!
    a + 1n   // Works ✓
```

### 15.3 Updated Event Structure with BigInt

```javascript
/**
 * Event with BigInt timestamp for perfect precision
 */
interface Event {
    timestamp: bigint;      // Microseconds since simulation start
    type: string;
    data: any;
    priority?: number;      // For same-timestamp ordering
}

/**
 * Helper functions for time conversion
 */
const TimeUtils = {
    // Convert milliseconds to microseconds (BigInt)
    msToMicro(ms: number): bigint {
        return BigInt(Math.round(ms * 1000));
    },
    
    // Convert microseconds (BigInt) to milliseconds
    microToMs(micro: bigint): number {
        return Number(micro) / 1000;
    },
    
    // Convert seconds to microseconds (BigInt)
    secToMicro(sec: number): bigint {
        return BigInt(Math.round(sec * 1000000));
    }
};

// Usage
const event1 = {
    timestamp: TimeUtils.msToMicro(50.5),  // 50500n
    type: 'ARRIVAL',
    data: { requestId: 'R1' }
};

const event2 = {
    timestamp: event1.timestamp + 1000n,   // Exactly 51500n (50.5ms + 1ms)
    type: 'COMPLETE',
    data: { requestId: 'R1' }
};
```

### 15.4 Handling Same-Timestamp Events

```
    THE TIE-BREAKING PROBLEM
    ════════════════════════
    
    What if two events have the SAME timestamp?
    
    Event A: { timestamp: 1000n, type: 'ARRIVAL' }
    Event B: { timestamp: 1000n, type: 'TIMEOUT' }
    
    Which should process first?
    
    
    SOLUTION: Secondary Sort Key (Priority)
    ───────────────────────────────────────
    
    Add a priority field. Lower priority = process first.
    
    Event A: { timestamp: 1000n, priority: 1, type: 'ARRIVAL' }
    Event B: { timestamp: 1000n, priority: 2, type: 'TIMEOUT' }
    
    A processes before B (priority 1 < 2)
    
    
    TYPICAL PRIORITY ORDER:
    ───────────────────────
    
    Priority 0: System events (metrics snapshots)
    Priority 1: Arrivals (new work entering)
    Priority 2: Processing events (work completing)
    Priority 3: Departure events (work leaving)
    Priority 4: Timeout events (failures)
    Priority 5: Cleanup events
```

### 15.5 Updated Min-Heap Comparison

```javascript
class EventHeap {
    // ...
    
    /**
     * Compare two events
     * Returns true if event at index i should come before event at index j
     */
    shouldComeBefore(i, j) {
        const a = this.heap[i];
        const b = this.heap[j];
        
        // First compare by timestamp
        if (a.timestamp !== b.timestamp) {
            return a.timestamp < b.timestamp;
        }
        
        // Same timestamp: compare by priority
        const priorityA = a.priority ?? 100;  // Default priority
        const priorityB = b.priority ?? 100;
        
        return priorityA < priorityB;
    }
    
    // Use shouldComeBefore() instead of simple < comparison
    // in insert() and extractMin()
}
```

### 15.6 Deterministic Random Number Generation

```
    THE RANDOMNESS PARADOX
    ══════════════════════
    
    We NEED randomness for realistic simulations.
    But we NEED determinism for reproducibility.
    
    Solution: PSEUDO-random number generators (PRNGs)
    
    • Given the same SEED, they produce the same sequence
    • The sequence LOOKS random (passes statistical tests)
    • But it's 100% reproducible
```

### 15.7 SFC32: A Fast, Quality PRNG

```javascript
/**
 * SFC32 (Small Fast Counter) PRNG
 * 
 * - Passes all BigCrush tests (high quality)
 * - Very fast (simple arithmetic operations)
 * - 128-bit state (2^128 period)
 * - Seedable for reproducibility
 */

/**
 * Create a seed generator from a string
 * Converts any string into 4 32-bit seeds
 */
function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function() {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}

/**
 * SFC32 PRNG
 * Returns a function that generates random numbers in [0, 1)
 */
function sfc32(a, b, c, d) {
    return function() {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        let t = (a + b) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        d = (d + 1) | 0;
        t = (t + d) | 0;
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
    };
}

/**
 * Create a seeded random number generator
 */
function createRandom(seedString) {
    const seed = xmur3(seedString);
    return sfc32(seed(), seed(), seed(), seed());
}


// ═══════════════════════════════════════════════════════════════
// USAGE
// ═══════════════════════════════════════════════════════════════

const random1 = createRandom("my-simulation-seed");
console.log(random1());  // 0.7394...
console.log(random1());  // 0.2847...
console.log(random1());  // 0.9123...

const random2 = createRandom("my-simulation-seed");
console.log(random2());  // 0.7394... (identical!)
console.log(random2());  // 0.2847... (identical!)
console.log(random2());  // 0.9123... (identical!)

const random3 = createRandom("different-seed");
console.log(random3());  // 0.1538... (different sequence)
```

### 15.8 Generating Distributions from Uniform Random

```javascript
/**
 * Distribution generators using seeded PRNG
 */
class Distributions {
    constructor(seedString) {
        this.random = createRandom(seedString);
    }
    
    /**
     * Uniform distribution in [min, max)
     */
    uniform(min, max) {
        return min + this.random() * (max - min);
    }
    
    /**
     * Exponential distribution with given rate (lambda)
     * Mean = 1/lambda
     */
    exponential(lambda) {
        return -Math.log(1 - this.random()) / lambda;
    }
    
    /**
     * Normal (Gaussian) distribution
     * Uses Box-Muller transform
     */
    normal(mean = 0, stdDev = 1) {
        const u1 = this.random();
        const u2 = this.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + stdDev * z;
    }
    
    /**
     * Log-normal distribution
     * If ln(X) is normal(mu, sigma), then X is log-normal
     */
    logNormal(mu, sigma) {
        return Math.exp(this.normal(mu, sigma));
    }
    
    /**
     * Poisson distribution (integer)
     * Number of events in interval with rate lambda
     */
    poisson(lambda) {
        const L = Math.exp(-lambda);
        let k = 0;
        let p = 1;
        
        do {
            k++;
            p *= this.random();
        } while (p > L);
        
        return k - 1;
    }
    
    /**
     * Generate from a config object
     */
    fromConfig(config) {
        switch (config.type) {
            case 'constant':
                return config.value;
            case 'uniform':
                return this.uniform(config.min, config.max);
            case 'exponential':
                return this.exponential(config.rate);
            case 'normal':
                return this.normal(config.mean, config.stdDev);
            case 'log-normal':
                return this.logNormal(config.mu, config.sigma);
            case 'poisson':
                return this.poisson(config.lambda);
            default:
                throw new Error(`Unknown distribution: ${config.type}`);
        }
    }
}


// ═══════════════════════════════════════════════════════════════
// USAGE
// ═══════════════════════════════════════════════════════════════

const dist = new Distributions("simulation-seed-42");

// API latency (log-normal, median ~20ms)
const latency = dist.logNormal(3.0, 0.8);
console.log(`Latency: ${latency.toFixed(2)}ms`);

// Inter-arrival time (exponential, 100 req/sec)
const interArrival = dist.exponential(100);
console.log(`Next arrival in: ${(interArrival * 1000).toFixed(2)}ms`);

// From config
const config = { type: 'log-normal', mu: 3.0, sigma: 0.8 };
const value = dist.fromConfig(config);
```

---

## Chapter 16: The G/G/c/K Queueing Model — Formalizing Node Behavior

### 16.1 Kendall's Notation Explained

```
    KENDALL'S NOTATION: A/S/c/K/N/D
    ════════════════════════════════
    
    A / S / c / K / N / D
    │   │   │   │   │   │
    │   │   │   │   │   └── Queue discipline (FIFO, LIFO, Priority)
    │   │   │   │   └────── Population size (usually infinite)
    │   │   │   └────────── System capacity (queue + servers)
    │   │   └────────────── Number of servers (workers)
    │   └────────────────── Service time distribution
    └────────────────────── Arrival time distribution
    
    
    COMMON ABBREVIATIONS:
    ─────────────────────
    
    M = Markovian (exponential distribution)
        "Memoryless" — past doesn't affect future
        
    D = Deterministic (constant)
        Always exactly the same value
        
    G = General
        Any distribution (the most flexible)
    
    
    WHEN NOT SPECIFIED:
    ───────────────────
    
    A/S/c     means A/S/c/∞/∞/FIFO (infinite capacity, infinite population, FIFO)
    A/S/c/K   means A/S/c/K/∞/FIFO (finite capacity, infinite population, FIFO)
```

### 16.2 Common Queue Models

```
    QUEUE MODEL EXAMPLES
    ════════════════════
    
    
    M/M/1
    ─────
    • Exponential arrivals, exponential service, 1 server
    • Simplest analytically tractable model
    • Example: Simple web server, single checkout lane
    
        ──▶ [  QUEUE  ] ──▶ [ SERVER ] ──▶
    
    
    M/M/c
    ─────
    • Exponential arrivals, exponential service, c servers
    • Classic multi-server model
    • Example: Call center, bank tellers
    
                               ┌──▶ [S1] ──┐
        ──▶ [  QUEUE  ] ──────┼──▶ [S2] ──┼──▶
                               └──▶ [S3] ──┘
    
    
    M/D/1
    ─────
    • Exponential arrivals, deterministic (fixed) service, 1 server
    • Example: Packet switch (fixed-size packets)
    
        ──▶ [  QUEUE  ] ──▶ [ SERVER ] ──▶
                           (fixed time)
    
    
    G/G/1
    ─────
    • General arrivals, general service, 1 server
    • Most flexible, but no simple formulas
    • Must use simulation!
    
    
    G/G/c/K  ← THIS IS WHAT WE USE
    ────────
    • General arrivals
    • General service times
    • c parallel servers
    • K total capacity (queue + in service)
    
    This is the REALISTIC model for production systems!
    
                                        ┌──▶ [S1] ──┐
        ──▶ [ QUEUE (max K-c) ] ───────┼──▶ [S2] ──┼──▶
             │                          └──▶ [Sc] ──┘
             │
         (reject if full)
```

### 16.3 Why G/G/c/K for Real Systems?

```
    REAL SYSTEMS ARE NOT "M"
    ════════════════════════
    
    
    ARRIVALS ARE NOT EXPONENTIAL:
    ─────────────────────────────
    
    Real traffic is BURSTY:
    
    Exponential:    ● ● ● ● ● ● ● ● ● ●  (evenly spread)
    Real traffic:   ●●●●    ●  ●●●●●●●   ●●  (clustered)
    
    • Flash crowds (Black Friday)
    • Retry storms
    • Batch job releases
    • Time-of-day patterns
    
    
    SERVICE TIMES ARE NOT EXPONENTIAL:
    ───────────────────────────────────
    
    Real processing times are LOG-NORMAL:
    
    Exponential:     Most requests medium, few short, few long
    Log-normal:      Most requests SHORT, some medium, FEW VERY LONG
    
    The "long tail" of slow requests is where problems hide!
    
    
    QUEUES ARE NOT INFINITE:
    ────────────────────────
    
    Real systems have LIMITS:
    
    • Memory is finite
    • Connection pools have max size
    • Rate limiters have thresholds
    
    When queue is full → REJECTION (HTTP 503)
    
    
    CONCLUSION:
    ───────────
    
    M/M/1 is nice for textbooks.
    G/G/c/K is what you need for reality.
    
    And for G/G/c/K, there are NO SIMPLE FORMULAS.
    You must SIMULATE.
```

### 16.4 Implementing a G/G/c/K Node

```javascript
/**
 * G/G/c/K Queue Node
 * 
 * - General arrival distribution (handled externally)
 * - General service distribution
 * - c parallel workers
 * - K total capacity (queue + workers)
 */
class GGcKNode {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        
        // Capacity
        this.numWorkers = config.workers;              // c
        this.maxCapacity = config.capacity;            // K
        this.maxQueueSize = this.maxCapacity - this.numWorkers;
        
        // Service time distribution
        this.serviceTimeConfig = config.serviceTime;   // e.g., {type: 'log-normal', mu: 3, sigma: 0.8}
        
        // Queue policy
        this.queuePolicy = config.queuePolicy || 'FIFO';
        
        // State
        this.queue = [];                               // Waiting requests
        this.activeWorkers = new Set();                // Request IDs being processed
        
        // Metrics
        this.metrics = {
            totalArrivals: 0,
            totalDepartures: 0,
            totalRejections: 0,
            totalQueueTime: 0,
            totalServiceTime: 0,
            maxQueueLength: 0
        };
        
        // Dependencies
        this.distributions = null;  // Set by simulator
        this.scheduler = null;      // Set by simulator
    }
    
    /**
     * Handle request arrival
     */
    handleArrival(request, currentTime) {
        this.metrics.totalArrivals++;
        
        // Check capacity
        const currentLoad = this.queue.length + this.activeWorkers.size;
        
        if (currentLoad >= this.maxCapacity) {
            // REJECT: System at capacity
            this.metrics.totalRejections++;
            return { accepted: false, reason: 'capacity_exceeded' };
        }
        
        // Record arrival time
        request.nodeArrivalTime = currentTime;
        
        if (this.activeWorkers.size < this.numWorkers) {
            // Worker available: start processing immediately
            this.startProcessing(request, currentTime);
        } else {
            // All workers busy: add to queue
            this.queue.push(request);
            this.metrics.maxQueueLength = Math.max(
                this.metrics.maxQueueLength,
                this.queue.length
            );
        }
        
        return { accepted: true };
    }
    
    /**
     * Start processing a request
     */
    startProcessing(request, currentTime) {
        // Mark as active
        this.activeWorkers.add(request.id);
        
        // Record queue time (if any)
        if (request.nodeArrivalTime) {
            const queueTime = Number(currentTime - request.nodeArrivalTime);
            this.metrics.totalQueueTime += queueTime;
            request.queueTime = queueTime;
        }
        
        // Generate service time
        const serviceTime = this.distributions.fromConfig(this.serviceTimeConfig);
        const serviceTimeMicro = BigInt(Math.round(serviceTime * 1000)); // ms to μs
        
        // Schedule completion
        this.scheduler.schedule(
            currentTime + serviceTimeMicro,
            'PROCESSING_COMPLETE',
            { nodeId: this.id, request: request },
            2  // priority
        );
        
        request.serviceStartTime = currentTime;
        request.expectedServiceTime = serviceTime;
    }
    
    /**
     * Handle processing completion
     */
    handleCompletion(request, currentTime) {
        this.metrics.totalDepartures++;
        
        // Remove from active
        this.activeWorkers.delete(request.id);
        
        // Record service time
        const serviceTime = Number(currentTime - request.serviceStartTime);
        this.metrics.totalServiceTime += serviceTime;
        request.actualServiceTime = serviceTime;
        
        // Check if more work waiting
        if (this.queue.length > 0) {
            const nextRequest = this.dequeue();
            this.startProcessing(nextRequest, currentTime);
        }
        
        return request;
    }
    
    /**
     * Dequeue based on policy
     */
    dequeue() {
        switch (this.queuePolicy) {
            case 'FIFO':
                return this.queue.shift();  // First in, first out
            case 'LIFO':
                return this.queue.pop();    // Last in, first out
            case 'PRIORITY':
                // Find highest priority (lowest number)
                let minIdx = 0;
                for (let i = 1; i < this.queue.length; i++) {
                    if (this.queue[i].priority < this.queue[minIdx].priority) {
                        minIdx = i;
                    }
                }
                return this.queue.splice(minIdx, 1)[0];
            default:
                return this.queue.shift();
        }
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            queueLength: this.queue.length,
            activeWorkers: this.activeWorkers.size,
            utilization: this.activeWorkers.size / this.numWorkers,
            totalInSystem: this.queue.length + this.activeWorkers.size
        };
    }
    
    /**
     * Get metrics summary
     */
    getMetrics() {
        const avgQueueTime = this.metrics.totalDepartures > 0
            ? this.metrics.totalQueueTime / this.metrics.totalDepartures
            : 0;
        const avgServiceTime = this.metrics.totalDepartures > 0
            ? this.metrics.totalServiceTime / this.metrics.totalDepartures
            : 0;
        
        return {
            ...this.metrics,
            avgQueueTime,
            avgServiceTime,
            avgTotalTime: avgQueueTime + avgServiceTime,
            rejectionRate: this.metrics.totalArrivals > 0
                ? this.metrics.totalRejections / this.metrics.totalArrivals
                : 0
        };
    }
}
```

### 16.5 Queue Policies: FIFO, LIFO, Priority

```
    QUEUE POLICIES
    ══════════════
    
    
    1. FIFO (First In, First Out)
    ─────────────────────────────
    
    The default. Fair. Predictable.
    
    Arrival order:   A → B → C → D
    Processing order: A → B → C → D
    
    Use when: Most situations. Fairness matters.
    
    
    2. LIFO (Last In, First Out)
    ────────────────────────────
    
    Most recent items processed first.
    Can starve old items!
    
    Arrival order:    A → B → C → D
    Processing order: D → C → B → A
    
    Use when: Recent data is more valuable (caches, undo stacks)
    
    
    3. PRIORITY
    ───────────
    
    Items with higher priority processed first.
    
    Arrivals:         A(p=3) → B(p=1) → C(p=2) → D(p=1)
    Processing order: B → D → C → A
    
    Use when: Some requests are more important
              (premium users, time-sensitive operations)
    
    
    4. WEIGHTED FAIR QUEUING
    ────────────────────────
    
    Multiple sub-queues with weighted round-robin.
    
    Queue 1 (weight 2): [A, B, C]
    Queue 2 (weight 1): [X, Y]
    
    Processing: A, B, X, C, Y, (repeat)
    
    Use when: Different classes of traffic need guarantees
```

---

## Chapter 17: Workload Generation — Creating Realistic Traffic

### 17.1 The Workload Generator Node

```
    WORKLOAD GENERATOR
    ══════════════════
    
    This is the SOURCE node that creates requests.
    It simulates users, clients, or external systems.
    
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │   WORKLOAD GENERATOR                                        │
    │                                                             │
    │   Controls:                                                 │
    │   • HOW FAST requests arrive (arrival rate)                │
    │   • WHEN requests arrive (arrival pattern)                 │
    │   • WHAT requests look like (size, type, etc.)             │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

### 17.2 Arrival Patterns

```javascript
/**
 * Workload Generator
 * 
 * Generates requests according to various traffic patterns.
 */
class WorkloadGenerator {
    constructor(config) {
        this.config = config;
        this.distributions = null;  // Set by simulator
        this.scheduler = null;      // Set by simulator
        this.requestCounter = 0;
    }
    
    /**
     * Initialize and schedule first arrival
     */
    initialize(currentTime) {
        this.scheduleNextArrival(currentTime);
    }
    
    /**
     * Schedule the next arrival based on pattern
     */
    scheduleNextArrival(currentTime) {
        const pattern = this.config.trafficPattern;
        let interArrivalTime;
        
        switch (pattern.type) {
            case 'constant':
                // Fixed interval between arrivals
                interArrivalTime = 1000 / pattern.requestsPerSecond;
                break;
                
            case 'poisson':
                // Random arrivals (exponential inter-arrival)
                const rate = pattern.averageRequestsPerSecond / 1000; // per ms
                interArrivalTime = this.distributions.exponential(rate);
                break;
                
            case 'bursty':
                // Alternating between base and burst rates
                interArrivalTime = this.calculateBurstyInterval(currentTime, pattern);
                break;
                
            case 'diurnal':
                // Time-of-day pattern
                interArrivalTime = this.calculateDiurnalInterval(currentTime, pattern);
                break;
                
            case 'spike':
                // Normal + sudden spike
                interArrivalTime = this.calculateSpikeInterval(currentTime, pattern);
                break;
                
            default:
                interArrivalTime = 10; // Default 100 req/sec
        }
        
        // Convert to microseconds and schedule
        const arrivalTime = currentTime + BigInt(Math.round(interArrivalTime * 1000));
        
        // Check if within simulation duration
        if (arrivalTime < this.config.simulationDuration) {
            this.scheduler.schedule(
                arrivalTime,
                'REQUEST_GENERATED',
                { generatorId: this.config.id },
                1  // priority
            );
        }
    }
    
    /**
     * Generate a request
     */
    generateRequest(currentTime) {
        this.requestCounter++;
        
        const request = {
            id: `req-${this.requestCounter}`,
            generatedAt: currentTime,
            type: this.selectRequestType(),
            size: this.generateRequestSize(),
            priority: this.generatePriority(),
            timeout: this.config.timeout || 30000n * 1000n  // 30s in μs
        };
        
        // Schedule next arrival
        this.scheduleNextArrival(currentTime);
        
        return request;
    }
    
    /**
     * Calculate interval for bursty traffic
     */
    calculateBurstyInterval(currentTime, pattern) {
        const cycleTime = pattern.burstIntervalMs + pattern.burstDurationMs;
        const positionInCycle = Number(currentTime / 1000n) % cycleTime;
        
        if (positionInCycle < pattern.burstDurationMs) {
            // In burst period
            return 1000 / pattern.burstRPS;
        } else {
            // In normal period
            return 1000 / pattern.baseRPS;
        }
    }
    
    /**
     * Calculate interval for diurnal (24-hour) traffic
     */
    calculateDiurnalInterval(currentTime, pattern) {
        // Get hour of day (0-23)
        const msInDay = 24 * 60 * 60 * 1000;
        const msFromStart = Number(currentTime / 1000n);
        const hour = Math.floor((msFromStart % msInDay) / (60 * 60 * 1000));
        
        // Get multiplier for this hour
        const multiplier = pattern.hourlyMultipliers[hour] || 1.0;
        
        // Calculate RPS for this hour
        const currentRPS = pattern.baseRPS * multiplier;
        
        // Poisson process with current rate
        const rate = currentRPS / 1000;
        return this.distributions.exponential(rate);
    }
    
    /**
     * Calculate interval for spike traffic
     */
    calculateSpikeInterval(currentTime, pattern) {
        const currentMs = Number(currentTime / 1000n);
        const spikeStart = pattern.spikeAtMs;
        const spikeEnd = spikeStart + pattern.spikeDurationMs;
        
        let rps;
        if (currentMs >= spikeStart && currentMs < spikeEnd) {
            // In spike period
            rps = pattern.spikeRPS;
        } else {
            // Normal period
            rps = pattern.baseRPS;
        }
        
        // Poisson process
        const rate = rps / 1000;
        return this.distributions.exponential(rate);
    }
    
    /**
     * Select request type based on distribution
     */
    selectRequestType() {
        const typeConfig = this.config.requestConfig?.typeDistribution;
        if (!typeConfig) return 'DEFAULT';
        
        const r = this.distributions.random() * 100;
        let cumulative = 0;
        
        for (const [type, percentage] of Object.entries(typeConfig)) {
            cumulative += percentage;
            if (r < cumulative) return type;
        }
        
        return Object.keys(typeConfig)[0];
    }
    
    /**
     * Generate request size
     */
    generateRequestSize() {
        const sizeConfig = this.config.requestConfig?.sizeDistribution;
        if (!sizeConfig) return 1024; // Default 1KB
        
        return Math.round(this.distributions.fromConfig(sizeConfig));
    }
    
    /**
     * Generate priority
     */
    generatePriority() {
        // 90% normal, 10% high priority
        return this.distributions.random() < 0.1 ? 1 : 5;
    }
}
```

### 17.3 Visualizing Traffic Patterns

```
    TRAFFIC PATTERN VISUALIZATIONS
    ═══════════════════════════════
    
    
    1. CONSTANT (100 req/sec)
    ─────────────────────────
    
    RPS │
    100 │ ────────────────────────────────────────
        │
      0 └────────────────────────────────────────▶ Time
    
    Predictable, steady load. Good for baseline testing.
    
    
    2. POISSON (avg 100 req/sec)
    ────────────────────────────
    
    RPS │
    150 │         ╱╲       ╱╲
    100 │ ──────╱──╲─────╱──╲───────────────────
     50 │    ╱╲    ╲   ╱    ╲  ╱╲
        │  ╱  ╲    ╲╱        ╲╱  ╲
      0 └────────────────────────────────────────▶ Time
    
    Natural variation. Most realistic for user traffic.
    
    
    3. BURSTY
    ─────────
    
    RPS │
    500 │    ████        ████        ████
        │    █  █        █  █        █  █
    100 │ ███    ████████    ████████    ████
        │
      0 └────────────────────────────────────────▶ Time
    
    Periodic spikes. Models batch jobs, scheduled tasks.
    
    
    4. DIURNAL (24-hour pattern)
    ────────────────────────────
    
    RPS │
    200 │                 ╱──╲
    150 │              ╱╱    ╲╲    ╱──╲
    100 │           ╱╱╱        ╲╲╱╱    ╲╲
     50 │      ╱╱╱╱               ╲╲╲╲
     20 │ ─────                       ─────
        └────────────────────────────────────────▶
         12am  6am  12pm  6pm  12am
    
    Day/night cycle. Models real user behavior.
    
    
    5. SPIKE (Black Friday)
    ───────────────────────
    
    RPS  │
    1000 │           ███████
         │          █       █
     100 │ ─────────         ───────────────────
         │
       0 └────────────────────────────────────────▶ Time
              ↑         ↑
           Spike     Spike
           start      end
    
    Sudden load increase. Tests autoscaling, capacity limits.
    
    
    6. SAWTOOTH (Gradual ramp + sudden drop)
    ────────────────────────────────────────
    
    RPS │
    200 │     ╱│    ╱│    ╱│
    150 │   ╱  │  ╱  │  ╱  │
    100 │ ╱    │╱    │╱    │
     50 │
      0 └────────────────────────────────────────▶ Time
    
    Models queue draining. Tests recovery behavior.
```

---

## Chapter 18: Putting It All Together — The Simulation Engine

### 18.1 Engine Architecture

```
    SIMULATION ENGINE ARCHITECTURE
    ══════════════════════════════
    
    ┌─────────────────────────────────────────────────────────────┐
    │                    SIMULATION ENGINE                        │
    │                                                             │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
    │  │   CONFIG    │  │    PRNG     │  │   DISTRIBUTIONS     │ │
    │  │  (system    │  │  (seeded    │  │   (generate from    │ │
    │  │  definition)│  │   random)   │  │    config)          │ │
    │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
    │         │                │                     │            │
    │         ▼                ▼                     ▼            │
    │  ┌─────────────────────────────────────────────────────┐   │
    │  │                     SCHEDULER                        │   │
    │  │  ┌─────────────────────────────────────────────┐    │   │
    │  │  │              EVENT QUEUE (Min-Heap)          │    │   │
    │  │  │                                              │    │   │
    │  │  │   [T=50, ARRIVAL] [T=80, COMPLETE] ...      │    │   │
    │  │  │                                              │    │   │
    │  │  └─────────────────────────────────────────────┘    │   │
    │  │                         │                            │   │
    │  │                         ▼                            │   │
    │  │              ┌─────────────────────┐                 │   │
    │  │              │   CLOCK: T = 50μs   │                 │   │
    │  │              └─────────────────────┘                 │   │
    │  └──────────────────────────┬──────────────────────────┘   │
    │                             │                               │
    │                             ▼                               │
    │  ┌─────────────────────────────────────────────────────┐   │
    │  │                  EVENT HANDLERS                      │   │
    │  │                                                      │   │
    │  │   REQUEST_ARRIVAL → handleArrival()                 │   │
    │  │   PROCESSING_COMPLETE → handleComplete()            │   │
    │  │   REQUEST_TIMEOUT → handleTimeout()                 │   │
    │  │   NODE_FAILURE → handleFailure()                    │   │
    │  │   ...                                                │   │
    │  └──────────────────────────┬──────────────────────────┘   │
    │                             │                               │
    │                             ▼                               │
    │  ┌─────────────────────────────────────────────────────┐   │
    │  │                    SYSTEM MODEL                      │   │
    │  │                                                      │   │
    │  │   ┌────────┐    ┌────────┐    ┌────────┐            │   │
    │  │   │Workload│───▶│Gateway │───▶│Database│            │   │
    │  │   │  Gen   │    │G/G/4/K │    │G/G/10/K│            │   │
    │  │   └────────┘    └────────┘    └────────┘            │   │
    │  │                                                      │   │
    │  └──────────────────────────┬──────────────────────────┘   │
    │                             │                               │
    │                             ▼                               │
    │  ┌─────────────────────────────────────────────────────┐   │
    │  │                  METRICS COLLECTOR                   │   │
    │  │                                                      │   │
    │  │   • Latency histograms                              │   │
    │  │   • Throughput counters                             │   │
    │  │   • Queue length time series                        │   │
    │  │   • Error rates                                      │   │
    │  │   • Request traces                                   │   │
    │  └─────────────────────────────────────────────────────┘   │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

### 18.2 Complete Engine Implementation

```javascript
/**
 * Discrete Event Simulation Engine
 */
class SimulationEngine {
    constructor(config) {
        this.config = config;
        
        // Initialize components
        this.clock = 0n;  // BigInt microseconds
        this.eventQueue = new MinHeap();
        this.distributions = new Distributions(config.seed);
        
        // Create system model
        this.nodes = new Map();
        this.edges = new Map();
        this.workloadGenerator = null;
        
        // Metrics
        this.metrics = {
            totalEvents: 0,
            eventsByType: {},
            startTime: null,
            endTime: null
        };
        
        // Request tracking
        this.activeRequests = new Map();
        this.completedRequests = [];
        
        // Initialize model
        this.initializeModel();
    }
    
    /**
     * Initialize the system model from config
     */
    initializeModel() {
        // Create nodes
        for (const nodeConfig of this.config.nodes) {
            let node;
            
            if (nodeConfig.type === 'user-source') {
                node = new WorkloadGenerator(nodeConfig);
                this.workloadGenerator = node;
            } else {
                node = new GGcKNode(nodeConfig);
            }
            
            // Inject dependencies
            node.distributions = this.distributions;
            node.scheduler = this;
            
            this.nodes.set(nodeConfig.id, node);
        }
        
        // Create edges (routing table)
        for (const edgeConfig of this.config.edges) {
            const edge = {
                id: edgeConfig.id,
                source: edgeConfig.source,
                target: edgeConfig.target,
                latency: edgeConfig.network?.latency || { type: 'constant', value: 1 },
                errorRate: edgeConfig.network?.packetLoss || 0
            };
            
            this.edges.set(edgeConfig.id, edge);
            
            // Build routing table (source -> [edges])
            if (!this.routingTable) this.routingTable = new Map();
            if (!this.routingTable.has(edgeConfig.source)) {
                this.routingTable.set(edgeConfig.source, []);
            }
            this.routingTable.get(edgeConfig.source).push(edge);
        }
    }
    
    /**
     * Schedule an event
     */
    schedule(timestamp, type, data, priority = 5) {
        const event = {
            timestamp: timestamp,
            type: type,
            data: data,
            priority: priority
        };
        this.eventQueue.insert(event);
    }
    
    /**
     * Run the simulation
     */
    run() {
        console.log("═══════════════════════════════════════════");
        console.log("SIMULATION STARTING");
        console.log(`Duration: ${this.config.duration}ms`);
        console.log(`Seed: ${this.config.seed}`);
        console.log("═══════════════════════════════════════════");
        
        this.metrics.startTime = Date.now();
        
        // Initialize workload generator
        if (this.workloadGenerator) {
            this.workloadGenerator.config.simulationDuration = 
                BigInt(this.config.duration) * 1000n;  // ms to μs
            this.workloadGenerator.initialize(this.clock);
        }
        
        // THE MAIN EVENT LOOP
        const durationMicro = BigInt(this.config.duration) * 1000n;
        
        while (!this.eventQueue.isEmpty()) {
            const event = this.eventQueue.extractMin();
            
            // Check if past simulation end
            if (event.timestamp > durationMicro) {
                break;
            }
            
            // Advance clock
            this.clock = event.timestamp;
            
            // Process event
            this.processEvent(event);
            
            // Track metrics
            this.metrics.totalEvents++;
            this.metrics.eventsByType[event.type] = 
                (this.metrics.eventsByType[event.type] || 0) + 1;
        }
        
        this.metrics.endTime = Date.now();
        
        return this.generateResults();
    }
    
    /**
     * Process a single event
     */
    processEvent(event) {
        switch (event.type) {
            case 'REQUEST_GENERATED':
                this.handleRequestGenerated(event);
                break;
                
            case 'REQUEST_ARRIVAL':
                this.handleRequestArrival(event);
                break;
                
            case 'PROCESSING_COMPLETE':
                this.handleProcessingComplete(event);
                break;
                
            case 'REQUEST_FORWARDED':
                this.handleRequestForwarded(event);
                break;
                
            case 'REQUEST_TIMEOUT':
                this.handleRequestTimeout(event);
                break;
                
            case 'REQUEST_COMPLETE':
                this.handleRequestComplete(event);
                break;
                
            default:
                console.warn(`Unknown event type: ${event.type}`);
        }
    }
    
    /**
     * Handle request generation from workload generator
     */
    handleRequestGenerated(event) {
        const request = this.workloadGenerator.generateRequest(this.clock);
        
        // Track request
        this.activeRequests.set(request.id, {
            request,
            path: [],
            startTime: this.clock
        });
        
        // Schedule timeout
        this.schedule(
            this.clock + request.timeout,
            'REQUEST_TIMEOUT',
            { requestId: request.id },
            4
        );
        
        // Route to first node
        const firstEdge = this.routingTable.get(this.workloadGenerator.config.id)?.[0];
        if (firstEdge) {
            this.forwardRequest(request, firstEdge);
        }
    }
    
    /**
     * Handle request arrival at a node
     */
    handleRequestArrival(event) {
        const { nodeId, request } = event.data;
        const node = this.nodes.get(nodeId);
        
        if (!node) {
            console.error(`Node not found: ${nodeId}`);
            return;
        }
        
        // Track path
        const tracking = this.activeRequests.get(request.id);
        if (tracking) {
            tracking.path.push({
                nodeId,
                arrivedAt: this.clock
            });
        }
        
        // Attempt to handle
        const result = node.handleArrival(request, this.clock);
        
        if (!result.accepted) {
            // Request rejected
            this.handleRequestRejected(request, nodeId, result.reason);
        }
    }
    
    /**
     * Handle processing completion
     */
    handleProcessingComplete(event) {
        const { nodeId, request } = event.data;
        const node = this.nodes.get(nodeId);
        
        // Complete processing
        const completedRequest = node.handleCompletion(request, this.clock);
        
        // Update path
        const tracking = this.activeRequests.get(request.id);
        if (tracking) {
            const pathEntry = tracking.path.find(p => p.nodeId === nodeId);
            if (pathEntry) {
                pathEntry.completedAt = this.clock;
                pathEntry.queueTime = request.queueTime;
                pathEntry.serviceTime = request.actualServiceTime;
            }
        }
        
        // Route to next node
        const edges = this.routingTable.get(nodeId);
        if (edges && edges.length > 0) {
            // For now, just take first edge (could implement routing logic)
            this.forwardRequest(completedRequest, edges[0]);
        } else {
            // No more nodes - request is complete!
            this.schedule(
                this.clock,
                'REQUEST_COMPLETE',
                { request: completedRequest },
                3
            );
        }
    }
    
    /**
     * Forward request along an edge
     */
    forwardRequest(request, edge) {
        // Calculate network latency
        const latency = this.distributions.fromConfig(edge.latency);
        const latencyMicro = BigInt(Math.round(latency * 1000));
        
        // Check for packet loss
        if (this.distributions.random() < edge.errorRate) {
            // Packet lost - could implement retry here
            return;
        }
        
        // Schedule arrival at target
        this.schedule(
            this.clock + latencyMicro,
            'REQUEST_ARRIVAL',
            { nodeId: edge.target, request },
            1
        );
    }
    
    /**
     * Handle request rejection
     */
    handleRequestRejected(request, nodeId, reason) {
        const tracking = this.activeRequests.get(request.id);
        if (tracking) {
            tracking.status = 'rejected';
            tracking.rejectedAt = nodeId;
            tracking.reason = reason;
            tracking.endTime = this.clock;
            
            this.completedRequests.push(tracking);
            this.activeRequests.delete(request.id);
        }
    }
    
    /**
     * Handle request timeout
     */
    handleRequestTimeout(event) {
        const { requestId } = event.data;
        const tracking = this.activeRequests.get(requestId);
        
        if (tracking && !tracking.status) {
            tracking.status = 'timeout';
            tracking.endTime = this.clock;
            
            this.completedRequests.push(tracking);
            this.activeRequests.delete(requestId);
        }
    }
    
    /**
     * Handle request completion (success)
     */
    handleRequestComplete(event) {
        const { request } = event.data;
        const tracking = this.activeRequests.get(request.id);
        
        if (tracking) {
            tracking.status = 'success';
            tracking.endTime = this.clock;
            
            this.completedRequests.push(tracking);
            this.activeRequests.delete(request.id);
        }
    }
    
    /**
     * Generate final results
     */
    generateResults() {
        const wallClockTime = this.metrics.endTime - this.metrics.startTime;
        
        // Calculate latency statistics
        const successfulRequests = this.completedRequests
            .filter(r => r.status === 'success');
        
        const latencies = successfulRequests
            .map(r => Number(r.endTime - r.startTime) / 1000);  // μs to ms
        
        latencies.sort((a, b) => a - b);
        
        const percentile = (arr, p) => {
            if (arr.length === 0) return 0;
            const idx = Math.ceil(arr.length * p / 100) - 1;
            return arr[Math.max(0, idx)];
        };
        
        // Per-node metrics
        const nodeMetrics = {};
        for (const [nodeId, node] of this.nodes) {
            if (node.getMetrics) {
                nodeMetrics[nodeId] = node.getMetrics();
            }
        }
        
        return {
            summary: {
                simulationDuration: this.config.duration,
                wallClockTime,
                speedup: this.config.duration / wallClockTime,
                totalEvents: this.metrics.totalEvents,
                eventsByType: this.metrics.eventsByType,
                seed: this.config.seed
            },
            
            requests: {
                total: this.completedRequests.length,
                successful: successfulRequests.length,
                rejected: this.completedRequests.filter(r => r.status === 'rejected').length,
                timeout: this.completedRequests.filter(r => r.status === 'timeout').length,
                successRate: successfulRequests.length / this.completedRequests.length
            },
            
            latency: {
                min: latencies[0] || 0,
                max: latencies[latencies.length - 1] || 0,
                mean: latencies.reduce((a, b) => a + b, 0) / latencies.length || 0,
                p50: percentile(latencies, 50),
                p90: percentile(latencies, 90),
                p95: percentile(latencies, 95),
                p99: percentile(latencies, 99)
            },
            
            throughput: {
                requestsPerSecond: successfulRequests.length / (this.config.duration / 1000)
            },
            
            nodeMetrics,
            
            verification: {
                littlesLaw: this.verifyLittlesLaw()
            }
        };
    }
    
    /**
     * Verify Little's Law: L = λW
     */
    verifyLittlesLaw() {
        const results = [];
        
        for (const [nodeId, node] of this.nodes) {
            if (!node.getMetrics) continue;
            
            const metrics = node.getMetrics();
            const lambda = metrics.totalArrivals / (this.config.duration / 1000);
            const W = (metrics.avgQueueTime + metrics.avgServiceTime) / 1000;  // to seconds
            const L_expected = lambda * W;
            
            // We'd need to track average queue length over time for actual L
            // For now, use final state as approximation
            const state = node.getState();
            const L_actual = state.totalInSystem;
            
            results.push({
                nodeId,
                lambda,
                W,
                L_expected,
                L_actual,
                error: Math.abs(L_expected - L_actual) / Math.max(L_expected, 0.001)
            });
        }
        
        return results;
    }
}
```

### 18.3 Running a Complete Simulation

```javascript
// ═══════════════════════════════════════════════════════════════
// EXAMPLE: Complete Simulation Setup and Run
// ═══════════════════════════════════════════════════════════════

const systemConfig = {
    seed: "my-reproducible-simulation",
    duration: 10000,  // 10 seconds
    
    nodes: [
        {
            id: "users",
            type: "user-source",
            trafficPattern: {
                type: "poisson",
                averageRequestsPerSecond: 500
            },
            requestConfig: {
                typeDistribution: { "GET": 70, "POST": 30 }
            },
            timeout: 5000  // 5 second timeout
        },
        {
            id: "gateway",
            type: "api-gateway",
            name: "API Gateway",
            workers: 10,
            capacity: 200,
            serviceTime: { type: "log-normal", mu: 1.5, sigma: 0.5 },  // ~4.5ms median
            queuePolicy: "FIFO"
        },
        {
            id: "service",
            type: "microservice",
            name: "Order Service",
            workers: 20,
            capacity: 500,
            serviceTime: { type: "log-normal", mu: 2.5, sigma: 0.8 },  // ~12ms median
            queuePolicy: "FIFO"
        },
        {
            id: "database",
            type: "database",
            name: "PostgreSQL",
            workers: 50,
            capacity: 100,
            serviceTime: { type: "log-normal", mu: 1.8, sigma: 1.0 },  // ~6ms median, high variance
            queuePolicy: "FIFO"
        }
    ],
    
    edges: [
        {
            id: "users-to-gateway",
            source: "users",
            target: "gateway",
            network: {
                latency: { type: "log-normal", mu: 2.0, sigma: 0.5 },  // ~7ms
                packetLoss: 0.001
            }
        },
        {
            id: "gateway-to-service",
            source: "gateway",
            target: "service",
            network: {
                latency: { type: "constant", value: 1 },  // 1ms internal
                packetLoss: 0
            }
        },
        {
            id: "service-to-database",
            source: "service",
            target: "database",
            network: {
                latency: { type: "constant", value: 0.5 },  // 0.5ms
                packetLoss: 0
            }
        }
    ]
};

// Run simulation
const engine = new SimulationEngine(systemConfig);
const results = engine.run();

// Print results
console.log("\n═══════════════════════════════════════════");
console.log("SIMULATION RESULTS");
console.log("═══════════════════════════════════════════\n");

console.log("SUMMARY:");
console.log(`  Duration: ${results.summary.simulationDuration}ms`);
console.log(`  Wall clock: ${results.summary.wallClockTime}ms`);
console.log(`  Speedup: ${results.summary.speedup.toFixed(1)}x`);
console.log(`  Total events: ${results.summary.totalEvents}`);

console.log("\nREQUESTS:");
console.log(`  Total: ${results.requests.total}`);
console.log(`  Successful: ${results.requests.successful}`);
console.log(`  Rejected: ${results.requests.rejected}`);
console.log(`  Timeout: ${results.requests.timeout}`);
console.log(`  Success rate: ${(results.requests.successRate * 100).toFixed(2)}%`);

console.log("\nLATENCY (ms):");
console.log(`  Min: ${results.latency.min.toFixed(2)}`);
console.log(`  P50: ${results.latency.p50.toFixed(2)}`);
console.log(`  P90: ${results.latency.p90.toFixed(2)}`);
console.log(`  P95: ${results.latency.p95.toFixed(2)}`);
console.log(`  P99: ${results.latency.p99.toFixed(2)}`);
console.log(`  Max: ${results.latency.max.toFixed(2)}`);

console.log("\nTHROUGHPUT:");
console.log(`  ${results.throughput.requestsPerSecond.toFixed(2)} req/sec`);

console.log("\nPER-NODE METRICS:");
for (const [nodeId, metrics] of Object.entries(results.nodeMetrics)) {
    console.log(`  ${nodeId}:`);
    console.log(`    Arrivals: ${metrics.totalArrivals}`);
    console.log(`    Rejections: ${metrics.totalRejections}`);
    console.log(`    Avg queue time: ${metrics.avgQueueTime?.toFixed(2) || 0}ms`);
    console.log(`    Avg service time: ${metrics.avgServiceTime?.toFixed(2) || 0}ms`);
}

console.log("\n═══════════════════════════════════════════");
```

---

## Chapter 19: Summary — Part 3 Key Takeaways

```
    PART 3 KEY TAKEAWAYS
    ════════════════════
    
    ✓ MIN-HEAP is the core data structure for event scheduling
      - O(log n) insert and extract-min
      - Array representation with index arithmetic
      - Bubble up (insert) and bubble down (extract)
    
    ✓ BIGINT provides perfect precision for timestamps
      - No floating-point errors
      - Microsecond resolution
      - Essential for determinism
    
    ✓ SEEDED PRNGs give reproducible randomness
      - SFC32 is fast and high-quality
      - Same seed = same sequence
      - Fork for independent components
    
    ✓ DISTRIBUTIONS model real-world behavior
      - Exponential for inter-arrivals
      - Log-normal for latencies
      - Generate from uniform random
    
    ✓ G/G/c/K is the realistic queue model
      - General arrivals and service
      - c parallel workers
      - K capacity limit with rejection
    
    ✓ WORKLOAD GENERATORS create traffic
      - Constant, Poisson, bursty, diurnal, spike
      - Request types and sizes
      - Timeout scheduling
    
    ✓ The SIMULATION ENGINE ties everything together
      - Event loop with scheduler
      - Node and edge models
      - Metrics collection
      - Result generation
```

---

**What's Next in Part 4:**
- Multi-component systems and routing
- Network physics and realistic latency modeling
- Failure modes and propagation
- Circuit breakers and resilience patterns

**What's Next in Part 5:**
- DEVS formalism for complex systems
- Chaos engineering and fault injection
- Analyzing simulation outputs
- Visualization and debugging

---

*End of Part 3*