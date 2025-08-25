import { invariantResponse } from '@epic-web/invariant'
import { type Token } from '#types/helpers'
import { type Route } from './+types/introspect'

export async function introspectLoader({ request, context }: Route.LoaderArgs) {
	const token = (await request.formData()).get('token')?.toString()
	console.log({ token })
	invariantResponse(token, 'invalid_request')

	const info = await resolveTokenInfo(token, context.cloudflare.env).catch(
		() => undefined,
	)

	if (!info) return { active: false }

	return {
		active: true,
		client_id: info.grant.clientId,
		scope: info.grant.scope.join(' '),
		sub: info.userId,
		exp: Math.floor(info.expiresAt / 1000), // if you store ms
		// aud, iss, token_type, iat ... add as useful
	}
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
