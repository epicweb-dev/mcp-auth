import { EPIC_ME_AUTH_SERVER_URL } from './client.ts'

export async function handleOAuthProtectedResourceRequest(request: Request) {
	// This server is the protected resource server, so we return our own configuration
	const resourceServerUrl = new URL(request.url)
	resourceServerUrl.pathname = '/mcp' // Point to the MCP endpoint

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
