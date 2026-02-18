# PART 5: DEVS, CHAOS ENGINEERING & OUTPUT ANALYSIS

## Formalizing Simulation, Testing Resilience, and Interpreting Results

---

## Chapter 26: DEVS — Discrete Event System Specification

### 26.1 What Is DEVS?

**DEVS** (Discrete Event System Specification) is a formal framework for modeling and simulating discrete event systems. It provides mathematical rigor to what we've been building intuitively.

```
    WHY DEVS MATTERS
    ════════════════
    
    INFORMAL SIMULATION                  DEVS FORMALISM
    ══════════════════                   ═══════════════
    
    "When a request arrives,             Mathematical specification:
     add it to the queue and             
     schedule processing"                M = <X, Y, S, δext, δint, λ, ta>
                                         
    • Ambiguous edge cases               • Precisely defined behavior
    • Hard to verify correctness         • Provable properties
    • Difficult to compose               • Hierarchical composition
    • Implementation-dependent           • Implementation-independent
    
    
    DEVS gives us:
    ───────────────
    
    1. FORMAL SEMANTICS     - Unambiguous behavior definition
    2. COMPOSABILITY        - Build complex from simple
    3. HIERARCHY            - Models within models
    4. VERIFICATION         - Prove properties mathematically
    5. INTEROPERABILITY     - Standard interface between models
```

### 26.2 Atomic DEVS — The Basic Building Block

An **Atomic DEVS** model is the smallest unit of simulation. It corresponds to a single node in our system.

```
    ATOMIC DEVS DEFINITION
    ══════════════════════
    
    An Atomic DEVS model is a 7-tuple:
    
    M = < X, Y, S, δext, δint, λ, ta >
    
    Where:
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   X     = Set of INPUT events                                      │
    │           { request_arrival, config_change, ... }                  │
    │                                                                     │
    │   Y     = Set of OUTPUT events                                     │
    │           { request_complete, request_rejected, ... }              │
    │                                                                     │
    │   S     = Set of STATES                                            │
    │           { (queue, workers, metrics), ... }                       │
    │                                                                     │
    │   δext  = EXTERNAL TRANSITION function                             │
    │           S × X → S                                                │
    │           "What happens when input arrives"                        │
    │                                                                     │
    │   δint  = INTERNAL TRANSITION function                             │
    │           S → S                                                    │
    │           "What happens when internal event fires"                 │
    │                                                                     │
    │   λ     = OUTPUT function                                          │
    │           S → Y                                                    │
    │           "What output is produced"                                │
    │                                                                     │
    │   ta    = TIME ADVANCE function                                    │
    │           S → ℝ⁺ ∪ {∞}                                             │
    │           "When will next internal event occur"                    │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

### 26.3 DEVS Behavior Cycle

```
    ATOMIC DEVS EXECUTION CYCLE
    ═══════════════════════════
    
    
                    ┌─────────────────────────────────────┐
                    │                                     │
                    │           ATOMIC MODEL              │
                    │                                     │
     Input X ──────▶│   State S                          │──────▶ Output Y
                    │   ┌───────────────────────────┐    │
                    │   │ queue: [r1, r2]           │    │
                    │   │ workers: [BUSY, IDLE]     │    │
                    │   │ time_advance: 50ms        │    │
                    │   └───────────────────────────┘    │
                    │                                     │
                    └─────────────────────────────────────┘
    
    
    TWO TYPES OF TRANSITIONS:
    ─────────────────────────
    
    1. EXTERNAL TRANSITION (δext)
       Triggered by: Input arriving from outside
       
       Current State ──[input arrives]──▶ δext(state, input) ──▶ New State
       
       Example: Request arrives → Add to queue
    
    
    2. INTERNAL TRANSITION (δint)
       Triggered by: Time advance expires (self-scheduled)
       
       Current State ──[time_advance expires]──▶ λ(state) ──▶ Output
                                                    │
                                                    ▼
                                              δint(state) ──▶ New State
       
       Example: Processing complete → Output result, update state
    
    
    TIME ADVANCE (ta):
    ──────────────────
    
    Returns how long until the next INTERNAL event.
    
    ta(state) = 50ms    → Internal event in 50ms
    ta(state) = 0       → Internal event IMMEDIATELY
    ta(state) = ∞       → No scheduled internal event (passive)
```

### 26.4 Example: Server as Atomic DEVS

```javascript
/**
 * Server modeled as Atomic DEVS
 */
class ServerAtomicDEVS {
    constructor(config) {
        this.name = config.name;
        this.serviceTime = config.serviceTime;
        
        // S: State
        this.state = {
            phase: 'IDLE',          // 'IDLE' | 'BUSY'
            queue: [],              // Waiting requests
            currentJob: null,       // Request being processed
            sigma: Infinity         // Time to next internal event
        };
        
        // X: Input event types
        this.inputTypes = ['REQUEST_ARRIVAL'];
        
        // Y: Output event types  
        this.outputTypes = ['REQUEST_COMPLETE', 'REQUEST_REJECTED'];
        
        this.distributions = null;
    }
    
    /**
     * ta: Time Advance Function
     */
    timeAdvance() {
        return this.state.sigma;
    }
    
    /**
     * δext: External Transition Function
     */
    externalTransition(elapsed, input) {
        this.state.sigma -= elapsed;
        
        if (input.type === 'REQUEST_ARRIVAL') {
            const request = input.data;
            
            if (this.state.phase === 'IDLE') {
                this.state.phase = 'BUSY';
                this.state.currentJob = request;
                this.state.sigma = this.generateServiceTime();
            } else {
                this.state.queue.push(request);
            }
        }
    }
    
    /**
     * δint: Internal Transition Function
     */
    internalTransition() {
        if (this.state.queue.length > 0) {
            this.state.currentJob = this.state.queue.shift();
            this.state.sigma = this.generateServiceTime();
        } else {
            this.state.phase = 'IDLE';
            this.state.currentJob = null;
            this.state.sigma = Infinity;
        }
    }
    
    /**
     * λ: Output Function
     */
    outputFunction() {
        if (this.state.phase === 'BUSY' && this.state.currentJob) {
            return { type: 'REQUEST_COMPLETE', data: this.state.currentJob };
        }
        return null;
    }
    
    generateServiceTime() {
        return this.distributions.fromConfig(this.serviceTime);
    }
}
```

### 26.5 Coupled DEVS — Composing Models

**Coupled DEVS** allows connecting multiple atomic models into larger systems.

```
    COUPLED DEVS DEFINITION
    ═══════════════════════
    
    N = < X, Y, D, {Md}, {Id}, {Zd}, Select >
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   X      = External INPUT events                                   │
    │   Y      = External OUTPUT events                                  │
    │   D      = Set of COMPONENT names                                  │
    │   {Md}   = Set of COMPONENT MODELS                                 │
    │   {Id}   = INFLUENCERS for each component                          │
    │   {Zd}   = OUTPUT TRANSLATION functions                            │
    │   Select = TIE-BREAKING function                                   │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
    
    
    VISUAL:
    ───────
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │   COUPLED MODEL: "api-system"                                      │
    │                                                                     │
    │   ┌─────────┐      ┌─────────┐      ┌─────────┐                   │
    │   │ Gateway │─────▶│ Service │─────▶│Database │                   │
    │   │  (M1)   │      │  (M2)   │      │  (M3)   │                   │
    │   └─────────┘      └─────────┘      └─────────┘                   │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

### 26.6 DEVS Simulator

```javascript
/**
 * DEVS Simulator (Coordinator)
 */
class DEVSSimulator {
    constructor(model) {
        this.model = model;
        this.clock = 0n;
        this.eventLog = [];
    }
    
    initialize() {
        if (this.model instanceof CoupledDEVS) {
            this.flatModel = this.model.flatten();
        } else {
            this.flatModel = {
                components: new Map([[this.model.name, this.model]]),
                couplings: []
            };
        }
    }
    
    run(durationMicros) {
        const endTime = this.clock + durationMicros;
        
        while (this.clock < endTime) {
            const nextEvent = this.findNextEvent();
            
            if (nextEvent.time === Infinity || this.clock + nextEvent.time > endTime) {
                this.clock = endTime;
                break;
            }
            
            this.clock += BigInt(Math.round(nextEvent.time * 1000));
            this.processInternalEvents(nextEvent.components);
        }
        
        return this.generateResults();
    }
    
    findNextEvent() {
        let minTime = Infinity;
        const imminent = [];
        
        for (const [name, component] of this.flatModel.components) {
            const ta = component.timeAdvance();
            if (ta < minTime) {
                minTime = ta;
                imminent.length = 0;
                imminent.push(name);
            } else if (ta === minTime && ta < Infinity) {
                imminent.push(name);
            }
        }
        
        return { time: minTime, components: imminent };
    }
    
    processInternalEvents(componentNames) {
        const outputs = [];
        
        for (const name of componentNames) {
            const component = this.flatModel.components.get(name);
            const output = component.outputFunction();
            if (output) outputs.push({ from: name, output });
        }
        
        for (const name of componentNames) {
            this.flatModel.components.get(name).internalTransition();
        }
        
        for (const { from, output } of outputs) {
            this.routeOutput(from, output);
        }
    }
}
```

---

## Chapter 27: Chaos Engineering — Systematic Resilience Testing

### 27.1 What Is Chaos Engineering?

```
    CHAOS ENGINEERING DEFINITION
    ════════════════════════════
    
    "Chaos Engineering is the discipline of experimenting on a system
     in order to build confidence in the system's capability to
     withstand turbulent conditions in production."
    
    
    THE CORE IDEA:
    ──────────────
    
    Instead of HOPING your system handles failures...
    PROVE IT by deliberately causing failures in a controlled way.
    
    
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   TRADITIONAL TESTING              CHAOS ENGINEERING                │
    │                                                                     │
    │   "Does feature X work?"           "Does the system survive         │
    │                                     when Y fails?"                  │
    │                                                                     │
    │   Test: Happy path                 Test: Failure scenarios          │
    │   Environment: Staging             Environment: Production (!)      │
    │   Frequency: Before deploy         Frequency: Continuously          │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

### 27.2 The Chaos Engineering Process

```
    CHAOS ENGINEERING WORKFLOW
    ══════════════════════════
    
    1. DEFINE STEADY STATE
       What does "normal" look like?
       • Latency P99 < 200ms
       • Error rate < 0.1%
       • Throughput > 1000 req/sec
    
    2. HYPOTHESIZE
       "If [failure X] occurs, the system will [expected behavior]"
    
    3. DESIGN EXPERIMENT
       • What failure to inject
       • Scope and duration
       • Abort conditions
       • Metrics to observe
    
    4. RUN EXPERIMENT
       • In simulation first (safe)
       • Then production (carefully)
    
    5. ANALYZE RESULTS
       • Did steady state hold?
       • YES → Confidence increased
       • NO → Fix weakness, verify
```

### 27.3 Chaos Experiment Types

```
    CHAOS EXPERIMENT CATALOG
    ════════════════════════
    
    INFRASTRUCTURE FAILURES
    ───────────────────────
    • Instance Kill - Terminate VM/container
    • Zone Outage - Disable availability zone
    • Disk Full - Fill disk to capacity
    • CPU Stress - Consume all CPU
    • Memory Pressure - Exhaust memory
    
    NETWORK FAILURES
    ────────────────
    • Partition - Split network between components
    • Latency Inject - Add delay to calls
    • Packet Loss - Drop percentage of packets
    • Bandwidth Limit - Restrict throughput
    
    APPLICATION FAILURES
    ────────────────────
    • Service Kill - Terminate process
    • Service Hang - Process alive but unresponsive
    • Memory Leak - Gradually consume memory
    • Exception Inject - Throw errors at specific points
    
    DEPENDENCY FAILURES
    ───────────────────
    • DB Primary Fail - Database primary unavailable
    • Cache Miss Storm - Cache returns all misses
    • External API 5xx - Third-party returns errors
```

### 27.4 Implementing Chaos Experiments

```javascript
/**
 * Chaos Experiment Definition
 */
class ChaosExperiment {
    constructor(config) {
        this.name = config.name;
        this.description = config.description;
        this.hypothesis = config.hypothesis;
        this.steadyState = config.steadyState;
        this.steps = config.steps || [];
        this.abortConditions = config.abortConditions || [];
        this.status = 'pending';
        this.results = null;
    }
    
    defineSteadyState(assertions) {
        this.steadyState = assertions.map(a => ({
            metric: a.metric,
            operator: a.operator,
            threshold: a.threshold
        }));
    }
    
    addStep(step) {
        this.steps.push({
            type: step.type,  // 'inject' | 'wait' | 'verify' | 'restore'
            target: step.target,
            params: step.params,
            duration: step.duration
        });
    }
    
    checkSteadyState(metrics) {
        const results = [];
        
        for (const assertion of this.steadyState) {
            const value = metrics[assertion.metric];
            let passed = false;
            
            switch (assertion.operator) {
                case '<':  passed = value < assertion.threshold; break;
                case '>':  passed = value > assertion.threshold; break;
                case '<=': passed = value <= assertion.threshold; break;
                case '>=': passed = value >= assertion.threshold; break;
            }
            
            results.push({ metric: assertion.metric, expected: assertion.threshold, actual: value, passed });
        }
        
        return { allPassed: results.every(r => r.passed), assertions: results };
    }
}

/**
 * Pre-built Chaos Experiments
 */
const ChaosExperimentCatalog = {
    
    databaseFailover: () => {
        const exp = new ChaosExperiment({
            name: 'Database Primary Failover',
            hypothesis: 'System will failover within 60s with < 5% errors'
        });
        
        exp.defineSteadyState([
            { metric: 'latencyP99', operator: '<', threshold: 500 },
            { metric: 'errorRate', operator: '<', threshold: 0.05 }
        ]);
        
        exp.addStep({ type: 'wait', duration: 10000 });
        exp.addStep({ type: 'inject', params: { target: 'database-primary', failureType: 'crash' }});
        exp.addStep({ type: 'wait', duration: 30000 });
        exp.addStep({ type: 'verify' });
        exp.addStep({ type: 'wait', duration: 30000 });
        exp.addStep({ type: 'verify' });
        
        return exp;
    },
    
    cacheStampede: () => {
        const exp = new ChaosExperiment({
            name: 'Cache Stampede',
            hypothesis: 'Database survives cache flush without overwhelming'
        });
        
        exp.defineSteadyState([
            { metric: 'latencyP99', operator: '<', threshold: 1000 },
            { metric: 'errorRate', operator: '<', threshold: 0.1 }
        ]);
        
        exp.addStep({ type: 'wait', duration: 10000 });
        exp.addStep({ type: 'inject', params: { target: 'redis-cache', failureType: 'crash', duration: 5000 }});
        exp.addStep({ type: 'wait', duration: 30000 });
        exp.addStep({ type: 'verify' });
        
        return exp;
    },
    
    latencyInjection: (addedLatencyMs) => {
        const exp = new ChaosExperiment({
            name: `Latency Spike (+${addedLatencyMs}ms)`,
            hypothesis: 'Circuit breakers activate, error rate stays < 10%'
        });
        
        exp.defineSteadyState([
            { metric: 'errorRate', operator: '<', threshold: 0.1 }
        ]);
        
        exp.addStep({ type: 'wait', duration: 10000 });
        exp.addStep({ type: 'inject', params: { target: 'external-api', failureType: 'slow', addedLatencyMs }});
        exp.addStep({ type: 'wait', duration: 30000 });
        exp.addStep({ type: 'verify' });
        
        return exp;
    }
};
```

---

## Chapter 28: Output Analysis — Understanding Results

### 28.1 Metrics Collection

```javascript
/**
 * Comprehensive Metrics Collector
 */
class MetricsCollector {
    constructor() {
        this.timeSeries = {
            latency: [],
            throughput: [],
            errorRate: [],
            queueDepth: []
        };
        
        this.counters = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            timeoutRequests: 0,
            rejectedRequests: 0
        };
        
        this.requestLatencies = [];
        this.nodeMetrics = new Map();
    }
    
    recordRequest(request) {
        this.counters.totalRequests++;
        
        const latencyMs = Number(request.endTime - request.startTime) / 1000;
        this.requestLatencies.push(latencyMs);
        
        if (request.status === 'success') {
            this.counters.successfulRequests++;
        } else {
            this.counters.failedRequests++;
            if (request.status === 'timeout') this.counters.timeoutRequests++;
            if (request.status === 'rejected') this.counters.rejectedRequests++;
        }
    }
    
    calculatePercentile(arr, p) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = Math.ceil(sorted.length * p) - 1;
        return sorted[Math.max(0, idx)];
    }
    
    generateReport() {
        const sorted = [...this.requestLatencies].sort((a, b) => a - b);
        
        return {
            summary: {
                totalRequests: this.counters.totalRequests,
                successfulRequests: this.counters.successfulRequests,
                failedRequests: this.counters.failedRequests,
                successRate: this.counters.totalRequests > 0
                    ? this.counters.successfulRequests / this.counters.totalRequests : 0
            },
            latency: {
                min: sorted[0] || 0,
                max: sorted[sorted.length - 1] || 0,
                mean: sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
                p50: this.calculatePercentile(sorted, 0.50),
                p90: this.calculatePercentile(sorted, 0.90),
                p95: this.calculatePercentile(sorted, 0.95),
                p99: this.calculatePercentile(sorted, 0.99)
            },
            errors: {
                total: this.counters.failedRequests,
                timeouts: this.counters.timeoutRequests,
                rejections: this.counters.rejectedRequests
            }
        };
    }
}
```

### 28.2 ASCII Visualization

```javascript
/**
 * ASCII Chart Renderer
 */
class ASCIICharts {
    
    static summaryBox(metrics) {
        const lines = [];
        lines.push('┌─────────────────────────────────────────────┐');
        lines.push('│           SIMULATION SUMMARY                │');
        lines.push('├─────────────────────────────────────────────┤');
        lines.push(`│  Total Requests:    ${metrics.summary.totalRequests.toString().padStart(20)} │`);
        lines.push(`│  Successful:        ${metrics.summary.successfulRequests.toString().padStart(20)} │`);
        lines.push(`│  Failed:            ${metrics.summary.failedRequests.toString().padStart(20)} │`);
        lines.push(`│  Success Rate:      ${(metrics.summary.successRate * 100).toFixed(2).padStart(18)}% │`);
        lines.push('├─────────────────────────────────────────────┤');
        lines.push('│  LATENCY (ms)                               │');
        lines.push(`│    P50:             ${metrics.latency.p50.toFixed(2).padStart(20)} │`);
        lines.push(`│    P90:             ${metrics.latency.p90.toFixed(2).padStart(20)} │`);
        lines.push(`│    P95:             ${metrics.latency.p95.toFixed(2).padStart(20)} │`);
        lines.push(`│    P99:             ${metrics.latency.p99.toFixed(2).padStart(20)} │`);
        lines.push('└─────────────────────────────────────────────┘');
        return lines.join('\n');
    }
    
    static histogram(data, config = {}) {
        const width = config.width || 40;
        const title = config.title || 'Histogram';
        const maxCount = Math.max(...data.map(b => b.count));
        
        const lines = [`\n${title}`, '─'.repeat(width + 20)];
        
        for (const bucket of data) {
            const label = `≤${bucket.le}`.padStart(8);
            const barLen = Math.round((bucket.count / maxCount) * width);
            const bar = '█'.repeat(barLen);
            lines.push(`${label} │${bar.padEnd(width)}│ ${bucket.count}`);
        }
        
        return lines.join('\n');
    }
    
    static heatmap(data, rowLabels) {
        const heatChars = [' ', '░', '▒', '▓', '█'];
        const allVals = data.flat();
        const minVal = Math.min(...allVals);
        const maxVal = Math.max(...allVals);
        const range = maxVal - minVal || 1;
        
        const lines = [];
        for (let i = 0; i < data.length; i++) {
            const label = (rowLabels[i] || `Row ${i}`).padEnd(15);
            let line = `${label} │`;
            
            for (const val of data[i]) {
                const normalized = (val - minVal) / range;
                const charIdx = Math.floor(normalized * (heatChars.length - 1));
                line += heatChars[charIdx] + heatChars[charIdx];
            }
            lines.push(line + '│');
        }
        
        return lines.join('\n');
    }
}
```

### 28.3 Distributed Trace Analysis

```javascript
/**
 * Trace Analyzer
 */
class TraceAnalyzer {
    
    static waterfall(trace) {
        const startTime = trace.startTime;
        const endTime = trace.endTime;
        const duration = Number(endTime - startTime) / 1000;
        const width = 50;
        
        const lines = [
            `\nRequest: ${trace.requestId}`,
            `Duration: ${duration.toFixed(2)}ms`,
            '─'.repeat(70)
        ];
        
        for (const span of trace.path) {
            const spanStart = Number(span.arrivedAt - startTime) / 1000;
            const spanEnd = Number(span.completedAt - startTime) / 1000;
            const spanDuration = spanEnd - spanStart;
            
            const startPos = Math.floor((spanStart / duration) * width);
            const barLen = Math.max(1, Math.floor(((spanEnd - spanStart) / duration) * width));
            const bar = ' '.repeat(startPos) + '█'.repeat(barLen);
            
            lines.push(`${span.nodeId.padEnd(15)}│${bar.padEnd(width)}│ ${spanDuration.toFixed(1)}ms`);
        }
        
        return lines.join('\n');
    }
    
    static identifyBottlenecks(traces) {
        const nodeStats = new Map();
        
        for (const trace of traces) {
            const totalDuration = Number(trace.endTime - trace.startTime);
            
            for (const span of trace.path) {
                const spanDuration = Number(span.completedAt - span.arrivedAt);
                
                if (!nodeStats.has(span.nodeId)) {
                    nodeStats.set(span.nodeId, { totalTime: 0, count: 0, maxPercent: 0 });
                }
                
                const stats = nodeStats.get(span.nodeId);
                stats.totalTime += spanDuration;
                stats.count++;
                stats.maxPercent = Math.max(stats.maxPercent, spanDuration / totalDuration);
            }
        }
        
        return Array.from(nodeStats.entries())
            .map(([nodeId, stats]) => ({
                nodeId,
                avgTimeMs: (stats.totalTime / stats.count) / 1000,
                maxPercent: stats.maxPercent
            }))
            .sort((a, b) => b.avgTimeMs - a.avgTimeMs);
    }
}
```

### 28.4 Causal Analysis

```javascript
/**
 * Causal Analyzer for Root Cause Investigation
 */
class CausalAnalyzer {
    
    static buildCausalGraph(eventLog) {
        const failureEvents = eventLog.filter(e => 
            e.type.includes('FAILURE') || 
            e.type.includes('ERROR') ||
            e.type.includes('TIMEOUT')
        );
        
        failureEvents.sort((a, b) => Number(a.time - b.time));
        
        const graph = { nodes: [], edges: [] };
        
        for (const event of failureEvents) {
            graph.nodes.push({
                id: `${event.time}-${event.type}-${event.component}`,
                time: event.time,
                type: event.type,
                component: event.component
            });
        }
        
        // Create edges based on temporal proximity
        for (let i = 0; i < graph.nodes.length; i++) {
            for (let j = i + 1; j < graph.nodes.length; j++) {
                const timeDiff = Number(graph.nodes[j].time - graph.nodes[i].time) / 1000;
                if (timeDiff > 5000) break;
                
                graph.edges.push({
                    from: graph.nodes[i].id,
                    to: graph.nodes[j].id,
                    timeDiff
                });
            }
        }
        
        return graph;
    }
    
    static findRootCause(graph) {
        const hasIncoming = new Set(graph.edges.map(e => e.to));
        const roots = graph.nodes.filter(n => !hasIncoming.has(n.id));
        roots.sort((a, b) => Number(a.time - b.time));
        return roots[0] || null;
    }
    
    static renderGraph(graph) {
        const lines = ['\nCausal Failure Graph', '═'.repeat(50)];
        
        const timeBuckets = new Map();
        for (const node of graph.nodes) {
            const bucket = Math.floor(Number(node.time) / 5000000);
            if (!timeBuckets.has(bucket)) timeBuckets.set(bucket, []);
            timeBuckets.get(bucket).push(node);
        }
        
        for (const [bucket, nodes] of Array.from(timeBuckets.entries()).sort((a,b) => a[0]-b[0])) {
            lines.push(`\nT=${bucket * 5}s`);
            for (const node of nodes) {
                lines.push(`├── [${node.component}] ${node.type}`);
            }
        }
        
        return lines.join('\n');
    }
}
```

---

## Chapter 29: Summary — Part 5 Key Takeaways

```
    PART 5 KEY TAKEAWAYS
    ════════════════════
    
    ✓ DEVS provides formal semantics for simulation
      - Atomic DEVS: 7-tuple (X, Y, S, δext, δint, λ, ta)
      - External transitions for inputs
      - Internal transitions for self-scheduled events
      - Coupled DEVS for hierarchical composition
    
    ✓ CHAOS ENGINEERING builds confidence in resilience
      - Define steady state
      - Hypothesize expected behavior
      - Design controlled experiments
      - Run in simulation first, then production
      - Analyze and fix weaknesses
    
    ✓ EXPERIMENT CATALOG covers common scenarios
      - Infrastructure: instance kill, zone outage
      - Network: partition, latency, packet loss
      - Application: service kill, memory leak
      - Dependencies: DB failover, cache stampede
    
    ✓ METRICS COLLECTION captures system behavior
      - Time series, histograms, counters
      - Per-node breakdown
      - Percentile calculations
    
    ✓ VISUALIZATION makes data understandable
      - ASCII charts, heatmaps
      - Waterfall diagrams for traces
    
    ✓ CAUSAL ANALYSIS finds root causes
      - Build causal graphs from events
      - Find earliest failure (root cause)
      - Calculate blast radius
```

---

## Appendix A: Quick Reference

```
    KEY FORMULAS
    ════════════
    
    Utilization:        ρ = λ / (c × μ)
    Little's Law:       L = λ × W
    Network Latency:    L = P + S/B + Q
    
    DISTRIBUTIONS
    ═════════════
    
    Constant      → Fixed delays
    Exponential   → Inter-arrival times  
    Log-Normal    → API latencies ⭐
    
    DEVS MODEL
    ══════════
    
    M = <X, Y, S, δext, δint, λ, ta>
    
    CIRCUIT BREAKER
    ═══════════════
    
    CLOSED ──[failures]──▶ OPEN ──[timeout]──▶ HALF-OPEN ──[success]──▶ CLOSED
```

---

## Appendix B: Common Pitfalls

```
    ❌ Using averages instead of distributions
    ✅ Use log-normal for latencies
    
    ❌ Ignoring queue capacity  
    ✅ Set realistic limits, handle rejections
    
    ❌ No network latency
    ✅ Model propagation + queuing delay
    
    ❌ Same random seed for all components
    ✅ Fork PRNGs for independence
    
    ❌ Floating-point timestamps
    ✅ Use BigInt for precision
    
    ❌ No failure injection
    ✅ Test with chaos experiments
    
    ❌ Not verifying Little's Law
    ✅ L ≈ λ × W (check for bugs)
```

---

## Appendix C: Glossary

```
    λ (lambda)      Arrival rate
    μ (mu)          Service rate
    ρ (rho)         Utilization
    ta              Time advance function
    δext            External transition
    δint            Internal transition
    P50/P99         Percentile latencies
    MTBF            Mean time between failures
    MTTR            Mean time to recovery
```

---

## Conclusion

```
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │                    CONGRATULATIONS!                                 │
    │                                                                     │
    │   You now understand:                                               │
    │   • System design (nodes, edges, patterns)                         │
    │   • Discrete event simulation                                       │
    │   • Core data structures (heaps, PRNGs)                            │
    │   • Network physics and latency                                     │
    │   • Failure modes and resilience                                    │
    │   • DEVS formalism                                                  │
    │   • Chaos engineering                                               │
    │   • Output analysis                                                 │
    │                                                                     │
    │   BUILD → SIMULATE → TEST → ANALYZE → IMPROVE                      │
    │                                                                     │
    │   Happy simulating! 🚀                                              │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

---

*End of Part 5 — End of Complete Teaching Guide*