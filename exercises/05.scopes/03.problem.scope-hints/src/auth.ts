import { type AuthInfo as SDKAuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { z } from 'zod'
import { EPIC_ME_AUTH_SERVER_URL } from './client.ts'

export type AuthInfo = SDKAuthInfo & { extra: { userId: string } }

const introspectResponseSchema = z.discriminatedUnion('active', [
	z.object({
		active: z.literal(true),
		client_id: z.string(),
		scope: z.string(),
		sub: z.string(),
	}),
	z.object({
		active: z.literal(false),
	}),
])

export async function resolveAuthInfo(
	authHeader: string | null,
): Promise<AuthInfo | null> {
	const token = authHeader?.replace(/^Bearer\s+/i, '')
	if (!token) return null

	const validateUrl = new URL(
		'/oauth/introspection',
		EPIC_ME_AUTH_SERVER_URL,
	).toString()
	const resp = await fetch(validateUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ token }),
	})
	if (!resp.ok) return null

	const rawData = await resp.json()

	const data = introspectResponseSchema.parse(rawData)

	if (!data.active) return null

	const { sub, client_id, scope } = data

	return {
		token,
		clientId: client_id,
		scopes: scope.split(' '),
		extra: { userId: sub },
	}
}

const supportedScopes = [
	'user:read',
	'entries:read',
	'entries:write',
	'tags:read',
	'tags:write',
] as const
export type SupportedScopes = (typeof supportedScopes)[number]

export function validateScopes(
	authInfo: AuthInfo,
	scopes: Array<SupportedScopes>,
) {
	return scopes.every((scope) => authInfo.scopes.includes(scope))
}

const minimalValidScopeCombinations: Array<Array<SupportedScopes>> = [
	['user:read'],
	['entries:read'],
	['entries:write'],
	['tags:read'],
	['tags:write'],
]

export function hasSufficientScope(authInfo: AuthInfo) {
	return minimalValidScopeCombinations.some((scopes) =>
		scopes.every((scope) => authInfo.scopes.includes(scope)),
	)
}

export function handleInsufficientScope() {
	return new Response('Forbidden', {
		status: 403,
		headers: {
			'WWW-Authenticate': [
				`Bearer realm="EpicMe"`,
				`error="insufficient_scope"`,
				`error_description="Any of the following combinations of scopes is valid: ${minimalValidScopeCombinations.map((scopes) => scopes.join(' ')).join(', ')}"`,
				// normally you'd use the scopes auth param here as well to list the
				// required scopes for this resource. However, providing any one of
				// the required scopes will be enough for the client to use the resource
				// in some capacity and according to the spec, we should not specify
				// more than is necessary, so we put instructions in the
				// error_description instead.
			].join(', '),
		},
	})
}

export function handleUnauthorized(request: Request) {
	const hasAuthHeader = request.headers.has('authorization')

	const url = new URL('/.well-known/oauth-protected-resource/mcp', request.url)
	return new Response('Unauthorized', {
		status: 401,
		headers: {
			'WWW-Authenticate': [
				`Bearer realm="EpicMe"`,
				hasAuthHeader ? `error="invalid_token"` : null,
				hasAuthHeader
					? `error_description="The access token is invalid or expired"`
					: null,
				`resource_metadata=${url.toString()}`,
				// 🐨 add a scope hint for the supported scopes (join the supported scopes with a space)
			]
				.filter(Boolean)
				.join(', '),
		},
	})
}

/**
 * This retrieves the protected resource configuration from the EpicMe server.
 * This is how the client knows where to request authorization from.
 */
export async function handleOAuthProtectedResourceRequest(request: Request) {
	const resourceServerUrl = new URL('/mcp', request.url)

	return Response.json({
		resource: resourceServerUrl.toString(),
		authorization_servers: [EPIC_ME_AUTH_SERVER_URL],
		// 🐨 add scopes_supported set to the supported scopes array
	})
}

/**
 * Handles requests for OAuth authorization server metadata.
 * Fetches the metadata from the auth server and forwards it to the client.
 * This should only be used for backwards compatibility. Newer clients should
 * use `/.well-known/oauth-protected-resource/mcp` to discover the authorization
 * server and make this request directly to the authorization server instead.
 */
export async function handleOAuthAuthorizationServerRequest() {
	const metadataUrl = new URL(
		'/.well-known/oauth-authorization-server',
		EPIC_ME_AUTH_SERVER_URL,
	)

	const response = await fetch(metadataUrl.toString())
	const data = await response.json()

	return Response.json(data)
}
