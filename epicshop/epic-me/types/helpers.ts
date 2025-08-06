/// <reference path="./worker-configuration.d.ts" />

// https://github.com/cloudflare/workers-sdk/issues/10254
// eslint-disable-next-line
import type { OAuthHelpers, Token } from '@cloudflare/workers-oauth-provider'
import { type DB } from '#workers/db/index.ts'

export type { Token }

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
