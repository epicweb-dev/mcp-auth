# MCP Auth Workshop Upgrade Research (Spec + SDK, Nov 2025 onward)

Date: 2026-02-27

## Goal

Build a planning-ready list of what changed in MCP (spec + TypeScript SDK) since October/November 2025, and what should be updated in the `mcp-auth` workshop with a **resource-server-first** focus.

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
   - `/.well-known/oauth-authorization-server` proxy behavior
2. `WWW-Authenticate` handling for 401 and invalid tokens
3. Token introspection + active check
4. User context propagation into MCP agent
5. Scope validation + 403 insufficient scope + `scopes_supported`

Notable current assumptions that are now dated:

- References to 2025-06-18 throughout workshop docs.
- Discovery framing still leans heavily on dynamic client registration.
- Scope challenge guidance intentionally avoids `scope` auth-param in 403.
- Messaging implies implementing both metadata endpoints as default recommendation.

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
  - Keep header guidance as recommended for compatibility, but not as strict single-path requirement.
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
  - Reframe DCR as compatibility fallback.
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

**Material implication:** update discovery/registration lessons to reflect client metadata document path, with DCR as fallback.

## Client credentials (M2M) extension support

- `1.24.0`: client credentials flow support (SEP-1046).
- `v1.26.0`: client credentials provider scope support fix.

**Material implication:** this is now real SDK surface, not just theoretical extension content.

## Protocol version + strictness/conformance

- `1.24.1`: protocol version update to `2025-11-25`.
- `1.25.0`: protocol date validation + stricter spec compliance types.

**Material implication:** stale protocol/date assumptions in examples can create learner confusion quickly.

## Transport/back-compat (lower priority for this workshop)

- `1.23.1`, `1.24.3`: SSE priming/backward compatibility fixes.
- `1.24.1`: streamable HTTP retry fix.

**Material implication:** worth a note in troubleshooting docs; deeper transport mechanics fit better in advanced workshop content.

---

## Gap matrix: current `mcp-auth` vs target

| Topic | Current state in workshop | Target state |
| --- | --- | --- |
| Spec baseline | Hardcoded to `2025-06-18` links | Move to `2025-11-25` references everywhere |
| Discovery sequence | OAuth metadata + DCR-centric | Add OIDC discovery permutations + modern registration priority |
| Protected metadata discovery | Header-centric framing | Teach header + well-known fallback equivalently |
| Registration approach | DCR framed as standard flow | Pre-reg / client-metadata-doc first, DCR fallback |
| 401 challenge | Includes `resource_metadata` and invalid token error | Add/update scope challenge guidance and fallback behavior |
| 403 insufficient scope | Avoids `scope` param due combinations | Teach spec-aligned step-up strategy with practical scope sets |
| Scope selection strategy | Implicit/custom | Explicit strategy from 2025-11-25 auth section |
| Extensions awareness | Not represented | Add ext-auth overview + resource-server responsibilities |
| Client credentials M2M | Not represented | Add at least one focused exercise/story |
| Enterprise-managed auth | Not represented | Add conceptual section + claim-to-scope mapping pattern |

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
   - registration strategy priority (pre-reg/client-metadata-doc/DCR fallback).
3. Redo scope lessons to align with modern challenge/step-up behavior.
4. Add one concise extension module introducing both official auth extensions from resource-server perspective.

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

## Concrete TODO list for this repo’s update cycle

1. Replace all stale spec links (`2025-06-18`) in workshop readmes.
2. Update discovery diagrams and narration to include:
   - OIDC discovery attempts,
   - revised registration priority,
   - fallback discovery behavior.
3. Update `handleUnauthorized`/scope challenge narratives and associated tests.
4. Add at least one new exercise for OAuth Client Credentials extension support in the resource server.
5. Add one “enterprise mode” exercise segment focused on token validation + claims mapping.
6. Refresh troubleshooting sections to reflect SDK transport/discovery improvements since 1.24+.

---

## Bottom line

The workshop is still strong conceptually, but its **normative auth guidance is now one spec revision behind** and misses the new official extension model.  
For the update you promised, the most important changes are:

1. modern discovery + registration strategy,
2. modern scope challenge/step-up behavior,
3. explicit resource-server support patterns for client credentials and enterprise-managed authorization.

