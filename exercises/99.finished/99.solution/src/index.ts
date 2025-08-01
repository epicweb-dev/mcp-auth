/// <reference path="../types/worker-configuration.d.ts" />

import { type DBClient } from '@epic-web/epicme-db-client'
import { invariant } from '@epic-web/invariant'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import {
	type AuthInfo,
	getAuthInfoFromOAuthFromRequest,
	getClient,
	getOAuthAuthorizationServerConfig,
	getOAuthProtectedResourceConfig,
	initiateOAuthFlow,
} from './client.ts'
import { initializePrompts } from './prompts.ts'
import { initializeResources } from './resources.ts'
import { initializeTools } from './tools.ts'

export class EpicMeMCP extends McpAgent<Env, {}, { authInfo: AuthInfo }> {
	db!: DBClient
	server = new McpServer({
		name: 'epicme',
		title: 'EpicMe Journal',
		version: '1.0.0',
	})

	async init() {
		const authInfo = this.props.authInfo
		invariant(authInfo, 'Auth info not found')
		this.db = getClient(authInfo.token)
		await initializeResources(this)
		await initializeTools(this)
		await initializePrompts(this)
	}

	async requireUser() {
		const user = await this.db.getUserById(
			Number(this.props.authInfo.extra.userId),
		)
		invariant(user, 'User not found')
		return user
	}
}

function withCors(
	handler: (
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	) => Promise<Response>,
) {
	return async (request: Request, env: Env, ctx: ExecutionContext) => {
		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 200,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers':
						'Content-Type, Authorization, X-Requested-With',
					'Access-Control-Max-Age': '86400',
				},
			})
		}

		// Call the original handler
		const response = await handler(request, env, ctx)

		// Add CORS headers to the response
		const newHeaders = new Headers(response.headers)
		newHeaders.set('Access-Control-Allow-Origin', '*')
		newHeaders.set(
			'Access-Control-Allow-Methods',
			'GET, POST, PUT, DELETE, OPTIONS',
		)
		newHeaders.set(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, X-Requested-With',
		)

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: newHeaders,
		})
	}
}

export default {
	fetch: withCors(async (request: Request, env: Env, ctx: ExecutionContext) => {
		const url = new URL(request.url)

		if (url.pathname === '/.well-known/oauth-authorization-server') {
			const config = await getOAuthAuthorizationServerConfig()
			return Response.json(config)
		}

		if (url.pathname === '/.well-known/oauth-protected-resource/mcp') {
			const config = await getOAuthProtectedResourceConfig()
			return Response.json(config)
		}

		const authInfo = await getAuthInfoFromOAuthFromRequest(request)

		if (!authInfo) return initiateOAuthFlow(request)

		if (url.pathname === '/mcp') {
			const mcp = EpicMeMCP.serve('/mcp', {
				binding: 'EPIC_ME_MCP_OBJECT',
			})
			ctx.props.authInfo = authInfo
			return mcp.fetch(request, env, ctx)
		}

		return new Response('Not found', { status: 404 })
	}),
}
