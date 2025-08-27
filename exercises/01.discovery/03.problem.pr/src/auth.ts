import { EPIC_ME_AUTH_SERVER_URL } from './client.ts'

// 🐨 export an async function called handleOAuthProtectedResourceRequest
// 🐨 it should construct a URL pointing to `/mcp` on the current server
// 💰 you can accept a request parameter and use request.url to get the URL of the current server
// 🐨 then return a JSON response (💰 Response.json) with the following properties:
//   🐨 resource: the URL you constructed above
//   🐨 authorization_servers: an array with a single string value of the auth server URL

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
