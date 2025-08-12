import { type DBClient } from '@epic-web/epicme-db-client'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { getClient } from './client.ts'
import { initializePrompts } from './prompts.ts'
import { initializeResources } from './resources.ts'
import { initializeTools } from './tools.ts'

export class EpicMeMCP {
	db!: DBClient
	state = { loggingLevel: 'info' }
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
		this.server.server.setRequestHandler(
			SetLevelRequestSchema,
			async (request) => {
				this.state.loggingLevel = request.params.level
				return {}
			},
		)
		await initializeTools(this)
		await initializeResources(this)
		await initializePrompts(this)
	}
}

async function main() {
	const agent = new EpicMeMCP()
	await agent.init()
	const transport = new StdioServerTransport()
	await agent.server.connect(transport)
	console.error('EpicMe MCP Server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error in main():', error)
	process.exit(1)
})
