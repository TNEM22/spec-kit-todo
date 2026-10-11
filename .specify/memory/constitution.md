<!--
Sync Impact Report
- Version change: (unversioned template) → 1.0.0
- Modified principles (template placeholder → new title):
  - [PRINCIPLE_1_NAME] → I. Security-First (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Validate All Inputs (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Microservices Architecture
  - [PRINCIPLE_4_NAME] → IV. Fully Documented Code
  - [PRINCIPLE_5_NAME] → V. Observability & Auditability (inferred; supports I and III)
- Added sections: Security Requirements, Development Workflow & Quality Gates, Governance
- Removed sections: none
- Deferred TODOs: none
-->

# Taskify Constitution

## Core Principles

### I. Security-First (NON-NEGOTIABLE)

Security is a design input, not a later review step. Every feature, service, and change MUST
consider its threat surface before implementation begins.

- Each spec and plan MUST include a security considerations section covering authentication,
  authorization, data exposure, and abuse cases.
- Services MUST apply least privilege: every service, account, and token gets only the
  permissions it needs.
- Default behavior MUST be deny: unauthenticated or unauthorized requests are rejected unless a
  route is explicitly declared public.
- Secrets MUST NOT appear in source code, logs, or client-visible responses; they are loaded from
  a secrets store or environment configuration.
- Known vulnerabilities in dependencies at high or critical severity MUST be resolved or
  formally risk-accepted before release.

Rationale: Taskify handles user and team data; security defects are the most expensive class of
defect to fix after release.

### II. Validate All Inputs (NON-NEGOTIABLE)

All data crossing a trust boundary MUST be validated before use. This includes user input in the
UI, API request bodies, query and path parameters, headers, uploaded files, inter-service messages,
and data read from external systems.

- Validation MUST be server-side; client-side validation is a usability aid only.
- Inputs MUST be checked against an explicit schema (type, format, length, range, allowed values)
  using an allow-list approach.
- Invalid input MUST be rejected with a clear, non-leaking error; it MUST NOT be silently coerced.
- Output MUST be encoded for its context (HTML, SQL, shell, URL); queries MUST use parameterized
  statements.
- Every validation rule MUST be covered by tests that include malformed and malicious inputs.

Rationale: Unvalidated input is the root cause of injection, XSS, and most data-integrity bugs.

### III. Microservices Architecture

Taskify is built as a set of independently deployable services, each owning one bounded
business capability.

- Each service MUST own its data store; services MUST NOT read or write another service's
  database directly.
- Services MUST communicate only through documented, versioned contracts (APIs or events).
- Breaking contract changes MUST use a new version and keep the previous version available until
  all consumers have migrated.
- Each service MUST be independently buildable, testable, and deployable.
- Inter-service calls MUST be authenticated; network location alone is not trust (see I).
- A new service MUST be justified in the plan by a distinct capability; splitting purely for
  organizational reasons is not allowed.

Rationale: Clear service boundaries limit blast radius, both for failures and for security
breaches, and let services evolve independently.

### IV. Fully Documented Code

Code MUST be understandable without asking its author.

- Every public module, class, function, and API endpoint MUST have documentation describing its
  purpose, parameters, return values, errors raised, and security-relevant behavior.
- Every service MUST have a README covering its responsibility, how to run and test it, its
  configuration, and its dependencies.
- Every service API MUST have a machine-readable contract (e.g., OpenAPI or an event schema) kept
  in sync with the implementation.
- Non-obvious logic and any security-related decision MUST have an inline comment explaining why.
- Significant architectural decisions MUST be recorded as decision records.
- A change is not complete until its documentation is updated in the same change.

Rationale: In a distributed system, documentation is the contract between teams and services.

### V. Observability & Auditability

Every service MUST be observable enough to debug failures and investigate security events.

- Services MUST emit structured logs with a correlation ID propagated across service calls.
- Security-relevant events (sign-in, permission changes, access denials, validation failures)
  MUST be written to an audit log.
- Logs MUST NOT contain secrets, credentials, or unmasked personal data.
- Each service MUST expose health checks and basic metrics.

Rationale: Without tracing and audit trails, incidents across many services cannot be diagnosed
or proven.

## Security Requirements

- Authentication and authorization MUST use a single, centrally defined mechanism shared by all
  services; services MUST NOT implement their own credential handling.
- All traffic MUST be encrypted in transit (TLS); sensitive data MUST be encrypted at rest.
- Passwords, if stored, MUST be hashed with a modern adaptive algorithm (e.g., Argon2 or bcrypt).
- Public endpoints MUST apply rate limiting.
- Dependencies MUST be pinned and scanned for known vulnerabilities in CI.
- Error responses MUST NOT expose stack traces, internal identifiers, or infrastructure details.

## Development Workflow & Quality Gates

- Every change MUST go through code review; reviewers MUST confirm compliance with this
  constitution, with explicit attention to Principles I and II.
- CI MUST pass before merge: build, tests (including input-validation tests), linting,
  documentation checks, and dependency vulnerability scanning.
- The plan for each feature MUST include a Constitution Check that lists any deviation and its
  justification; unjustified deviations block the plan.
- Contract changes between services MUST include contract tests for both provider and consumer.

## Governance

This constitution supersedes all other project practices. Where another guideline conflicts with
it, the constitution wins.

- **Amendments**: Proposed in writing, with rationale and a migration plan for existing code, and
  approved by the project maintainers before merge.
- **Versioning**: Semantic versioning. MAJOR for removing or redefining a principle; MINOR for a
  new principle or section, or materially expanded guidance; PATCH for clarifications and wording.
- **Compliance**: Every spec, plan, and pull request MUST be checked against this constitution.
  Complexity or deviation MUST be justified in the plan. Compliance is reviewed whenever the
  constitution is amended.

**Version**: 1.0.0 | **Ratified**: 2026-10-11 | **Last Amended**: 2026-10-11
