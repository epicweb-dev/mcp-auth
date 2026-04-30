import { EPIC_ME_AUTH_SERVER_URL } from './client.ts'

// 💯 as a bonus, create a type for the AuthInfo that extends the AuthInfo type from the SDK
// and adds userId: string to the extra object

// 💯 as a bonus, create a zod schema for the introspect response
// - client_id: string (the client id) - client in this context refers to the app the user's using
// - scope: string (space-separated list of scopes)
// - sub: string (the user id)

// 🐨 export an async function called resolveAuthInfo that accepts the request
//   🐨 if the request has an Authorization header, get the token from it
//      if it doesn't, return null
//   🐨 construct a URL pointing to `/oauth/introspection` on the auth server
//   🐨 make a POST request to the auth server with the token in the body
//   💰 just gonna give this to you since it's not critical to your understanding of the topic to write yourself...
//   💰 const resp = await fetch(validateUrl, {
//      method: 'POST',
//      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//      body: new URLSearchParams({ token }),
//    })
//   🐨 if the response is not ok, return null
//   🐨 get json object from the response
//     💰 the properties you need are client_id, scope, and sub
//   🐨 return the AuthInfo (💰 the sub is the userId)

export function handleUnauthorized(request: Request) {
	const url = new URL('/.well-known/oauth-protected-resource/mcp', request.url)

	return new Response('Unauthorized', {
		status: 401,
		headers: {
			'WWW-Authenticate': `Bearer realm="EpicMe", resource_metadata="${url.toString()}"`,
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
