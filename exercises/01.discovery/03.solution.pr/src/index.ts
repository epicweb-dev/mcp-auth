import { type DBClient } from '@epic-web/epicme-db-client'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import {
	handleOAuthAuthorizationServerRequest,
	handleOAuthProtectedResourceRequest,
} from './auth.ts'
import { getClient } from './client.ts'
import { initializePrompts } from './prompts.ts'
import { initializeResources } from './resources.ts'
import { initializeTools } from './tools.ts'
import { withCors } from './utils.ts'

export class EpicMeMCP extends McpAgent<Env> {
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
		this.db = getClient()
		await initializeTools(this)
		await initializeResources(this)
		await initializePrompts(this)
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
				const mcp = EpicMeMCP.serve('/mcp', {
					binding: 'EPIC_ME_MCP_OBJECT',
				})
				return mcp.fetch(request, env, ctx)
			}

			if (url.pathname === '/healthcheck') {
				return new Response('OK', { status: 200 })
			}

			return new Response('Not found', { status: 404 })
		},
	}),
} satisfies ExportedHandler<Env>
