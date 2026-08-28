/**
 * Canonical task contracts for the Control Plane.
 *
 * These types deliberately separate intent, expected state, execution,
 * observation, reconciliation and verification. Runtime adapters may map
 * into these contracts but must not redefine their semantics.
 */

export type TaskStatus =
  | "created"
  | "planned"
  | "assigned"
  | "running"
  | "reconciling"
  | "iterating"
  | "verifying"
  | "accepted"
  | "rejected"
  | "blocked"
  | "cancelled";

export type TaskSource = "user" | "agent" | "system" | "integration";

export type Constraint = {
  id: string;
  description: string;
  kind?: "hard" | "soft";
};

export type TaskContext = Record<string, unknown>;

export type Deliverable = {
  id: string;
  description: string;
  required?: boolean;
};

export type AcceptanceCriterion = {
  id: string;
  description: string;
  required?: boolean;
};

export type ExpectedState = {
  description: string;
  assertions: Array<{
    id: string;
    description: string;
    expected: unknown;
  }>;
};

export type RiskModel = {
  score: number;
  factors?: Record<string, number>;
};

export type ConfidenceModel = {
  score: number;
  basis?: string[];
};

export type VerificationPolicy = {
  required: boolean;
  checks?: string[];
  minimumConfidence?: number;
};

export type RetryPolicy = {
  maxAttempts: number;
  maxCost?: number;
  deadline?: string;
  escalateToHuman?: boolean;
};

export type EvidenceRequirement = {
  id: string;
  description: string;
  required?: boolean;
};

export type CanonicalTask = {
  taskId: string;
  version: number;

  goal: string;
  intent: string;
  source: TaskSource;

  constraints: Constraint[];
  context: TaskContext;

  deliverables: Deliverable[];
  acceptanceCriteria: AcceptanceCriterion[];
  expectedState: ExpectedState;

  execution: {
    preferredAgent?: string;
    allowedRuntimes?: string[];
    dependencies?: string[];
  };

  risk: RiskModel;
  confidence: ConfidenceModel;
  verification: VerificationPolicy;
  retry: RetryPolicy;
  evidence: EvidenceRequirement[];

  status: TaskStatus;

  createdAt: string;
  updatedAt: string;
};
