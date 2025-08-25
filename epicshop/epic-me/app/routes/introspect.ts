import { invariantResponse } from '@epic-web/invariant'
import { type Token } from '#types/helpers'
import { type Route } from './+types/introspect'

export async function action({ request, context }: Route.LoaderArgs) {
	const token = (await request.formData()).get('token')?.toString()
	invariantResponse(token, 'invalid_request')

	const parts = token.split(':')
	if (parts.length !== 3) return { active: false }

	const [userId, grantId] = parts
	const tokenId = await generateTokenId(token)
	const tokenKey = `token:${userId}:${grantId}:${tokenId}`

	const tokenData = await context.cloudflare.env.OAUTH_KV.get(tokenKey, {
		type: 'json',
	})

	if (!tokenData) return { active: false }

	const info = tokenData as Token

	if (info.expiresAt < Date.now()) return { active: false }

	return {
		active: true,
		client_id: info.grant.clientId,
		scope: info.grant.scope.join(' '),
		sub: info.userId,
		exp: Math.floor(info.expiresAt / 1000),
		iat: Math.floor(info.createdAt / 1000),
	}
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
