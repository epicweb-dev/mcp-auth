import { type AuthInfo as SDKAuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { z } from 'zod'
import { EPIC_ME_AUTH_SERVER_URL } from './client.ts'

export type AuthInfo = SDKAuthInfo & { extra: { userId: string } }

const introspectResponseSchema = z.object({
	client_id: z.string(),
	scope: z.string(),
	sub: z.string(),
})

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

	const { sub, client_id, scope } = data

	return {
		token,
		clientId: client_id,
		scopes: scope.split(' '),
		extra: { userId: sub },
	}
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
				hasAuthHeader
					? `error_description="The access token is invalid or expired"`
					: null,
				`resource_metadata=${url.toString()}`,
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
	const resourceServerUrl = new URL(request.url)
	resourceServerUrl.pathname = '/mcp'

	return Response.json({
		resource: resourceServerUrl.toString(),
		authorization_servers: [EPIC_ME_AUTH_SERVER_URL],
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
