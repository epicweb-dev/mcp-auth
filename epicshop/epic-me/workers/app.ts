import OAuthProvider, {
	type OAuthHelpers,
} from '@cloudflare/workers-oauth-provider'
import { createRequestHandler } from 'react-router'
import { DB } from './db/index.ts'

export interface Env extends Cloudflare.Env {
	OAUTH_PROVIDER: OAuthHelpers
}

// Extend ExecutionContext to include OAuth props
export interface EpicExecutionContext extends ExecutionContext {
	props: {
		userId?: string
		userEmail?: string
	}
}

declare module 'react-router' {
	export interface AppLoadContext {
		db: DB
		cloudflare: {
			env: Env
			ctx: EpicExecutionContext
		}
	}
}

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
	apiRoute: ['/whoami', '/db-api'],
	// @ts-expect-error these types are wrong...
	apiHandler: defaultHandler,
	// @ts-expect-error these types are wrong...
	defaultHandler,
	authorizeEndpoint: '/authorize',
	tokenEndpoint: '/token',
	clientRegistrationEndpoint: '/register',
})
