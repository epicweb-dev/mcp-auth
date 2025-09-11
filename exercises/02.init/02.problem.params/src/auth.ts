import { EPIC_ME_AUTH_SERVER_URL } from './client.ts'

// 🐨 accept a request parameter here
export function handleUnauthorized() {
	// 🐨 use the request.url to construct a URL pointing to `/.well-known/oauth-protected-resource/mcp` on this server

	return new Response('Unauthorized', {
		status: 401,
		headers: {
			// 🐨 the value should be comma-separated string of auth params:
			//   - Bearer realm="EpicMe"
			//   - resource_metadata=<the URL you constructed above>
			'WWW-Authenticate': `Bearer realm="EpicMe"`,
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
