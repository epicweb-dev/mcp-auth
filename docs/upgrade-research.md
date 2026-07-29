# MCP Auth Workshop Upgrade Research (Spec + SDK, Nov 2025 onward)

Date: 2026-02-27

## Goal

Build a planning-ready list of what changed in MCP (spec + TypeScript SDK) since October/November 2025, and what should be updated in the `mcp-auth` workshop with a **resource-server-first** focus.

## Planning assumptions for this update

1. We do **not** optimize for backwards compatibility with pre-`2025-11-25` behavior.
2. We teach the spec as it exists **now** (latest stable first, draft-aware where useful).
3. Legacy/fallback paths may be mentioned briefly, but they are not core learning objectives.

---

## What I reviewed

- MCP spec release `2025-11-25` and changelog:
  - https://modelcontextprotocol.io/specification/2025-11-25
  - https://modelcontextprotocol.io/specification/2025-11-25/changelog
- MCP auth extension docs:
  - https://modelcontextprotocol.io/extensions/auth/overview
  - https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials
  - https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization
- ext-auth draft specs for normative details:
  - https://github.com/modelcontextprotocol/ext-auth/tree/main/specification/draft
- TypeScript SDK releases from Oct 2025 onward via `gh`:
  - repo: `modelcontextprotocol/typescript-sdk`
  - reviewed releases from `1.19.0` (2025-10-02) through `v1.27.1` (2026-02-24)
- Current workshop materials (repo + Epic Agent indexed context), including:
  - `exercises/README.mdx`
  - discovery/auth/scope exercise readmes and solution code.

---

## Current workshop baseline (what it currently teaches)

`mcp-auth` today is anchored to MCP auth spec `2025-06-18` and teaches:

1. Discovery endpoints + CORS:
   - `/.well-known/oauth-protected-resource/mcp`
   - `/.well-known/oauth-authorization-server` proxy behavior (currently taught as practical compatibility behavior)
2. `WWW-Authenticate` handling for 401 and invalid tokens
3. Token introspection + active check
4. User context propagation into MCP agent
5. Scope validation + 403 insufficient scope + `scopes_supported`

Notable current assumptions that are now dated:

- References to 2025-06-18 throughout workshop docs.
- Discovery framing still leans heavily on dynamic client registration.
- Scope challenge guidance intentionally avoids `scope` auth-param in 403.
- Messaging implies implementing both metadata endpoints as default recommendation.

## Direction change for this refresh (explicitly no backwards compatibility focus)

- Remove or downgrade content that exists only to support older clients.
- Teach canonical 2025-11-25 behavior as the default and only required path.
- Keep legacy alternatives in short callouts/appendix, not core exercises.

---

## MCP spec changes since Nov 2025 that affect this workshop

This section is intentionally limited to changes that touch `mcp-auth` concerns.

## 1) Authorization server discovery now includes OpenID Connect discovery paths

- **Change type:** Added / Changed
- **What changed:** Clients must support OAuth AS metadata and OIDC discovery permutations, including path-insertion and path-appending strategies.
- **Why it matters here:** Discovery is a core exercise in this workshop; the existing discovery flow is now incomplete.
- **Workshop update needed:**
  - Teach multi-endpoint discovery expectations.
  - Update diagrams and prose so OAuth-only discovery is no longer presented as sufficient.

## 2) Protected resource metadata discovery is more flexible

- **Change type:** Changed
- **What changed:** `WWW-Authenticate` with `resource_metadata` is no longer the only path; clients must support fallback `.well-known` discovery when header info is absent.
- **Why it matters here:** Current lessons/tests strongly assume the header path.
- **Workshop update needed:**
  - Teach both mechanisms.
  - Treat both as normative discovery options per spec, not as compatibility hacks.
  - Add tests for fallback discovery behavior.

## 3) Step-up authorization and scope challenge behavior got explicit guidance

- **Change type:** Added / Changed
- **What changed:** New scope selection strategy and explicit runtime `insufficient_scope` handling with `403` + `WWW-Authenticate` guidance (including `scope` parameter).
- **Why it matters here:** Scope handling is a full exercise sequence in this workshop.
- **Workshop update needed:**
  - Teach 401 scope hints and runtime 403 step-up semantics.
  - Update the current “skip scope param” guidance to align with the newer recommendation.
  - Add client retry/limit guidance for step-up loops.

## 4) Client registration strategy changed materially

- **Change type:** Added / Changed / De-emphasized prior guidance
- **What changed:**
  - Client ID Metadata Documents are now recommended for many MCP cases.
  - Pre-registration is explicitly first-class.
  - Dynamic Client Registration is now a fallback (`MAY`), not the expected default path.
- **Why it matters here:** Current discovery flow and examples still center DCR.
- **Workshop update needed:**
  - Reframe DCR as optional fallback only (not core flow).
  - Add explicit coverage of pre-registration and client metadata docs at the “what resource-server owners need to understand” level.

## 5) Core spec now formalizes auth extensions as part of the auth landscape

- **Change type:** Added
- **What changed:** The authorization spec now points to additive MCP auth extensions.
- **Why it matters here:** This workshop is auth-focused and should no longer look “complete” without extension awareness.
- **Workshop update needed:**
  - Add extension-aware architecture section.
  - Keep implementation depth focused on resource-server behavior (your stated preference).

## 6) Security-related clarifications that affect auth hardening

- **Change type:** Changed / Clarified
- **What changed:** Streamable HTTP origin validation expectations and broader security best-practice updates.
- **Why it matters here:** Remote auth-enabled servers should include origin/threat guidance.
- **Workshop update needed:**
  - Add a short security hardening segment (resource server checks, token audience/resource binding, origin handling, least-privilege scopes).

## 7) What we should stop teaching in core `mcp-auth` (because we do not care about backwards compatibility)

- Stop treating resource server `/.well-known/oauth-authorization-server` proxying as a default requirement.
- Stop presenting Dynamic Client Registration as the normal path; keep it as optional fallback context.
- Stop teaching “skip the `scope` auth-param” as the primary insufficient-scope strategy.
- Stop carrying older protocol/date caveats in the core learning path unless directly needed for debugging legacy deployments.

---

## New official auth extensions: what belongs in this workshop

Given your goal (resource server focus, not auth server deep dive), here is the split.

## A) OAuth Client Credentials extension (`io.modelcontextprotocol/oauth-client-credentials`)

### Include in `mcp-auth` (recommended)

- Conceptual framing: machine-to-machine flow, no user interaction.
- Capability negotiation (`extensions` in initialize).
- Resource server responsibilities:
  - Validate bearer token as usual.
  - Enforce scopes for server operations.
  - Distinguish service tokens vs user tokens in authorization logic.
- Operational guidance:
  - Prefer short-lived/assertion-based approaches over long-lived secrets where possible.

### Keep mostly out of `mcp-auth` depth

- Detailed auth server implementation of client assertion validation and metadata surfacing.
- Full registration/admin workflows for machine clients.

## B) Enterprise-Managed Authorization (`io.modelcontextprotocol/enterprise-managed-authorization`)

### Include in `mcp-auth` (recommended, concise)

- Architecture: enterprise IdP policy-controlled access.
- Capability negotiation and what clients/servers signal.
- Resource server responsibilities:
  - Validate enterprise-issued tokens.
  - Map claims (groups/roles/dept) to MCP scopes/permissions.
  - Handle restricted scopes gracefully.

### Defer heavy details

- Full token exchange choreography (IdP token exchange + ID-JAG specifics) and enterprise IdP admin integration depth can be covered in:
  - `advanced-mcp-features` (protocol mechanics),
  - or a dedicated enterprise-focused module/workshop later.

---

## TypeScript SDK releases since Oct 2025: significant items to represent

Reviewed all releases from `1.19.0` to `v1.27.1`; filtered to changes that materially impact workshop material or learner expectations.

## Discovery + auth correctness

- `1.20.1`: auth metadata fetch robustness (`Accept` header behavior).
- `1.21.1`: path-based discovery URL handling improvements; `WWW-Authenticate scope` support.
- `1.21.2`: regression patch around metadata discovery fallback.
- `1.22.0`: additional auth discovery fallback fix.
- `v1.27.0`: `discoverOAuthServerInfo()` + discovery caching backport.
- `v1.27.1`: auth/pre-registration conformance scenario.

**Material implication:** discovery behavior in clients/sdk got stricter and smarter; workshop discovery narrative should match this modern behavior.

## Scope + step-up behavior

- `1.21.1`: explicit support for `scope` in `WWW-Authenticate`.
- `1.23.0`: scope management updates for SEP-835; upscoping support on `403 insufficient_scope`.

**Material implication:** the workshop should no longer recommend avoiding scope auth params as the default pattern.

## Client registration model changes

- `1.23.0`: URL-based client metadata registration (SEP-991).

**Material implication:** update discovery/registration lessons to reflect client metadata document path, with DCR treated as optional appendix material.

## Client credentials (M2M) extension support

- `1.24.0`: client credentials flow support (SEP-1046).
- `v1.26.0`: client credentials provider scope support fix.

**Material implication:** this is now real SDK surface, not just theoretical extension content.

## Protocol version + strictness/conformance

- `1.24.1`: protocol version update to `2025-11-25`.
- `1.25.0`: protocol date validation + stricter spec compliance types.

**Material implication:** stale protocol/date assumptions in examples can create learner confusion quickly.

## Transport stability notes (de-prioritized for this workshop)

- `1.23.1`, `1.24.3`: SSE priming behavior fixes.
- `1.24.1`: streamable HTTP retry fix.

**Material implication:** worth a note in troubleshooting docs; deeper transport mechanics fit better in advanced workshop content.

---

## Draft spec watch: what could impact us if draft becomes release next week

Source reviewed: current `draft` changelog and `2025-11-25` vs `draft` docs comparison.

## Draft item A) `extensions` capability field added to lifecycle capabilities

- Draft changelog indicates new `extensions` in `ClientCapabilities` and `ServerCapabilities`.
- Impact on this workshop:
  - Auth extensions are now better represented as first-class capability negotiation.
  - Our extension lessons should include concrete `capabilities.extensions` examples to avoid immediate staleness.

## Draft item B) OpenTelemetry trace context `_meta` conventions

- Draft adds reserved `_meta` keys: `traceparent`, `tracestate`, `baggage`.
- Impact on this workshop:
  - Low-to-medium for core auth exercises.
  - If we include middleware/proxy/request-forwarding examples, we should explicitly preserve/forward trace context metadata and avoid clobbering `_meta`.

## Draft item C) Auth-specific normative churn risk appears low right now

- Current draft `basic/authorization` is materially aligned with `2025-11-25` on auth mechanics (no major new auth flow changes found).
- Practical risk:
  - Low for auth flow semantics.
  - Medium for docs/examples around extension negotiation and lifecycle capability shapes.

## Draft-safe guidance for this update

1. Teach to latest stable (`2025-11-25`) now.
2. Add capability negotiation patterns that already match draft (`extensions`) so content survives a near-term draft promotion.
3. Avoid deep-linking draft-only anchors in learner materials where possible; prefer stable links or neutral wording.

---

## Gap matrix: current `mcp-auth` vs target

| Topic | Current state in workshop | Target state |
| --- | --- | --- |
| Spec baseline | Hardcoded to `2025-06-18` links | Move to `2025-11-25` references everywhere |
| Discovery sequence | OAuth metadata + DCR-centric | Add OIDC discovery permutations + modern registration priority; remove legacy-first framing |
| Protected metadata discovery | Header-centric framing | Teach header + well-known fallback as normative spec behavior |
| Registration approach | DCR framed as standard flow | Pre-reg / client-metadata-doc first; DCR optional appendix only |
| 401 challenge | Includes `resource_metadata` and invalid token error | Add/update scope challenge guidance and fallback behavior |
| 403 insufficient scope | Avoids `scope` param due combinations | Teach spec-aligned step-up strategy using `scope` guidance |
| Scope selection strategy | Implicit/custom | Explicit strategy from 2025-11-25 auth section |
| Extensions awareness | Not represented | Add ext-auth overview + resource-server responsibilities |
| Client credentials M2M | Not represented | Add at least one focused exercise/story |
| Enterprise-managed auth | Not represented | Add conceptual section + claim-to-scope mapping pattern |
| Backwards compatibility posture | Compatibility behavior appears in core path | Make no-back-compat policy explicit in core teaching sequence |
| Draft resilience | Not addressed | Add draft-safe `extensions` capability examples and trace-context note |

---

## BREAKING CHANGES (video re-record required)

Definition used here: **if exercise solution code changes, an exercise is removed, or a new exercise is added, it is a breaking change and requires re-recording**.  
Instruction/prose-only edits are not counted.

## BC-1) Remove legacy auth-server metadata proxy from core path

- **Type:** Removed/repurposed exercise + multi-step solution code changes
- **Current code pattern being removed:** `handleOAuthAuthorizationServerRequest()` and route handling for `/.well-known/oauth-authorization-server`
- **Impacted exercises/videos:**
  - `01.discovery/02.*` (currently centered on auth-server proxy behavior)
  - All downstream solution snapshots that still include that endpoint helper and route checks
- **Why this is breaking:** existing recordings demonstrate implementing and relying on this compatibility-oriented behavior.

## BC-2) 401 `WWW-Authenticate` challenge semantics update

- **Type:** Solution code change
- **Required code shift:** `handleUnauthorized` challenge output must align with current scope-challenge strategy (including actionable scope guidance where applicable).
- **First explicit touchpoint:** `02.init/02.solution.params/src/auth.ts`
- **Cascading impact:** the same auth helper pattern is copied through later solution snapshots (`03.auth-info`, `04.user`, `05.scopes`), so those solution files also change.
- **Why this is breaking:** header format and behavior shown in current videos/tests changes.

## BC-3) 403 `insufficient_scope` response format update

- **Type:** Solution code change
- **Required code shift:** update `handleInsufficientScope` to emit step-up friendly challenge semantics (including a `scope` auth-param strategy), rather than relying only on `error_description`.
- **Impacted exercises/videos:**
  - `05.scopes/02.solution.validate-sufficient-scope`
  - `05.scopes/03.solution.scope-hints` (inherits prior auth helper behavior)
- **Why this is breaking:** current step narrative and solution intentionally teach the opposite.

## BC-4) Discovery/registration exercise flow rework (code path, not just docs)

- **Type:** Exercise step behavior + solution/test changes
- **Required change:** move core flow away from DCR-first assumptions and toward current registration priority; this affects exercise code expectations and associated tests.
- **Impacted area:** `01.discovery` step flow and tests (not just readme prose).
- **Why this is breaking:** recorded guided flow outputs and exercise completion criteria change.

## BC-5) Add new extension implementation exercises

- **Type:** Added exercises (new code + new tests + new solution snapshots)
- **Additions:**
  1. OAuth Client Credentials extension (resource-server handling)
  2. Enterprise-Managed Authorization (claims-to-permissions mapping)
- **Why this is breaking:** these are net-new hands-on segments that require new recorded videos.

## BC-6) (Draft-sensitive) Extension capability negotiation examples in code

- **Type:** New/changed code in extension-focused steps
- **Draft trigger:** draft adds `capabilities.extensions` as first-class negotiation shape in lifecycle capabilities.
- **Practical impact:** extension exercises should show this capability shape so content does not go stale immediately if draft ships.
- **Why this is breaking:** implementation snippets and expected outputs for extension steps change.

## Not counted as breaking by this definition

- Updating spec links (`2025-06-18` -> `2025-11-25`) without changing solution code.
- Narration/prose clarifications that do not alter exercise behavior.

---

## What should stay in this workshop vs move to other workshops

## Keep in `mcp-auth` (must-have)

- Updated discovery and registration strategy.
- Scope challenge + step-up flow behavior.
- Resource-server-side token validation patterns for:
  - user-delegated tokens,
  - client-credentials tokens,
  - enterprise-managed tokens (at practical level).
- Security hardening for auth boundaries.

## Better in `advanced-mcp-features`

- Tasks utility depth, durable request patterns.
- Sampling-with-tools deep mechanics.
- Stream transport edge-cases (SSE polling/resumption internals).

## Better in `mcp-fundamentals`

- General protocol metadata shifts unrelated to auth depth:
  - tool naming,
  - icon metadata/theme details,
  - baseline schema dialect awareness.

## Better in `mcp-ui`

- UX for authorization escalation (step-up prompts, preserving user context in UI flows).
- Enterprise SSO UX details from client UI perspective.

---

## Recommended update plan for re-recording

## Phase 1: “Promise fulfillment” update (highest priority)

1. Update all references/content from `2025-06-18` to `2025-11-25`.
2. Redo discovery lessons:
   - protected resource discovery mechanisms,
   - OAuth + OIDC metadata discovery order,
   - registration strategy priority (pre-reg/client-metadata-doc first; DCR as optional appendix).
3. Redo scope lessons to align with modern challenge/step-up behavior.
4. Add one concise extension module introducing both official auth extensions from resource-server perspective.
5. Remove legacy-first compatibility narrative from the main lesson path (including resource-server-as-auth-server proxy framing).

## Phase 2: Resource-server extension implementation additions

1. Add a focused client-credentials scenario (service identity + scopes).
2. Add an enterprise-managed scenario:
   - claim mapping,
   - policy-driven permission checks,
   - authorization error ergonomics.

## Phase 3: Cross-workshop coordination

1. Move non-auth-heavy protocol deltas to fundamentals/advanced/ui updates.
2. Keep `mcp-auth` sharply focused on resource server auth and authorization behavior.

---

## Recommended actions to take (clear and prioritized)

## Do now (required for this refresh)

1. Replace all workshop spec links with `2025-11-25` references.
2. Rewrite discovery modules to:
   - include OIDC discovery permutations,
   - present pre-registration/client-metadata-doc as primary registration strategy,
   - move DCR to optional fallback context.
3. Remove resource-server auth-server-proxy behavior from core exercises (keep as optional note only if desired).
4. Update scope/403 guidance to a step-up pattern aligned with current spec (`insufficient_scope` + actionable `scope` guidance).
5. Add a concise module introducing both official auth extensions from the resource-server perspective.

## Do next (strongly recommended for near-term durability)

1. Add `capabilities.extensions` examples in extension-related lessons so content remains current if draft is promoted soon.
2. Add an observability note on preserving OpenTelemetry trace context in `_meta` for middleware/proxy patterns.
3. Add one concrete client-credentials exercise (M2M token handling + scope enforcement).
4. Add one concise enterprise-managed exercise (claims-to-permissions mapping).

## Keep optional / appendix only

1. Dynamic Client Registration implementation details.
2. Legacy compatibility workarounds for older MCP clients.
3. Deep transport compatibility edge-cases (SSE priming, older protocol behavior).

---

## Bottom line

The workshop is still strong conceptually, but its **normative auth guidance is now one spec revision behind** and misses the new official extension model.  
For the update you promised, the most important changes are:

1. modern discovery + registration strategy,
2. modern scope challenge/step-up behavior,
3. explicit resource-server support patterns for client credentials and enterprise-managed authorization.

