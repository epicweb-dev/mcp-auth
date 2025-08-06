import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { createRequestHandler } from 'react-router'
import { type Env } from '#types/helpers'
import { DB } from './db/index.ts'

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

export default new OAuthProvider({
	apiRoute: ['/whoami', '/db-api', '/introspect'],
	// @ts-expect-error these types are wrong...
	apiHandler: defaultHandler,
	// @ts-expect-error these types are wrong...
	defaultHandler,
	authorizeEndpoint: '/authorize',
	tokenEndpoint: '/token',
	clientRegistrationEndpoint: '/register',
})
