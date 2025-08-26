import { EPIC_ME_AUTH_SERVER_URL } from './client.ts'

export async function handleOAuthAuthorizationServerRequest() {
	const authUrl = new URL(
		'/.well-known/oauth-authorization-server',
		EPIC_ME_AUTH_SERVER_URL,
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
				issuer: EPIC_ME_AUTH_SERVER_URL,
				authorization_endpoint: `${EPIC_ME_AUTH_SERVER_URL}/authorize`,
				token_endpoint: `${EPIC_ME_AUTH_SERVER_URL}/token`,
				introspection_endpoint: `${EPIC_ME_AUTH_SERVER_URL}/introspect`,
			},
		],
	})
}
