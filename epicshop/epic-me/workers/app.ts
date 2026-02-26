import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { createRequestHandler } from 'react-router'
import { type Env, type EpicExecutionContext } from '#types/helpers'
import { DB } from './db/index.ts'
import { withCors } from './utils.ts'

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
)

const defaultHandler = {
	async fetch(request: Request, env: Env, ctx: EpicExecutionContext) {
		return requestHandler(request, {
			db: await DB.getInstance(env),
			cloudflare: { env, ctx },
		})
	},
}

const oauthProvider = new OAuthProvider({
	apiRoute: ['/whoami', '/db-api'],
	// @ts-expect-error these types are wrong...
	apiHandler: defaultHandler,
	// @ts-expect-error these types are wrong...
	defaultHandler,
	authorizeEndpoint: '/oauth/authorize',
	tokenEndpoint: '/oauth/token',
	clientRegistrationEndpoint: '/oauth/register',
	scopesSupported: [
		'user:read',
		'entries:read',
		'entries:write',
		'tags:read',
		'tags:write',
	],
})

/**
 * Local dev compatibility:
 * MCP clients may include `resource` in token requests, which can produce
 * audience-bound tokens that fail DB API checks in this workshop setup.
 */
async function stripResourceFromTokenRequest(request: Request): Promise<Request> {
	const url = new URL(request.url)
	const isTokenEndpoint =
		url.pathname === '/oauth/token' && request.method === 'POST'
	if (!isTokenEndpoint) return request

	const contentType = request.headers.get('content-type') ?? ''
	if (!contentType.includes('application/x-www-form-urlencoded')) return request

	// Read from a clone so the original stream remains available downstream.
	const body = await request.clone().text()
	const params = new URLSearchParams(body)
	if (!params.has('resource')) return request

	params.delete('resource')
	return new Request(request, { body: params.toString() })
}

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
		handler: async (request: Request, env: Env, ctx: ExecutionContext) => {
			const cleanRequest = await stripResourceFromTokenRequest(request)
			return oauthProvider.fetch(cleanRequest, env, ctx)
		},
	}),
} satisfies ExportedHandler<Env>
