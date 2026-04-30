# MCP Spec Update TODO

These notes assume the videos were recorded against the 2025-06-18 MCP spec and
should be refreshed for the 2025-11-25 release plus likely June 2026 changes.

Sources to re-check before recording:

- 2025-11-25 changelog:
  https://modelcontextprotocol.io/specification/2025-11-25/changelog
- Authorization spec:
  https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- SEP-991 OAuth Client ID Metadata Documents:
  https://modelcontextprotocol.io/seps/991-enable-url-based-client-registration-using-oauth-c
- SEP-985 RFC 9728 protected resource metadata alignment:
  https://modelcontextprotocol.io/seps/985-align-oauth-20-protected-resource-metadata-with-rf
- SEP-1036 URL mode elicitation:
  https://modelcontextprotocol.io/seps/1036-url-mode-elicitation-for-secure-out-of-band-intera
- SEP-2207 OIDC refresh token guidance:
  https://modelcontextprotocol.io/seps/2207-oidc-refresh-token-guidance

## Recommended Strategy

This workshop needs a real auth refresh, but the scope can stay manageable.
Keep the "MCP server as OAuth protected resource" framing. The biggest change is
that Dynamic Client Registration should no longer be the default story. The new
default should be OAuth Client ID Metadata Documents, with DCR as a fallback.

Do not add general MCP Tasks, sampling, or MCP Apps here except where auth
interacts with URL mode elicitation or tool/app authorization boundaries.

## Global Updates

- [ ] Update all spec links from `2025-06-18` to the current released spec once
  the June 2026 release lands. Until then, use `2025-11-25` for stable auth
  docs and link draft/SEP pages only for pending June work.
- [ ] Update terminology to consistently describe the MCP server as the OAuth
  Protected Resource / Resource Server.
- [ ] Re-check every `WWW-Authenticate` example against the current spec:
  include `resource_metadata` where helpful, use correct quoted auth params,
  and distinguish 401 invalid/missing token from 403 insufficient scope.
- [ ] Ensure invalid Origin handling for Streamable HTTP returns HTTP 403
  Forbidden, not a generic 400/401.
- [ ] Add a short warning against token passthrough. MCP clients should not pass
  third-party tokens through to MCP servers; use URL mode elicitation or a proper
  server-side OAuth integration for third-party services.

## Exercise 01: Metadata Discovery

- [ ] Update the discovery flow to include OpenID Connect Discovery 1.0 support
  when the authorization server is OIDC-compatible.
- [ ] Update Protected Resource Metadata language to align with RFC 9728.
- [ ] Make `WWW-Authenticate` with `resource_metadata` optional where the spec
  now allows `.well-known` fallback, but keep it in examples because it improves
  client UX.
- [ ] Replace the "DCR-first" sequence diagram with this preferred order:
  1. discover protected resource metadata
  2. discover authorization server metadata
  3. use OAuth Client ID Metadata Documents if supported
  4. fall back to Dynamic Client Registration only if needed
  5. fall back to pre-registration for closed ecosystems
- [ ] Add `client_id_metadata_document_supported: true` to authorization server
  metadata examples if this workshop owns the mock auth server.
- [ ] Add a client metadata document example with:
  - HTTPS `client_id`
  - `client_name`
  - `redirect_uris`
  - `grant_types`
  - `response_types`
  - `token_endpoint_auth_method: "none"` for public clients
- [ ] Add SSRF and cache guidance for auth servers that fetch client metadata:
  validate URLs, avoid private IP ranges, limit response size, timeout fetches,
  and respect cache headers with a conservative maximum.

## Exercise 02: Initialize OAuth Flow

- [ ] Update auth challenge examples to include the resource metadata URL in
  `WWW-Authenticate` where useful.
- [ ] Update prose so clients are not expected to always perform DCR. Client ID
  Metadata Documents should be presented as the recommended open-ecosystem path.
- [ ] If the code currently implements DCR, decide whether to:
  - replace it with Client ID Metadata Documents, or
  - keep DCR as an optional fallback exercise.
  The lower-work option is to leave DCR code in place but rewrite the README to
  call it a fallback.
- [ ] Add a note that public clients should not require a client secret unless
  they use a confidential client pattern.
- [ ] If June stateless MCP changes land, verify whether initialization and auth
  examples need per-request capability/version metadata updates.

## Exercise 03: Auth Info

- [ ] Keep token introspection. It remains a useful resource-server pattern.
- [ ] Add OIDC discovery guidance for authorization servers that expose
  `/.well-known/openid-configuration`.
- [ ] Add OIDC refresh-token guidance:
  - MCP resource servers should not advertise `offline_access` as a required
    resource scope.
  - Do not include `offline_access` in `WWW-Authenticate` `scope`.
  - Do not include `offline_access` in protected resource
    `scopes_supported`.
  - Clients that can securely store refresh tokens may request
    `offline_access` from the authorization server if AS metadata supports it.
- [ ] Keep invalid-token responses generic. Do not leak whether a token is
  expired, revoked, unknown, or malformed unless the auth server policy permits
  that detail.

## Exercise 04: User Context

- [ ] Keep the user-context exercise. It is not materially changed by the spec.
- [ ] Add a note that user identity must be derived from validated token claims
  or introspection results, not from elicitation responses or user-supplied
  request fields.
- [ ] If URL mode elicitation is used later for third-party authorization, bind
  the out-of-band flow to the authenticated user/session and verify the same
  user completes it.

## Exercise 05: Scopes

- [ ] Update incremental scope consent material to use `WWW-Authenticate`
  challenges for insufficient scope. Make clear that servers can ask for the
  missing resource-specific scopes without forcing a full restart of auth.
- [ ] Verify every 403 insufficient-scope example includes useful but safe scope
  hints.
- [ ] Keep scope names resource-specific. Do not mix in `offline_access`.
- [ ] Add a small note about enterprise IdP policy controls/cross-app access as
  an ecosystem concern, not an implementation requirement for this workshop.

## New Optional Exercise: Third-Party Account Connection

- [ ] Consider adding a short optional exercise after scopes that uses URL mode
  elicitation to connect a third-party service to the MCP server. This would
  teach the distinction between:
  - MCP client authorizing to the MCP server, and
  - MCP server authorizing to a third-party API on behalf of the user.
- [ ] Only add this exercise if it can stay small. If it requires a lot of UI or
  auth server plumbing, make it a README-only conceptual section instead.

## Things To Remove Or Downplay

- [ ] Downplay Dynamic Client Registration as the primary happy path.
- [ ] Remove any implication that clients should handle third-party credentials
  or API keys in form elicitation.
- [ ] Remove any examples that put refresh-token concerns in protected resource
  scope metadata.
