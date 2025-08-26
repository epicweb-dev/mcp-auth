import { EPIC_ME_AUTH_SERVER_URL } from './client.ts'

export async function handleOAuthAuthorizationServerRequest() {
	const metadataUrl = new URL(
		'/.well-known/oauth-authorization-server',
		EPIC_ME_AUTH_SERVER_URL,
	)

	const response = await fetch(metadataUrl.toString())
	const data = await response.json()

	return Response.json(data)
}
