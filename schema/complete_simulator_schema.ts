// ============================================================================
// SYSTEM DESIGN SIMULATOR - COMPLETE SCHEMA
// Incorporates: Original schema + DSDS Canonical Catalogue
// ============================================================================

// ============================================================================
// PART 1: COMPONENT TAXONOMY (Extended from Catalogue Page 1)
// ============================================================================

/**
 * Complete component type taxonomy
 * Organized by category as per the canonical catalogue
 */

// ---------------------------------------------------------------------------
// COMPUTE TYPES
// ---------------------------------------------------------------------------
type ComputeType =
  | 'api'                    // Stateless REST/gRPC endpoint
  | 'microservice'           // Stateful or stateless service
  | 'sidecar'                // Sidecar container (logging, proxy)
  | 'batch-worker'           // Batch job processor
  | 'serverless-function'    // Lambda-like FaaS
  | 'background-worker'      // Event-driven background processor
  | 'container'              // Generic container
  | 'vm'                     // VM instance
  | 'edge-worker'            // CDN edge compute
  | 'gpu-node';              // GPU/Accelerator node

// ---------------------------------------------------------------------------
// NETWORK & EDGE TYPES
// ---------------------------------------------------------------------------
type NetworkType =
  | 'load-balancer-l4'       // Layer 4 load balancer
  | 'load-balancer-l7'       // Layer 7 load balancer (HTTP aware)
  | 'global-traffic-manager' // Global LB / GTM
  | 'nat-gateway'            // NAT / Egress gateway
  | 'transit-gateway'        // TGW / Backbone connector
  | 'vpn-gateway'            // VPN / Direct Connect
  | 'cdn'                    // CDN cache layer
  | 'api-gateway'            // API Gateway (rate limiting, auth)
  | 'service-mesh-control'   // Service mesh control plane
  | 'service-mesh-data'      // Service mesh data plane (sidecars)
  | 'reverse-proxy'          // NGINX, Envoy, HAProxy
  | 'high-perf-nic';         // SR-IOV / DPDK interfaces

// ---------------------------------------------------------------------------
// STORAGE & DATA TYPES
// ---------------------------------------------------------------------------
type StorageType =
  | 'relational-db'          // SQL database
  | 'nosql-document'         // MongoDB-like
  | 'nosql-keyvalue'         // DynamoDB-like
  | 'nosql-wide-column'      // Cassandra-like
  | 'object-storage'         // S3-like
  | 'block-storage'          // EBS-like attached volumes
  | 'distributed-fs'         // HDFS, EFS, POSIX over network
  | 'cache'                  // Redis, Memcached
  | 'search-index'           // Elasticsearch, OpenSearch
  | 'timeseries-db'          // InfluxDB, TimescaleDB
  | 'columnar-olap'          // BigQuery, Redshift
  | 'graph-db'               // Neo4j, Neptune
  | 'data-warehouse'         // Snowflake, data lake
  | 'archive-storage'        // Glacier-like cold storage
  | 'schema-registry'        // Avro/Protobuf/JSON Schema registry
  | 'cdc-service'            // Change Data Capture
  | 'backup-service'         // Backup & snapshot
  | 'kms';                   // Key Management Service

// ---------------------------------------------------------------------------
// MESSAGING, STREAMING & EVENTING TYPES
// ---------------------------------------------------------------------------
type MessagingType =
  | 'queue'                  // SQS, RabbitMQ
  | 'pubsub'                 // Fan-out topics
  | 'stream'                 // Kafka-like ordered log
  | 'event-bus'              // EventBridge
  | 'event-store'            // Event sourcing store
  | 'message-broker'         // Broker cluster
  | 'task-queue';            // Celery-like task scheduler

// ---------------------------------------------------------------------------
// ORCHESTRATION & CONTROL PLANE TYPES
// ---------------------------------------------------------------------------
type OrchestrationTypes =
  | 'k8s-control-plane'      // Kubernetes control plane
  | 'k8s-node-pool'          // Kubernetes node pool
  | 'container-registry'     // ECR, GCR, ACR
  | 'service-registry'       // Consul, Eureka
  | 'config-store'           // ConfigMap, Parameter Store
  | 'secrets-manager'        // AWS Secrets Manager, Vault
  | 'cluster-autoscaler'     // Autoscaler controller
  | 'scheduler'              // K8s scheduler, Nomad
  | 'cicd-runner'            // CI/CD build service
  | 'iac-engine'             // Terraform, Pulumi
  | 'container-runtime';     // CRI, containerd

// ---------------------------------------------------------------------------
// SECURITY & IDENTITY TYPES
// ---------------------------------------------------------------------------
type SecurityType =
  | 'iam'                    // IAM / RBAC
  | 'waf'                    // Web Application Firewall
  | 'firewall'               // Network firewall / ACL
  | 'bastion'                // Bastion / Jump host
  | 'certificate-authority'  // PKI / CA
  | 'secrets-rotation'       // Secrets rotation service
  | 'dlp'                    // Data Loss Prevention
  | 'identity-provider'      // OIDC / SAML provider
  | 'siem'                   // Security analytics
  | 'token-manager';         // Privilege escalation controls

// ---------------------------------------------------------------------------
// OBSERVABILITY & TELEMETRY TYPES
// ---------------------------------------------------------------------------
type ObservabilityType =
  | 'logging'                // Centralized logging
  | 'tracing'                // Distributed tracing
  | 'metrics-store'          // Prometheus-like
  | 'alerting'               // Alert manager, PagerDuty
  | 'dashboard'              // Grafana, visualization
  | 'rum'                    // Real User Monitoring
  | 'synthetic-monitor'      // Synthetic testing
  | 'health-checker'         // Health check manager
  | 'profiler';              // CPU/heap profiler

// ---------------------------------------------------------------------------
// DEVOPS & DELIVERY TYPES
// ---------------------------------------------------------------------------
type DevOpsType =
  | 'artifact-repo'          // Artifact repository
  | 'build-system'           // Build runner
  | 'feature-flags'          // Feature flag service
  | 'deployment-controller'  // Blue/Green, Canary controller
  | 'chaos-framework'        // Chaos engineering
  | 'policy-engine'          // OPA, Gatekeeper
  | 'pipeline-secrets';      // Pipeline secrets management

// ---------------------------------------------------------------------------
// DATA INFRASTRUCTURE & ANALYTICS TYPES
// ---------------------------------------------------------------------------
type DataInfraType =
  | 'etl-pipeline'           // ETL / ELT
  | 'streaming-analytics'    // CEP, real-time analytics
  | 'feature-store'          // ML feature store
  | 'model-serving'          // TF Serving, SageMaker
  | 'ml-training';           // Training infrastructure

// ---------------------------------------------------------------------------
// REAL-TIME, MEDIA & P2P TYPES
// ---------------------------------------------------------------------------
type RealTimeType =
  | 'websocket-gateway'      // WebSocket server
  | 'push-notification'      // APNs, FCM
  | 'transcoder'             // Media transcoding pipeline
  | 'signaling-server'       // WebRTC signaling
  | 'sfu'                    // Selective Forwarding Unit
  | 'mcu'                    // Multipoint Control Unit
  | 'turn-server'            // TURN relay
  | 'webrtc-mesh';           // P2P mesh

// ---------------------------------------------------------------------------
// EXTERNAL & INTEGRATION TYPES
// ---------------------------------------------------------------------------
type IntegrationType =
  | 'webhook-gateway'        // Webhook receiver
  | 'saas-adapter'           // Third-party API connectors
  | 'payment-gateway'        // Stripe, PayPal
  | 'external-auth';         // Third-party auth

// ---------------------------------------------------------------------------
// DNS & CERTIFICATES TYPES
// ---------------------------------------------------------------------------
type DnsType =
  | 'dns-authoritative'      // Authoritative DNS
  | 'dns-internal'           // Internal / split-horizon DNS
  | 'cert-distributor'       // ACME, cert-manager
  | 'acme-server';           // Let's Encrypt

// ---------------------------------------------------------------------------
// CONSENSUS & COORDINATION TYPES
// ---------------------------------------------------------------------------
type ConsensusType =
  | 'etcd'                   // etcd cluster
  | 'consul-kv'              // Consul KV
  | 'leader-election'        // Leader election primitive
  | 'distributed-lock'       // Distributed locking
  | 'zookeeper';             // Coordination service

// ---------------------------------------------------------------------------
// AUXILIARY SERVICE TYPES
// ---------------------------------------------------------------------------
type AuxiliaryType =
  | 'mesh-telemetry'         // mTLS, sidecar telemetry
  | 'rate-limiter'           // Global/per-user rate limiting
  | 'circuit-breaker'        // Circuit breaker controller
  | 'bulkhead'               // Bulkhead isolation
  | 'idempotency-manager'    // Idempotency key manager
  | 'request-tracker'        // Header propagation
  | 'backpressure-controller'// Backpressure & QoS
  | 'token-bucket';          // Throttler

// ---------------------------------------------------------------------------
// UNIFIED COMPONENT TYPE
// ---------------------------------------------------------------------------
type ComponentType =
  | ComputeType
  | NetworkType
  | StorageType
  | MessagingType
  | OrchestrationTypes
  | SecurityType
  | ObservabilityType
  | DevOpsType
  | DataInfraType
  | RealTimeType
  | IntegrationType
  | DnsType
  | ConsensusType
  | AuxiliaryType
  | 'user-source'            // Traffic generator
  | 'external-dependency';   // External system


// ============================================================================
// PART 2: PATTERNS & ANTI-PATTERNS (From Catalogue Page 2-3)
// ============================================================================

/**
 * Architectural patterns that can be applied to components/flows
 */
type ArchitecturalPattern =
  // Data patterns
  | 'cqrs'                   // Command Query Responsibility Segregation
  | 'event-sourcing'         // Event sourcing
  | 'saga-choreography'      // Saga via events
  | 'saga-orchestration'     // Saga via orchestrator
  | 'materialized-views'     // Pre-computed views
  
  // Resilience patterns
  | 'circuit-breaker'        // Circuit breaker
  | 'bulkhead'               // Bulkhead isolation
  | 'retry-exponential'      // Retry with exponential backoff + jitter
  | 'backpressure'           // Backpressure handling
  | 'rate-limiting'          // Rate limiting
  
  // Deployment patterns
  | 'blue-green'             // Blue/green deployment
  | 'canary'                 // Canary deployment
  | 'canary-analysis'        // Automated canary analysis
  | 'strangler'              // Strangler fig migration
  
  // Structural patterns
  | 'ambassador'             // Ambassador pattern
  | 'sidecar'                // Sidecar pattern
  | 'bff'                    // Backend for Frontend
  | 'anti-corruption-layer'  // Anti-corruption layer
  
  // Scaling patterns
  | 'autoscale-queue-depth'  // Scale by queue depth
  | 'leader-follower'        // Leader-follower
  | 'read-replicas'          // Read replicas + primary
  
  // Caching patterns
  | 'cache-aside'            // Cache-aside (lazy loading)
  | 'write-through'          // Write-through cache
  | 'write-behind';          // Write-behind (async)

/**
 * Anti-patterns that the simulator should DETECT
 */
type AntiPattern =
  | 'monolithic-shared-db'   // Multiple services sharing one DB
  | 'sync-rpc-long-ops'      // Synchronous RPC for long operations
  | 'unlimited-retries'      // Retry storms
  | 'infinite-ttl-mutable'   // Infinite TTL on mutable cache data
  | 'over-sharding'          // Too many shards
  | 'distributed-transaction'// Single transaction across services
  | 'blocking-event-handler';// Blocking calls in event handlers

interface PatternApplication {
  pattern: ArchitecturalPattern;
  appliedTo: string[];       // Component or flow IDs
  config?: Record<string, unknown>;
}

interface AntiPatternDetection {
  antiPattern: AntiPattern;
  detectedAt: string[];      // Component or edge IDs
  severity: 'warning' | 'critical';
  recommendation: string;
}


// ============================================================================
// PART 3: COMPONENT SPECIFICATION (From Catalogue Page 4-5)
// ============================================================================

/**
 * Complete component definition with all uniform attributes
 */
interface ComponentDefinition {
  // ---------------------------------------------------------------------------
  // IDENTITY (Required)
  // ---------------------------------------------------------------------------
  id: string;
  type: ComponentType;
  name: string;
  
  // ---------------------------------------------------------------------------
  // DEPLOYMENT CONTEXT
  // ---------------------------------------------------------------------------
  provider: CloudProvider;
  region: string;
  zone?: string;
  
  // ---------------------------------------------------------------------------
  // VISUAL (For React Flow)
  // ---------------------------------------------------------------------------
  position: { x: number; y: number };
  style?: ComponentStyle;
  
  // ---------------------------------------------------------------------------
  // CONFIGURATION (Type-specific tunables)
  // ---------------------------------------------------------------------------
  config: ComponentConfig;
  
  // ---------------------------------------------------------------------------
  // RESOURCES
  // ---------------------------------------------------------------------------
  resources: ResourceSpec;
  
  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------
  lifecycle: {
    startTime?: number;      // When component comes online (ms from sim start)
    stopTime?: number;       // When component goes offline
    deployVersion: string;
  };
  
  // ---------------------------------------------------------------------------
  // DEPENDENCIES (Graph edges)
  // ---------------------------------------------------------------------------
  dependencies: string[];    // Direct dependencies (outgoing edges)
  // reverseDependencies computed at runtime
  
  // ---------------------------------------------------------------------------
  // HEALTH & RELIABILITY
  // ---------------------------------------------------------------------------
  healthCheck: HealthCheckConfig;
  reliability: ReliabilityConfig;
  
  // ---------------------------------------------------------------------------
  // TELEMETRY
  // ---------------------------------------------------------------------------
  telemetry: TelemetryConfig;
  
  // ---------------------------------------------------------------------------
  // SLO TARGETS
  // ---------------------------------------------------------------------------
  slo: SLOConfig;
  
  // ---------------------------------------------------------------------------
  // FAULT INJECTION HOOKS
  // ---------------------------------------------------------------------------
  faultInjection: FaultInjectionHooks;
  
  // ---------------------------------------------------------------------------
  // SCALING
  // ---------------------------------------------------------------------------
  scaling: ScalingPolicy;
  
  // ---------------------------------------------------------------------------
  // PERSISTENCE
  // ---------------------------------------------------------------------------
  persistence: 'ephemeral' | 'durable';
  
  // ---------------------------------------------------------------------------
  // SECURITY
  // ---------------------------------------------------------------------------
  security: SecurityConfig;
  
  // ---------------------------------------------------------------------------
  // FAILURE MODES (Component-specific)
  // ---------------------------------------------------------------------------
  failureModes: FailureModeDefinition[];
  
  // ---------------------------------------------------------------------------
  // METADATA
  // ---------------------------------------------------------------------------
  tags: string[];
  annotations?: Record<string, string>;
}

type CloudProvider = 
  | 'generic'
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'on-prem';

interface ResourceSpec {
  cpu: string;               // e.g., "500m", "2"
  memory: string;            // e.g., "1024Mi", "4Gi"
  storage?: string;          // e.g., "100Gi"
  gpu?: number;              // Number of GPUs
  iops?: number;             // Storage IOPS
  networkBandwidth?: string; // e.g., "10Gbps"
  
  // Cost modeling
  costPerHour?: number;      // USD per hour
}

interface HealthCheckConfig {
  endpoint?: string;         // Health check path
  protocol: 'http' | 'tcp' | 'grpc';
  intervalMs: number;
  timeoutMs: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  
  // Failure semantics
  failureAction: 'remove-from-lb' | 'restart' | 'alert-only';
}

interface TelemetryConfig {
  metrics: {
    enabled: boolean;
    exporters: ('prometheus' | 'cloudwatch' | 'stackdriver' | 'datadog')[];
    customMetrics?: string[];
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    structured: boolean;
  };
  tracing: {
    enabled: boolean;
    sampleRate: number;      // 0-1
    propagation: ('b3' | 'w3c' | 'jaeger')[];
  };
}

interface SLOConfig {
  latencyP50Ms?: number;
  latencyP95Ms?: number;
  latencyP99Ms?: number;
  errorRate?: number;        // Max acceptable error rate (0-1)
  availability?: number;     // Target availability (0-1, e.g., 0.999)
  throughputMin?: number;    // Minimum RPS
}

interface FaultInjectionHooks {
  enabled: boolean;
  
  // Pre-defined injection points
  latencyInjection?: {
    enabled: boolean;
    percentAffected: number;
    addedLatencyMs: DistributionConfig;
  };
  
  errorInjection?: {
    enabled: boolean;
    errorRate: number;
    errorTypes: string[];    // e.g., ["500", "503", "timeout"]
  };
  
  resourceExhaustion?: {
    enabled: boolean;
    type: 'cpu' | 'memory' | 'connections' | 'file-descriptors';
    threshold: number;
  };
}

interface ScalingPolicy {
  type: 'none' | 'horizontal' | 'vertical' | 'both';
  
  horizontal?: {
    minReplicas: number;
    maxReplicas: number;
    
    // Metrics triggers
    triggers: ScalingTrigger[];
    
    // Behavior
    scaleUpCooldownSec: number;
    scaleDownCooldownSec: number;
    scaleUpStep: number;     // How many replicas to add
    scaleDownStep: number;
    
    // Cold start penalty
    coldStartMs: number;     // Time for new replica to be ready
  };
  
  vertical?: {
    minCpu: string;
    maxCpu: string;
    minMemory: string;
    maxMemory: string;
  };
}

interface ScalingTrigger {
  metric: 'cpu' | 'memory' | 'queue-depth' | 'rps' | 'latency-p99' | 'custom';
  customMetricName?: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte';
  durationSec: number;       // Must exceed threshold for this duration
}

interface SecurityConfig {
  principals: string[];      // Who can access
  roles: string[];           // Required roles
  authRequired: boolean;
  encryption: {
    inTransit: boolean;
    atRest: boolean;
    kmsKeyId?: string;
  };
  networkPolicies?: {
    allowFrom: string[];     // Component IDs that can connect
    denyFrom?: string[];
  };
}

interface FailureModeDefinition {
  name: string;
  trigger: FailureTrigger;
  severity: 'low' | 'medium' | 'high' | 'critical';
  deterministic: boolean;    // Can be reproduced with same seed
  propagation?: FailurePropagation;
}

type FailureTrigger =
  | { type: 'dependency-failure'; dependencyId: string; failureCount: number }
  | { type: 'latency-spike'; thresholdMs: number }
  | { type: 'error-rate'; threshold: number }
  | { type: 'resource-exhaustion'; resource: string; threshold: number }
  | { type: 'scheduled'; atMs: number }
  | { type: 'probabilistic'; probability: number };


// ============================================================================
// PART 4: SIMULATION EVENTS (From Catalogue Page 6)
// ============================================================================

/**
 * All event types in the discrete event simulation
 */
type SimulationEventType =
  // Request lifecycle
  | 'request_arrival'
  | 'request_queued'
  | 'request_dequeued'
  | 'processing_start'
  | 'processing_complete'
  | 'request_forwarded'
  | 'request_timeout'
  | 'request_error'
  | 'request_retry'
  | 'request_complete'
  | 'request_rejected'
  
  // Component events
  | 'node_failure'
  | 'node_recovery'
  | 'node_degraded'
  
  // Network events
  | 'network_partition'
  | 'latency_spike'
  | 'packet_loss'
  | 'bandwidth_throttle'
  
  // Queue events
  | 'backlog_buildup'
  | 'queue_full'
  | 'queue_drained'
  
  // Deployment events
  | 'config_rollout'
  | 'deployment_start'
  | 'deployment_complete'
  | 'deployment_rollback'
  
  // Scaling events
  | 'scale_up'
  | 'scale_down'
  | 'cold_start'
  | 'scale_complete'
  
  // Database events
  | 'db_failover'
  | 'replication_lag'
  | 'db_connection_pool_exhausted'
  
  // Consistency events
  | 'reconciliation_event'
  | 'stale_read'
  | 'write_conflict'
  
  // Security events
  | 'security_breach'
  | 'auth_failure'
  | 'rate_limit_exceeded'
  
  // Scheduled events
  | 'scheduled_job'
  | 'cron_trigger'
  
  // Storage events
  | 'storage_full'
  | 'storage_throttled'
  
  // Schema events
  | 'schema_change'
  | 'schema_incompatible'
  
  // Circuit breaker events
  | 'circuit_open'
  | 'circuit_half_open'
  | 'circuit_close'
  
  // Cache events
  | 'cache_hit'
  | 'cache_miss'
  | 'cache_eviction'
  | 'cache_stampede'
  
  // Metrics events
  | 'metrics_snapshot'
  | 'slo_breach'
  | 'alert_triggered';

interface SimulationEvent {
  id: string;
  timestamp: bigint;         // Microseconds (BigInt for precision)
  type: SimulationEventType;
  
  // Event source
  sourceComponentId?: string;
  sourceRequestId?: string;
  
  // Event target
  targetComponentId?: string;
  
  // Type-specific data
  data: EventData;
  
  // For deterministic ordering of same-timestamp events
  priority: number;
  
  // Causality tracking
  causedBy?: string;         // Parent event ID
  
  // Determinism
  randomSeed?: number;       // Seed used for this event's randomness
}

type EventData =
  | RequestArrivalData
  | NodeFailureData
  | NetworkPartitionData
  | LatencySpikeData
  | BacklogData
  | ScaleEventData
  | DbFailoverData
  | SecurityBreachData
  | ScheduledJobData
  | StorageEventData
  | SchemaChangeData;

interface RequestArrivalData {
  request: Request;
  source: 'external' | 'internal';
  path?: string;
  headers?: Record<string, string>;
  bodySize?: number;
}

interface NodeFailureData {
  componentId: string;
  failureType: 'crash' | 'hang' | 'slow' | 'partial' | 'oom' | 'network-isolated';
  durationMs?: number;       // How long failure lasts (undefined = permanent)
  affectedReplicas?: number | 'all';
}

interface NetworkPartitionData {
  subsetA: string[];         // Component IDs in partition A
  subsetB: string[];         // Component IDs in partition B
  partitionType: 'full' | 'partial';
  packetLossRate?: number;   // For partial partition
  durationMs?: number;
}

interface LatencySpikeData {
  target: 'component' | 'edge';
  targetId: string;
  addedLatencyMs: number;
  durationMs: number;
  percentAffected: number;   // What % of requests affected
}

interface BacklogData {
  queueId: string;
  currentDepth: number;
  maxDepth: number;
  oldestItemAgeMs: number;
}

interface ScaleEventData {
  componentId: string;
  direction: 'up' | 'down';
  previousReplicas: number;
  newReplicas: number;
  trigger: string;           // What caused the scaling
  coldStartPenaltyMs?: number;
}

interface DbFailoverData {
  clusterId: string;
  previousPrimary: string;
  newPrimary: string;
  replicationLagMs: number;
  dataLossRisk: boolean;
}

interface SecurityBreachData {
  type: 'credential-leak' | 'privilege-escalation' | 'unauthorized-access';
  affectedResource: string;
  detectedBy?: string;
}

interface ScheduledJobData {
  jobId: string;
  cronExpression?: string;
  expectedDurationMs: number;
}

interface StorageEventData {
  storageId: string;
  eventType: 'full' | 'throttled' | 'corrupted';
  usedCapacity: number;
  totalCapacity: number;
}

interface SchemaChangeData {
  schemaId: string;
  changeType: 'compatible' | 'breaking';
  affectedConsumers: string[];
}


// ============================================================================
// PART 5: FAILURE MODES & PROPAGATION (From Catalogue Page 7)
// ============================================================================

/**
 * Failure propagation semantics
 */
interface FailurePropagation {
  // How failure spreads
  propagationType: 
    | 'cascading-timeout'    // Downstream timeouts cause upstream retries
    | 'backpressure'         // Queue saturation causes producer blocking
    | 'resource-exhaustion'  // Ports, FDs, NAT exhaustion
    | 'split-brain'          // Partition causes write conflicts
    | 'stale-reads'          // Eventual consistency issues
    | 'data-loss'            // Failed distributed transaction
    | 'thundering-herd'      // Cache expiry causing origin overload
    | 'config-drift'         // Nodes running different configs
    | 'security-cascade';    // Leaked token used for escalation
  
  // Propagation rules
  rules: PropagationRule[];
}

interface PropagationRule {
  // Condition for propagation
  condition: 
    | { type: 'dependency-failures'; threshold: number }
    | { type: 'error-rate-exceeded'; threshold: number }
    | { type: 'latency-exceeded'; thresholdMs: number }
    | { type: 'queue-depth-exceeded'; threshold: number }
    | { type: 'timeout-count'; threshold: number; windowMs: number };
  
  // Effect when condition is met
  effect: 
    | { type: 'increase-latency'; factor: number }
    | { type: 'increase-error-rate'; rate: number }
    | { type: 'trigger-circuit-breaker' }
    | { type: 'reject-requests' }
    | { type: 'cascade-to-dependents' }
    | { type: 'trigger-failover' };
  
  // Delay before effect takes place
  delayMs?: number;
}

/**
 * Specific failure scenarios to model
 */
interface FailureScenario {
  id: string;
  name: string;
  description: string;
  
  // Initial failure injection
  initialFailure: FaultInjection;
  
  // Expected propagation chain
  expectedPropagation: {
    componentId: string;
    expectedState: string;
    expectedTimeRangeMs: [number, number];
  }[];
  
  // Assertions after scenario plays out
  assertions: ScenarioAssertion[];
}


// ============================================================================
// PART 6: WORKLOAD PROFILES (From Catalogue Page 6)
// ============================================================================

/**
 * Traffic/workload patterns
 */
type WorkloadProfile =
  | SteadyStateWorkload
  | SpikeWorkload
  | DiurnalWorkload
  | SawtoothWorkload
  | BurstyWorkload
  | LongTailWorkload
  | ReplayWorkload
  | CustomWorkload;

interface SteadyStateWorkload {
  type: 'steady-state';
  requestsPerSecond: number;
  distribution: 'constant' | 'poisson';
}

interface SpikeWorkload {
  type: 'spike';
  baseRps: number;
  spikeRps: number;
  spikeStartMs: number;
  spikeDurationMs: number;
  rampUpMs?: number;         // Gradual spike
  rampDownMs?: number;
}

interface DiurnalWorkload {
  type: 'diurnal';
  baseRps: number;
  // 24 multipliers (one per hour)
  hourlyMultipliers: [
    number, number, number, number, number, number,  // 00:00-05:00
    number, number, number, number, number, number,  // 06:00-11:00
    number, number, number, number, number, number,  // 12:00-17:00
    number, number, number, number, number, number   // 18:00-23:00
  ];
  timezone: string;
}

interface SawtoothWorkload {
  type: 'sawtooth';
  minRps: number;
  maxRps: number;
  periodMs: number;          // Time for one sawtooth cycle
  rampType: 'linear' | 'exponential';
}

interface BurstyWorkload {
  type: 'bursty';
  baseRps: number;
  burstRps: number;
  burstDurationMs: number;
  burstIntervalDistribution: DistributionConfig;
}

interface LongTailWorkload {
  type: 'long-tail';
  // Most requests are small, few are very large
  requestSizeDistribution: DistributionConfig;  // Usually log-normal
  baseRps: number;
}

interface ReplayWorkload {
  type: 'replay';
  // Replay recorded traffic
  recordedEvents: {
    offsetMs: number;
    requestType?: string;
    metadata?: Record<string, unknown>;
  }[];
  timeScale: number;         // 1.0 = real-time, 2.0 = 2x speed
}

interface CustomWorkload {
  type: 'custom';
  // Time series of RPS values
  schedule: {
    atMs: number;
    rps: number;
  }[];
  interpolation: 'step' | 'linear';
}


// ============================================================================
// PART 7: FAULT INJECTION (From Catalogue Page 6)
// ============================================================================

/**
 * Fault injection specification
 */
interface FaultInjection {
  id: string;
  name: string;
  
  // Timing
  timing: 
    | { type: 'deterministic'; atMs: number }
    | { type: 'probabilistic'; probability: number; checkIntervalMs: number }
    | { type: 'conditional'; condition: FaultCondition };
  
  // Duration
  duration: 
    | { type: 'permanent' }
    | { type: 'fixed'; durationMs: number }
    | { type: 'until-condition'; condition: FaultCondition };
  
  // What to inject
  fault: FaultSpec;
  
  // Scope
  scope: 
    | { type: 'component'; componentId: string }
    | { type: 'edge'; edgeId: string }
    | { type: 'region'; regionId: string }
    | { type: 'percentage-of-replicas'; componentId: string; percentage: number };
}

type FaultSpec =
  | { type: 'latency'; addedMs: DistributionConfig }
  | { type: 'error'; errorRate: number; errorCode: string }
  | { type: 'packet-loss'; lossRate: number }
  | { type: 'bandwidth-limit'; limitMbps: number }
  | { type: 'cpu-stress'; utilizationPercent: number }
  | { type: 'memory-stress'; utilizationPercent: number }
  | { type: 'disk-full'; percentFull: number }
  | { type: 'connection-limit'; maxConnections: number }
  | { type: 'dns-failure' }
  | { type: 'certificate-expiry' }
  | { type: 'clock-skew'; skewMs: number }
  | { type: 'network-partition'; partitionWith: string[] }
  | { type: 'process-crash' }
  | { type: 'slow-start'; delayMs: number };

interface FaultCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  componentId?: string;
}


// ============================================================================
// PART 8: METRICS & SLIs (From Catalogue Page 8)
// ============================================================================

/**
 * Metrics to track during simulation
 */
interface MetricsDefinition {
  // Latency metrics
  latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    p999: number;
    min: number;
    max: number;
    mean: number;
    stdDev: number;
  };
  
  // Throughput metrics
  throughput: {
    requestsPerSecond: number;
    messagesPerSecond?: number;
    bytesPerSecond?: number;
  };
  
  // Availability
  availability: {
    successfulRequests: number;
    totalRequests: number;
    availabilityPercent: number;
    uptimeMs: number;
    downtimeMs: number;
  };
  
  // Error metrics
  errors: {
    errorRate: number;
    errorsByType: Record<string, number>;  // e.g., {"4xx": 100, "5xx": 50}
    timeoutRate: number;
    rejectionRate: number;
  };
  
  // Saturation metrics
  saturation: {
    cpuUtilization: number;
    memoryUtilization: number;
    queueLength: number;
    queueUtilization: number;  // queueLength / maxQueueSize
    connectionPoolUtilization: number;
    ioWait?: number;
  };
  
  // Durability (for storage)
  durability?: {
    writesAttempted: number;
    writesSucceeded: number;
    writesLost: number;
    replicaLag: number[];    // Lag per replica in ms
  };
  
  // Consistency
  consistency?: {
    replicationLagMs: number;
    staleReads: number;
    writeConflicts: number;
  };
  
  // Cost
  cost: {
    resourceHours: number;
    estimatedCostUsd: number;
  };
  
  // Recovery
  recovery: {
    mttr: number;            // Mean Time To Recovery (ms)
    mtbf: number;            // Mean Time Between Failures (ms)
    failureCount: number;
    recoveryCount: number;
  };
}

/**
 * SLO breach tracking
 */
interface SLOBreachEvent {
  sloType: 'latency' | 'error-rate' | 'availability' | 'throughput';
  threshold: number;
  actualValue: number;
  breachStartMs: number;
  breachEndMs?: number;
  durationMs: number;
  severity: 'warning' | 'critical';
  
  // Business impact
  affectedRequests: number;
  estimatedUserImpact: number;
}


// ============================================================================
// PART 9: SCALING SIMULATION (From Catalogue Page 9)
// ============================================================================

/**
 * Scaling simulation specifics
 */
interface ScalingSimulation {
  // Horizontal scaling
  horizontal: {
    // Cold start modeling
    coldStartDistribution: DistributionConfig;
    
    // Replica states
    replicaStates: {
      replicaId: string;
      state: 'starting' | 'ready' | 'draining' | 'terminated';
      startedAt: bigint;
      readyAt?: bigint;
      terminatedAt?: bigint;
    }[];
    
    // Scale events history
    scaleHistory: {
      timestamp: bigint;
      trigger: string;
      fromReplicas: number;
      toReplicas: number;
      completedAt?: bigint;
    }[];
  };
  
  // Vertical scaling
  vertical?: {
    resizeHistory: {
      timestamp: bigint;
      fromResources: ResourceSpec;
      toResources: ResourceSpec;
      downtimeMs: number;
    }[];
  };
  
  // Sharding / partition rebalancing
  sharding?: {
    totalShards: number;
    shardDistribution: Record<string, number[]>;  // nodeId -> shard IDs
    rebalancing: {
      inProgress: boolean;
      fromNode: string;
      toNode: string;
      shardId: number;
      startedAt: bigint;
      estimatedCompletionMs: number;
      throttleRate: number;  // Records per second being moved
    }[];
  };
}


// ============================================================================
// PART 10: INVARIANTS & POLICIES (From Catalogue Page 11)
// ============================================================================

/**
 * Invariants that must hold during simulation
 */
interface SimulationInvariant {
  id: string;
  name: string;
  description: string;
  
  type: InvariantType;
  
  // Check function (evaluated periodically or at end)
  check: InvariantCheck;
  
  // What to do on violation
  onViolation: 'log' | 'alert' | 'fail-simulation';
}

type InvariantType =
  | 'idempotency'            // Same key = exactly-once
  | 'causal-ordering'        // Message order preserved
  | 'consistency'            // e.g., balance >= 0
  | 'security'               // No unauthorized access
  | 'slo'                    // SLO maintained
  | 'data-integrity'         // No data corruption/loss
  | 'custom';

type InvariantCheck =
  | IdempotencyCheck
  | CausalOrderingCheck
  | ConsistencyCheck
  | SecurityCheck
  | SLOCheck
  | CustomCheck;

interface IdempotencyCheck {
  type: 'idempotency';
  // Track operations by idempotency key
  scope: string;             // Component ID or flow ID
  keyExtractor: string;      // JSONPath to extract key from request
}

interface CausalOrderingCheck {
  type: 'causal-ordering';
  topic: string;             // Queue/stream to check
  orderingKey: string;       // Field to order by
  allowedReorderingMs: number;
}

interface ConsistencyCheck {
  type: 'consistency';
  expression: string;        // e.g., "account.balance >= 0"
  scope: string;             // Where to check
}

interface SecurityCheck {
  type: 'security';
  rule: string;              // e.g., "no-request-without-auth"
  scope: string[];           // Component IDs
}

interface SLOCheck {
  type: 'slo';
  metric: 'latency-p95' | 'latency-p99' | 'error-rate' | 'availability';
  threshold: number;
  windowMs: number;
}

interface CustomCheck {
  type: 'custom';
  // Custom validation function (serialized)
  validatorCode: string;
}


// ============================================================================
// PART 11: SIMULATION OUTPUTS (From Catalogue Page 12)
// ============================================================================

/**
 * Complete simulation output
 */
interface SimulationOutput {
  // Run metadata
  runId: string;
  seed: string;
  startedAt: number;
  completedAt: number;
  simulatedDurationMs: number;
  wallClockDurationMs: number;
  
  // Configuration used
  architecture: SystemArchitecture;
  workload: WorkloadProfile;
  faultInjections: FaultInjection[];
  
  // ---------------------------------------------------------------------------
  // EVENT TRACES
  // ---------------------------------------------------------------------------
  eventTraces: {
    // Full ordered event list (may be sampled for large simulations)
    events: SimulationEvent[];
    totalEvents: number;
    samplingRate: number;
  };
  
  // ---------------------------------------------------------------------------
  // DISTRIBUTED TRACES (Request-level)
  // ---------------------------------------------------------------------------
  requestTraces: {
    traces: RequestTrace[];
    totalRequests: number;
    samplingRate: number;
  };
  
  // ---------------------------------------------------------------------------
  // METRICS (Aggregated)
  // ---------------------------------------------------------------------------
  metrics: {
    global: MetricsDefinition;
    perComponent: Record<string, MetricsDefinition>;
    perEdge: Record<string, EdgeMetrics>;
  };
  
  // ---------------------------------------------------------------------------
  // TIME SERIES (For visualization)
  // ---------------------------------------------------------------------------
  timeSeries: TimeSeriesOutput;
  
  // ---------------------------------------------------------------------------
  // HEATMAPS
  // ---------------------------------------------------------------------------
  heatmaps: {
    // Load over components over time
    loadHeatmap: {
      timestamps: number[];
      componentIds: string[];
      values: number[][];    // [time][component] = load
    };
    
    // Latency heatmap
    latencyHeatmap: {
      timestamps: number[];
      componentIds: string[];
      values: number[][];    // [time][component] = p99 latency
    };
    
    // Error rate heatmap
    errorHeatmap: {
      timestamps: number[];
      componentIds: string[];
      values: number[][];    // [time][component] = error rate
    };
  };
  
  // ---------------------------------------------------------------------------
  // CAUSAL GRAPH (Failure propagation)
  // ---------------------------------------------------------------------------
  causalGraph: {
    nodes: {
      id: string;
      type: 'failure' | 'effect' | 'recovery';
      componentId: string;
      timestamp: number;
      description: string;
    }[];
    edges: {
      from: string;
      to: string;
      type: 'caused' | 'mitigated';
      delayMs: number;
    }[];
  };
  
  // ---------------------------------------------------------------------------
  // INVARIANT VIOLATIONS
  // ---------------------------------------------------------------------------
  invariantViolations: {
    invariantId: string;
    invariantName: string;
    violatedAt: number;
    details: string;
    rootCause?: string;
    affectedComponents: string[];
  }[];
  
  // ---------------------------------------------------------------------------
  // SLO BREACHES
  // ---------------------------------------------------------------------------
  sloBreaches: SLOBreachEvent[];
  
  // ---------------------------------------------------------------------------
  // ANTI-PATTERNS DETECTED
  // ---------------------------------------------------------------------------
  antiPatternsDetected: AntiPatternDetection[];
  
  // ---------------------------------------------------------------------------
  // INSIGHTS & RECOMMENDATIONS
  // ---------------------------------------------------------------------------
  insights: SimulationInsight[];
  
  // ---------------------------------------------------------------------------
  // VERIFICATION (Little's Law, etc.)
  // ---------------------------------------------------------------------------
  verification: VerificationResults;
  
  // ---------------------------------------------------------------------------
  // REPRODUCIBILITY
  // ---------------------------------------------------------------------------
  reproducibilitySpec: {
    seed: string;
    configHash: string;
    // Enough info to reproduce exact same simulation
    deterministicConfig: string;  // Serialized config
  };
}

interface RequestTrace {
  traceId: string;
  requestId: string;
  
  // Timing
  startTime: bigint;
  endTime: bigint;
  totalDurationMs: number;
  
  // Outcome
  status: 'success' | 'error' | 'timeout' | 'rejected';
  errorDetails?: string;
  
  // Spans (distributed trace)
  spans: TraceSpan[];
}

interface TraceSpan {
  spanId: string;
  parentSpanId?: string;
  componentId: string;
  operationName: string;
  
  startTime: bigint;
  endTime: bigint;
  durationMs: number;
  
  // Breakdown
  queueTimeMs: number;
  processingTimeMs: number;
  networkTimeMs: number;
  
  // Status
  status: 'ok' | 'error';
  errorType?: string;
  
  // Tags
  tags: Record<string, string>;
}

interface TimeSeriesOutput {
  // Timestamps (shared x-axis)
  timestamps: number[];
  resolution: number;        // Ms between data points
  
  // Global metrics
  global: {
    throughputRps: number[];
    latencyP50: number[];
    latencyP99: number[];
    errorRate: number[];
    activeRequests: number[];
  };
  
  // Per-component
  components: Record<string, {
    queueLength: number[];
    activeRequests: number[];
    replicas: number[];
    throughputRps: number[];
    latencyP99: number[];
    cpuUtilization: number[];
    memoryUtilization: number[];
    errorRate: number[];
  }>;
}


// ============================================================================
// PART 12: PROVIDER MAPPING (From Catalogue Page 13)
// ============================================================================

/**
 * Cloud provider-specific configurations
 */
interface ProviderConfig {
  provider: CloudProvider;
  
  // Provider-specific latencies
  latencyProfiles: {
    sameZone: DistributionConfig;
    sameRegion: DistributionConfig;
    crossRegion: DistributionConfig;
  };
  
  // Quotas and limits
  quotas: {
    maxInstancesPerRegion?: number;
    maxConcurrentLambda?: number;
    maxApiGatewayRps?: number;
    maxS3RequestsPerPrefix?: number;
    // ... more quotas
  };
  
  // Cost profiles
  costs: ProviderCosts;
  
  // Service-specific configs
  serviceConfigs: Record<string, ProviderServiceConfig>;
}

interface ProviderCosts {
  compute: {
    perVCpuHour: number;
    perGbMemoryHour: number;
    perGpuHour?: number;
  };
  
  storage: {
    perGbMonth: number;
    perMillionRequests: number;
    perGbTransfer: number;
  };
  
  network: {
    perGbIntraRegion: number;
    perGbInterRegion: number;
    perGbInternet: number;
  };
  
  messaging: {
    perMillionMessages: number;
    perGbData: number;
  };
  
  database: {
    perInstanceHour: Record<string, number>;  // Instance type -> cost
    perGbStorage: number;
    perMillionIOPS?: number;
  };
}

interface ProviderServiceConfig {
  // e.g., AWS Lambda specific
  type: string;
  
  // Cold start characteristics
  coldStart?: {
    probability: number;
    durationDistribution: DistributionConfig;
  };
  
  // Throttling behavior
  throttling?: {
    burstLimit: number;
    sustainedLimit: number;
    throttleLatencyMs: number;
  };
  
  // Failover characteristics
  failover?: {
    detectionTimeMs: number;
    failoverTimeMs: number;
  };
}

// Pre-built provider profiles
const AWS_PROFILE: ProviderConfig = {
  provider: 'aws',
  latencyProfiles: {
    sameZone: { type: 'log-normal', mu: -0.5, sigma: 0.3 },
    sameRegion: { type: 'log-normal', mu: 0.5, sigma: 0.4 },
    crossRegion: { type: 'log-normal', mu: 3.5, sigma: 0.5 },
  },
  quotas: {
    maxConcurrentLambda: 1000,
    maxApiGatewayRps: 10000,
  },
  costs: {
    compute: { perVCpuHour: 0.04, perGbMemoryHour: 0.005 },
    storage: { perGbMonth: 0.023, perMillionRequests: 0.4, perGbTransfer: 0.09 },
    network: { perGbIntraRegion: 0.01, perGbInterRegion: 0.02, perGbInternet: 0.09 },
    messaging: { perMillionMessages: 0.4, perGbData: 0.09 },
    database: { perInstanceHour: { 'db.t3.micro': 0.017, 'db.r5.large': 0.24 }, perGbStorage: 0.115 },
  },
  serviceConfigs: {
    lambda: {
      type: 'serverless',
      coldStart: {
        probability: 0.1,
        durationDistribution: { type: 'log-normal', mu: 6.2, sigma: 0.5 },  // ~500ms
      },
      throttling: {
        burstLimit: 3000,
        sustainedLimit: 1000,
        throttleLatencyMs: 100,
      },
    },
  },
};


// ============================================================================
// PART 13: UTILITIES & TOOLS (From Catalogue Page 14)
// ============================================================================

/**
 * Utility components for the simulator
 */

// Deterministic random controller
interface DeterministicRandomController {
  seed: string;
  currentState: bigint;
  
  // Generate next random value
  next(): number;
  
  // Generate from distribution
  fromDistribution(dist: DistributionConfig): number;
  
  // Fork for sub-simulations
  fork(subSeed: string): DeterministicRandomController;
  
  // Get current state for checkpointing
  checkpoint(): bigint;
  restore(state: bigint): void;
}

// Scenario composer
interface ScenarioComposer {
  // DSL for composing scenarios
  scenarios: ComposedScenario[];
  
  // Combine multiple primitives
  combine(scenarios: ScenarioComposer[]): ScenarioComposer;
  
  // Sequential execution
  then(next: ScenarioComposer): ScenarioComposer;
  
  // Parallel execution
  parallel(other: ScenarioComposer): ScenarioComposer;
  
  // Repeat
  repeat(times: number): ScenarioComposer;
}

interface ComposedScenario {
  id: string;
  name: string;
  steps: ScenarioStep[];
}

type ScenarioStep =
  | { type: 'inject-fault'; fault: FaultInjection }
  | { type: 'wait'; durationMs: number }
  | { type: 'wait-for-condition'; condition: FaultCondition; timeoutMs: number }
  | { type: 'change-traffic'; newWorkload: WorkloadProfile }
  | { type: 'deploy'; componentId: string; newVersion: string }
  | { type: 'scale'; componentId: string; replicas: number }
  | { type: 'assert'; invariant: SimulationInvariant };

// Cost calculator
interface CostCalculator {
  calculate(
    simulation: SimulationOutput,
    providerConfig: ProviderConfig
  ): CostReport;
}

interface CostReport {
  totalCost: number;
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    messaging: number;
    database: number;
    other: number;
  };
  perComponent: Record<string, number>;
  perHour: number[];         // Cost over time
  recommendations: string[]; // Cost optimization suggestions
}

// Impact calculator
interface ImpactCalculator {
  calculateImpact(
    componentId: string,
    failureType: string,
    simulation: SimulationOutput
  ): ImpactReport;
}

interface ImpactReport {
  componentId: string;
  
  // Direct impact
  directlyAffectedRequests: number;
  directlyAffectedUsers: number;
  
  // Cascading impact
  cascadeDepth: number;
  totalAffectedComponents: string[];
  totalAffectedRequests: number;
  totalAffectedUsers: number;
  
  // Business impact
  estimatedRevenueLoss?: number;
  sloBreachDuration: number;
  
  // Mitigation
  mitigationPath: string[];
  estimatedRecoveryTime: number;
}

// Replay engine
interface ReplayEngine {
  // Load recorded events
  load(eventTrace: SimulationEvent[]): void;
  
  // Replay at different speeds
  replay(speed: number): AsyncIterable<SimulationEvent>;
  
  // Jump to specific time
  seekTo(timestamp: bigint): void;
  
  // Mutate events for fuzzing
  mutate(mutator: EventMutator): void;
}

interface EventMutator {
  type: 'delay' | 'reorder' | 'drop' | 'duplicate' | 'corrupt';
  probability: number;
  config?: Record<string, unknown>;
}

// A/B Comparator
interface DesignComparator {
  compare(
    designA: SystemArchitecture,
    designB: SystemArchitecture,
    workload: WorkloadProfile,
    scenarios: FaultInjection[]
  ): ComparisonReport;
}

interface ComparisonReport {
  designAResults: SimulationOutput;
  designBResults: SimulationOutput;
  
  comparison: {
    latencyDiff: {
      p50: number;
      p99: number;
    };
    throughputDiff: number;
    availabilityDiff: number;
    costDiff: number;
    
    winner: 'A' | 'B' | 'tie';
    confidence: number;
  };
  
  tradeoffs: {
    aAdvantages: string[];
    bAdvantages: string[];
  };
}


// ============================================================================
// PART 14: EXAMPLE SCENARIOS (From Catalogue Page 15)
// ============================================================================

/**
 * Pre-built scenarios to ship with simulator
 */
const BUILT_IN_SCENARIOS: ComposedScenario[] = [
  {
    id: 'cache-stampede',
    name: 'Cache Stampede',
    steps: [
      {
        type: 'inject-fault',
        fault: {
          id: 'cache-expire',
          name: 'Mass cache expiry',
          timing: { type: 'deterministic', atMs: 10000 },
          duration: { type: 'fixed', durationMs: 1 },
          fault: { type: 'process-crash' },
          scope: { type: 'component', componentId: 'cache' },
        },
      },
      { type: 'wait', durationMs: 5000 },
      {
        type: 'assert',
        invariant: {
          id: 'origin-not-overloaded',
          name: 'Origin should handle stampede',
          description: 'Database should not exceed 95% CPU during cache miss storm',
          type: 'slo',
          check: { type: 'slo', metric: 'latency-p99', threshold: 1000, windowMs: 5000 },
          onViolation: 'log',
        },
      },
    ],
  },
  {
    id: 'db-primary-crash',
    name: 'Database Primary Crash',
    steps: [
      { type: 'wait', durationMs: 5000 },  // Let system warm up
      {
        type: 'inject-fault',
        fault: {
          id: 'db-crash',
          name: 'Primary DB crash',
          timing: { type: 'deterministic', atMs: 5000 },
          duration: { type: 'fixed', durationMs: 30000 },
          fault: { type: 'process-crash' },
          scope: { type: 'component', componentId: 'db-primary' },
        },
      },
      { type: 'wait', durationMs: 35000 },
      {
        type: 'assert',
        invariant: {
          id: 'data-not-lost',
          name: 'No data loss during failover',
          description: 'All committed writes should be preserved',
          type: 'data-integrity',
          check: { type: 'custom', validatorCode: 'checkDataIntegrity()' },
          onViolation: 'fail-simulation',
        },
      },
    ],
  },
  {
    id: 'network-partition',
    name: 'Cross-Region Network Partition',
    steps: [
      {
        type: 'inject-fault',
        fault: {
          id: 'partition',
          name: 'Region partition',
          timing: { type: 'deterministic', atMs: 10000 },
          duration: { type: 'fixed', durationMs: 60000 },
          fault: { type: 'network-partition', partitionWith: ['region-b'] },
          scope: { type: 'region', regionId: 'region-a' },
        },
      },
      { type: 'wait', durationMs: 65000 },
      {
        type: 'assert',
        invariant: {
          id: 'no-split-brain',
          name: 'No split-brain writes',
          description: 'Should not have conflicting writes during partition',
          type: 'consistency',
          check: { type: 'consistency', expression: 'no_write_conflicts', scope: 'db-cluster' },
          onViolation: 'fail-simulation',
        },
      },
    ],
  },
  {
    id: 'auth-outage',
    name: 'Auth Provider Outage',
    steps: [
      {
        type: 'inject-fault',
        fault: {
          id: 'auth-down',
          name: 'Auth service down',
          timing: { type: 'deterministic', atMs: 5000 },
          duration: { type: 'fixed', durationMs: 120000 },
          fault: { type: 'error', errorRate: 1.0, errorCode: '503' },
          scope: { type: 'component', componentId: 'auth-service' },
        },
      },
      { type: 'wait', durationMs: 125000 },
    ],
  },
  {
    id: 'traffic-spike-cold-start',
    name: '10x Traffic Spike with Cold Starts',
    steps: [
      {
        type: 'change-traffic',
        newWorkload: {
          type: 'spike',
          baseRps: 100,
          spikeRps: 1000,
          spikeStartMs: 5000,
          spikeDurationMs: 60000,
          rampUpMs: 1000,
        },
      },
      { type: 'wait', durationMs: 70000 },
      {
        type: 'assert',
        invariant: {
          id: 'autoscale-handled',
          name: 'Autoscaling handled spike',
          description: 'P99 latency should stay under SLO during spike',
          type: 'slo',
          check: { type: 'slo', metric: 'latency-p99', threshold: 500, windowMs: 60000 },
          onViolation: 'log',
        },
      },
    ],
  },
];


// ============================================================================
// PART 15: COMPLETE SYSTEM ARCHITECTURE (Unified)
// ============================================================================

/**
 * The complete system architecture definition
 */
interface SystemArchitecture {
  // Metadata
  id: string;
  name: string;
  version: string;
  description?: string;
  
  // Components
  components: ComponentDefinition[];
  
  // Edges (connections)
  edges: EdgeDefinition[];
  
  // Patterns applied
  patterns: PatternApplication[];
  
  // Global configuration
  globalConfig: GlobalConfig;
  
  // Provider settings
  providers: ProviderConfig[];
  
  // Pre-defined failure scenarios
  failureScenarios: FailureScenario[];
  
  // Invariants to check
  invariants: SimulationInvariant[];
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

interface GlobalConfig {
  // Simulation settings
  simulation: {
    defaultDurationMs: number;
    warmupMs: number;
    defaultSeed: string;
    timeResolutionMicroseconds: number;
  };
  
  // Default workload
  defaultWorkload: WorkloadProfile;
  
  // Global timeouts
  timeouts: {
    defaultRequestTimeoutMs: number;
    defaultConnectTimeoutMs: number;
  };
  
  // Global retry policy
  retryPolicy: {
    maxAttempts: number;
    backoffType: 'exponential' | 'linear' | 'constant';
    baseDelayMs: number;
    maxDelayMs: number;
    jitterFactor: number;
  };
  
  // Observability defaults
  observability: TelemetryConfig;
  
  // Multi-region config
  regions: {
    id: string;
    name: string;
    provider: CloudProvider;
    zones: string[];
  }[];
}

/**
 * Edge definition with full properties
 */
interface EdgeDefinition {
  id: string;
  source: string;            // Source component ID
  target: string;            // Target component ID
  
  // Connection type
  connectionType: 'sync' | 'async' | 'streaming';
  protocol: 'http' | 'grpc' | 'tcp' | 'websocket' | 'kafka' | 'sqs' | 'custom';
  
  // Network properties
  network: {
    latency: DistributionConfig;
    bandwidth?: {
      limitMbps: number;
      burstMbps?: number;
    };
    packetLoss: number;
    jitter?: DistributionConfig;
  };
  
  // Retry configuration
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier: number;
    retryableErrors: string[];
  };
  
  // Circuit breaker
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold: number;
    recoveryWindowMs: number;
    halfOpenRequests: number;
  };
  
  // Load distribution (for multi-target edges)
  weight?: number;
  
  // Visual
  style?: EdgeStyle;
  label?: string;
}


// ============================================================================
// PART 16: DISTRIBUTION CONFIGS (Complete)
// ============================================================================

type DistributionConfig =
  | { type: 'constant'; value: number }
  | { type: 'uniform'; min: number; max: number }
  | { type: 'normal'; mean: number; stdDev: number; min?: number; max?: number }
  | { type: 'log-normal'; mu: number; sigma: number }
  | { type: 'exponential'; rate: number }
  | { type: 'poisson'; lambda: number }
  | { type: 'weibull'; shape: number; scale: number }
  | { type: 'gamma'; shape: number; rate: number }
  | { type: 'beta'; alpha: number; beta: number; min?: number; max?: number }
  | { type: 'pareto'; shape: number; scale: number }
  | { type: 'empirical'; samples: number[]; interpolation: 'linear' | 'step' }
  | { type: 'mixture'; components: { weight: number; distribution: DistributionConfig }[] };


// ============================================================================
// PART 17: COMPONENT CONFIGS (Type-specific)
// ============================================================================

type ComponentConfig =
  | ApiConfig
  | MicroserviceConfig
  | LoadBalancerConfig
  | DatabaseConfig
  | CacheConfig
  | QueueConfig
  | StreamConfig
  | ServerlessFunctionConfig
  | CDNConfig
  | SFUConfig
  | GatewayConfig
  | GenericConfig;

interface ApiConfig {
  type: 'api';
  endpoints: {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    latency: DistributionConfig;
    errorRate: number;
  }[];
  rateLimit?: {
    requestsPerSecond: number;
    burstSize: number;
  };
}

interface MicroserviceConfig {
  type: 'microservice';
  stateful: boolean;
  processingLatency: DistributionConfig;
  dependencies: string[];
}

interface LoadBalancerConfig {
  type: 'load-balancer';
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash' | 'random';
  healthCheck: HealthCheckConfig;
  stickySession?: {
    enabled: boolean;
    ttlMs: number;
    cookieName: string;
  };
  weights?: Record<string, number>;
}

interface DatabaseConfig {
  type: 'database';
  engine: 'postgres' | 'mysql' | 'mongodb' | 'dynamodb' | 'cassandra' | 'redis';
  
  connectionPool: {
    minConnections: number;
    maxConnections: number;
    connectionTimeoutMs: number;
    idleTimeoutMs: number;
  };
  
  replication?: {
    mode: 'sync' | 'async' | 'semi-sync';
    replicas: number;
    lagDistribution: DistributionConfig;
  };
  
  sharding?: {
    enabled: boolean;
    shardCount: number;
    shardKey: string;
    rebalanceThrottleRps: number;
  };
  
  queryLatency: {
    read: DistributionConfig;
    write: DistributionConfig;
    indexedRead?: DistributionConfig;
  };
  
  failover?: {
    automaticFailover: boolean;
    detectionTimeMs: number;
    failoverTimeMs: number;
  };
}

interface CacheConfig {
  type: 'cache';
  engine: 'redis' | 'memcached' | 'local';
  
  capacity: {
    maxKeys: number;
    maxMemoryMb: number;
  };
  
  eviction: 'lru' | 'lfu' | 'fifo' | 'random' | 'ttl';
  defaultTtlMs: number;
  
  hitRate: number;           // Expected hit rate
  
  latency: {
    hit: DistributionConfig;
    miss: DistributionConfig;
  };
  
  replication?: {
    enabled: boolean;
    replicas: number;
  };
}

interface QueueConfig {
  type: 'queue';
  engine: 'sqs' | 'rabbitmq' | 'activemq';
  
  capacity: {
    maxMessages: number;
    maxMessageSize: number;
  };
  
  delivery: 'at-most-once' | 'at-least-once' | 'exactly-once';
  ordering: 'fifo' | 'unordered';
  
  visibility: {
    timeoutMs: number;
    maxReceives: number;
  };
  
  deadLetter?: {
    enabled: boolean;
    maxReceives: number;
    queueId: string;
  };
  
  batching?: {
    enabled: boolean;
    maxSize: number;
    maxWaitMs: number;
  };
}

interface StreamConfig {
  type: 'stream';
  engine: 'kafka' | 'kinesis' | 'pulsar' | 'eventbridge';
  
  partitions: number;
  replicationFactor: number;
  
  retention: {
    timeMs: number;
    sizeBytes: number;
  };
  
  throughput: {
    maxWriteRps: number;
    maxReadRps: number;
    maxBytesPerSecond: number;
  };
  
  consumerGroups?: {
    groupId: string;
    consumers: number;
    processingLatency: DistributionConfig;
    commitIntervalMs: number;
  }[];
}

interface ServerlessFunctionConfig {
  type: 'serverless';
  runtime: 'nodejs' | 'python' | 'java' | 'go' | 'dotnet';
  
  memory: number;            // MB
  timeout: number;           // Ms
  
  coldStart: {
    probability: number;
    durationDistribution: DistributionConfig;
  };
  
  concurrency: {
    reserved: number;
    maxBurst: number;
  };
  
  provisioned?: {
    enabled: boolean;
    minInstances: number;
  };
}

interface CDNConfig {
  type: 'cdn';
  provider: 'cloudfront' | 'cloudflare' | 'akamai' | 'fastly';
  
  caching: {
    defaultTtlSec: number;
    maxTtlSec: number;
    cacheKeyPolicy: string[];
  };
  
  hitRate: number;
  
  latency: {
    hit: DistributionConfig;
    miss: DistributionConfig;
  };
  
  edgeLocations: string[];
  
  originShield?: {
    enabled: boolean;
    region: string;
  };
}

interface SFUConfig {
  type: 'sfu';
  
  capacity: {
    maxRooms: number;
    maxParticipantsPerRoom: number;
    maxBitratePerParticipant: number;
  };
  
  media: {
    videoCodecs: string[];
    audioCodecs: string[];
    simulcast: boolean;
  };
  
  latency: DistributionConfig;
  packetLoss: number;
  jitter: DistributionConfig;
}

interface GatewayConfig {
  type: 'gateway';
  
  rateLimit: {
    requestsPerSecond: number;
    burstSize: number;
    perUser: boolean;
  };
  
  authentication: {
    required: boolean;
    methods: ('api-key' | 'jwt' | 'oauth' | 'mtls')[];
    cacheTtlMs: number;
  };
  
  transformation: {
    requestTransform: boolean;
    responseTransform: boolean;
    latencyMs: number;
  };
}

interface GenericConfig {
  type: 'generic';
  processingLatency: DistributionConfig;
  errorRate: number;
  custom: Record<string, unknown>;
}


// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Component types
  ComponentType,
  ComponentDefinition,
  ComponentConfig,
  
  // Architecture
  SystemArchitecture,
  EdgeDefinition,
  GlobalConfig,
  
  // Events
  SimulationEvent,
  SimulationEventType,
  EventData,
  
  // Patterns
  ArchitecturalPattern,
  AntiPattern,
  PatternApplication,
  
  // Workloads
  WorkloadProfile,
  
  // Faults
  FaultInjection,
  FaultSpec,
  FailurePropagation,
  
  // Metrics
  MetricsDefinition,
  SLOConfig,
  SLOBreachEvent,
  
  // Invariants
  SimulationInvariant,
  InvariantCheck,
  
  // Output
  SimulationOutput,
  RequestTrace,
  TimeSeriesOutput,
  
  // Providers
  ProviderConfig,
  CloudProvider,
  
  // Utilities
  DistributionConfig,
  DeterministicRandomController,
  ScenarioComposer,
  
  // Built-in scenarios
  BUILT_IN_SCENARIOS,
  AWS_PROFILE,
};
