import { z } from 'zod'
import { EPIC_ME_AUTH_SERVER_URL } from './client.ts'

export type AuthInfo = NonNullable<Awaited<ReturnType<typeof getAuthInfo>>>

export async function getAuthInfo(request: Request) {
	const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
	if (!token) return undefined

	const validateUrl = new URL('/introspect', EPIC_ME_AUTH_SERVER_URL).toString()
	const resp = await fetch(validateUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ token }),
	})
	if (!resp.ok) return undefined

	const rawData = await resp.json()

	const data = z
		.object({
			active: z.boolean(),
			client_id: z.string(),
			scope: z.string(),
			sub: z.string(),
			exp: z.number(),
		})
		.parse(rawData)

	const { sub, client_id, scope, exp } = data

	return {
		token,
		clientId: client_id,
		scopes: scope.split(' '),
		expiresAtMs: exp * 1000,
		extra: { userId: sub },
	}
}

const requiredScopes = ['read', 'write']

export function validateScopes(authInfo: AuthInfo) {
	return requiredScopes.every((scope) => authInfo.scopes.includes(scope))
}

export function handleUnauthorized(request: Request) {
	const hasAuthHeader = request.headers.has('authorization')

	const url = new URL(request.url)
	url.pathname = '/.well-known/oauth-protected-resource/mcp'
	return new Response('Unauthorized', {
		status: 401,
		headers: {
			'WWW-Authenticate': [
				`Bearer realm="EpicMe"`,
				hasAuthHeader ? `error="invalid_token"` : null,
				`resource_metadata=${url.toString()}`,
				`scope=${requiredScopes.join(' ')}`,
			]
				.filter(Boolean)
				.join(', '),
		},
	})
}

export function handleInsufficientScope(request: Request) {
	const url = new URL(request.url)
	url.pathname = '/.well-known/oauth-protected-resource/mcp'
	return new Response('Forbidden', {
		status: 403,
		headers: {
			'WWW-Authenticate': [
				`Bearer realm="EpicMe"`,
				`error="insufficient_scope"`,
				`scope=${requiredScopes.join(' ')}`,
				`resource_metadata=${url.toString()}`,
			].join(', '),
		},
	})
}

/**
 * This retrieves the protected resource configuration from the EpicMe server.
 * This is how the client knows where to request authorization from.
 */
export async function handleOAuthProtectedResourceRequest(request: Request) {
	// This server is the protected resource server, so we return our own configuration
	const resourceServerUrl = new URL(request.url)
	resourceServerUrl.pathname = '/mcp' // Point to the MCP endpoint

	return Response.json({
		resource: resourceServerUrl.toString(),
		authorization_servers: [EPIC_ME_AUTH_SERVER_URL],
		scopes_supported: ['read', 'write'],
	})
}
