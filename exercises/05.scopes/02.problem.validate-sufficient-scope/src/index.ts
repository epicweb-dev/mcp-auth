import { type DBClient } from '@epic-web/epicme-db-client'
import { invariant } from '@epic-web/invariant'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import {
	type AuthInfo,
	type SupportedScopes,
	// 💰 you'll want this:
	// handleInsufficientScope,
	handleOAuthAuthorizationServerRequest,
	handleOAuthProtectedResourceRequest,
	handleUnauthorized,
	// 💰 you'll want this:
	// hasSufficientScope,
	resolveAuthInfo,
	validateScopes,
} from './auth.ts'
import { getClient } from './client.ts'
import { initializePrompts } from './prompts.ts'
import { initializeResources } from './resources.ts'
import { initializeTools } from './tools.ts'
import { withCors } from './utils.ts'

type State = {}
type Props = { authInfo: AuthInfo }

export class EpicMeMCP extends McpAgent<Env, State, Props> {
	db!: DBClient
	server = new McpServer(
		{
			name: 'epicme',
			title: 'EpicMe Journal',
			version: '1.0.0',
		},
		{
			capabilities: {
				tools: { listChanged: true },
				resources: { listChanged: true, subscribe: true },
				completions: {},
				logging: {},
				prompts: { listChanged: true },
			},
			instructions: `
EpicMe is a journaling app that allows users to write about and review their experiences, thoughts, and reflections.

These tools are the user's window into their journal. With these tools and your help, they can create, read, and manage their journal entries and associated tags.

You can also help users add tags to their entries and get all tags for an entry.
			`.trim(),
		},
	)

	async init() {
		this.db = getClient(this.requireAuthInfo().token)

		await initializeTools(this)
		await initializeResources(this)
		await initializePrompts(this)
	}

	requireAuthInfo() {
		const { authInfo } = this.props ?? {}
		invariant(authInfo, 'Auth info not found')
		return authInfo
	}

	async requireUser() {
		const user = await this.db.getUser()
		invariant(user, 'User not found')
		return user
	}

	hasScope(...scopes: Array<SupportedScopes>) {
		return validateScopes(this.requireAuthInfo(), scopes)
	}
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
		handler: async (request, env, ctx) => {
			const url = new URL(request.url)

			// for backwards compatibility with old clients that think we're the authorization server
			if (url.pathname === '/.well-known/oauth-authorization-server') {
				return handleOAuthAuthorizationServerRequest()
			}

			if (url.pathname === '/.well-known/oauth-protected-resource/mcp') {
				return handleOAuthProtectedResourceRequest(request)
			}

			if (url.pathname === '/mcp') {
				const authInfo = await resolveAuthInfo(
					request.headers.get('authorization'),
				)
				if (!authInfo) return handleUnauthorized(request)

				// 🐨 check whether the authInfo includes all the required scopes
				// 🐨 if it doesn't, call and return the result of handleInsufficientScope()

				const mcp = EpicMeMCP.serve('/mcp', {
					binding: 'EPIC_ME_MCP_OBJECT',
				})

				ctx.props.authInfo = authInfo
				return mcp.fetch(request, env, ctx)
			}

			return new Response('Not found', { status: 404 })
		},
	}),
} satisfies ExportedHandler<Env>
