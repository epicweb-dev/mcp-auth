import { type Token } from '#types/helpers'
import { type Route } from './+types/introspect'

export async function loader({ request, context }: Route.LoaderArgs) {
	const tokenInfo = await getTokenInfo(request, context.cloudflare.env)
	if (!tokenInfo) return new Response('Unauthorized', { status: 401 })

	return Response.json({
		userId: tokenInfo.userId,
		clientId: tokenInfo.grant.clientId,
		scopes: tokenInfo.grant.scope,
		expiresAt: tokenInfo.expiresAt,
	})
}

async function getTokenInfo(
	request: Request,
	env: Env,
): Promise<Token | undefined> {
	const token = request.headers.get('authorization')?.slice('Bearer '.length)
	if (!token) return undefined
	return resolveTokenInfo(token, env)
}

async function resolveTokenInfo(
	token: string,
	env: Env,
): Promise<Token | undefined> {
	const parts = token.split(':')
	if (parts.length !== 3) throw new Error('Invalid token format')

	const [userId, grantId] = parts
	const tokenId = await generateTokenId(token)
	const tokenKey = `token:${userId}:${grantId}:${tokenId}`

	const tokenData = await env.OAUTH_KV.get(tokenKey, { type: 'json' })
	if (!tokenData) throw new Error('Token not found')

	return tokenData as Token
}

// copied from @cloudflare/workers-oauth-provider
async function generateTokenId(token: string) {
	const encoder = new TextEncoder()
	const data = encoder.encode(token)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
	return hashHex
}
