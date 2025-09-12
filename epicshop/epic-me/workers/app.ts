import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { createRequestHandler } from 'react-router'
import { type Env } from '#types/helpers'
import { DB } from './db/index.ts'
import { withCors } from './utils.ts'

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
)

const defaultHandler = {
	async fetch(request, env, ctx) {
		return requestHandler(request, {
			db: await DB.getInstance(env),
			cloudflare: { env, ctx },
		})
	},
} satisfies ExportedHandler<Env>

const oauthProvider = new OAuthProvider({
	apiRoute: ['/whoami', '/db-api'],
	// @ts-expect-error these types are wrong...
	apiHandler: defaultHandler,
	// @ts-expect-error these types are wrong...
	defaultHandler,
	authorizeEndpoint: '/authorize',
	tokenEndpoint: '/token',
	clientRegistrationEndpoint: '/register',
	scopesSupported: [
		'user:read',
		'entries:read',
		'entries:write',
		'tags:read',
		'tags:write',
	],
})

export default {
	fetch: withCors({
		getCorsHeaders: (request) => {
			if (request.url.includes('/.well-known')) {
				return {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
					'Access-Control-Allow-Headers': 'mcp-protocol-version',
				}
			}
		},
		handler: (request, env, ctx) => {
			return oauthProvider.fetch(request, env, ctx)
		},
	}),
} satisfies ExportedHandler<Env>
