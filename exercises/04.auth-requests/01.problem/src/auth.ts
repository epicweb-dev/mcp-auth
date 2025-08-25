import { z } from 'zod'
import { EPIC_ME_SERVER_URL } from './client.ts'

export type AuthInfo = Exclude<
	Awaited<ReturnType<typeof getAuthInfo>>,
	undefined
>

export async function getAuthInfo(request: Request) {
	const authHeader = request.headers.get('authorization')
	if (!authHeader?.startsWith('Bearer ')) return undefined

	const token = authHeader.slice('Bearer '.length)

	const validateUrl = new URL('/introspect', EPIC_ME_SERVER_URL).toString()
	const resp = await fetch(validateUrl, {
		headers: { authorization: authHeader },
	})
	if (!resp.ok) return undefined

	const data = z
		.object({
			userId: z.string(),
			clientId: z.string().default(''),
			scopes: z.array(z.string()).default([]),
			expiresAt: z.number().optional(),
		})
		.parse(await resp.json())

	const { userId, clientId, scopes, expiresAt } = data

	return {
		token,
		clientId,
		scopes,
		expiresAt,
		extra: { userId },
	}
}

export function initiateOAuthFlow(request: Request) {
	const url = new URL(request.url)
	const currentUrl = url.toString()

	// Create the OAuth authorization URL
	const authUrl = new URL('/authorize', EPIC_ME_SERVER_URL)

	// Add the current URL as the redirect target
	authUrl.searchParams.set('redirect_uri', currentUrl)

	// Add OAuth request info as a parameter
	const oauthReqInfo = {
		client_id: 'epicme-mcp',
		redirect_uri: currentUrl,
		response_type: 'code',
		scope: ['read', 'write'],
		state: crypto.randomUUID(),
	}
	authUrl.searchParams.set('oauth_req_info', JSON.stringify(oauthReqInfo))

	return new Response('Unauthorized', {
		status: 401,
		headers: {
			'WWW-Authenticate': 'OAuth realm="EpicMe"',
			Location: authUrl.toString(),
		},
	})
}

export async function handleOAuthAuthorizationServerRequest() {
	const authUrl = new URL(
		'/.well-known/oauth-authorization-server',
		EPIC_ME_SERVER_URL,
	)
	return Response.redirect(authUrl.toString(), 302)
}

export async function handleOAuthProtectedResourceRequest(request: Request) {
	// This server is the protected resource server, so we return our own configuration
	const resourceServerUrl = new URL(request.url)
	resourceServerUrl.pathname = '/mcp' // Point to the MCP endpoint

	return Response.json({
		resource: resourceServerUrl.toString(),
		scopes: ['read', 'write'],
		resource_owner: 'epicme',
		resource_server: {
			name: 'EpicMe MCP Server',
			version: '1.0.0',
		},
		authorization_servers: [
			{
				issuer: EPIC_ME_SERVER_URL,
				authorization_endpoint: `${EPIC_ME_SERVER_URL}/authorize`,
				token_endpoint: `${EPIC_ME_SERVER_URL}/token`,
				introspection_endpoint: `${EPIC_ME_SERVER_URL}/introspect`,
			},
		],
	})
}
