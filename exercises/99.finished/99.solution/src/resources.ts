import { invariant } from '@epic-web/invariant'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type EpicMeMCP } from './index.ts'

export async function initializeResources(agent: EpicMeMCP) {
	agent.server.registerResource(
		'credits',
		'epicme://credits',
		{ description: 'Who created the EpicMe project?' },
		async (uri: URL) => {
			return {
				contents: [
					{
						mimeType: 'text/plain',
						text: 'EpicMe was created by Kent C. Dodds',
						uri: uri.toString(),
					},
				],
			}
		},
	)

	agent.server.registerResource(
		'user',
		'epicme://users/current',
		{ description: 'The currently logged in user' },
		async (uri: URL) => {
			const user = await agent.requireUser()
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(user),
						uri: uri.toString(),
					},
				],
			}
		},
	)

	agent.server.registerResource(
		'entry',
		new ResourceTemplate('epicme://entries/{id}', {
			list: undefined,
			complete: {
				async id(value) {
					const entries = await agent.db.getEntries()
					return entries
						.map((entry) => entry.id.toString())
						.filter((id) => id.includes(value))
				},
			},
		}),
		{ description: 'A journal entry' },
		async (uri: URL, { id }) => {
			const entry = await agent.db.getEntry(Number(id))
			invariant(entry, `Entry with ID "${id}" not found`)
			return {
				contents: [
					{
						mimeType: 'application/json',
						uri: uri.toString(),
						text: JSON.stringify(entry),
					},
				],
			}
		},
	)

	agent.server.registerResource(
		'tags',
		'epicme://tags',
		{ description: 'All tags' },
		async (uri: URL) => {
			const tags = await agent.db.getTags()
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(tags),
						uri: uri.toString(),
					},
				],
			}
		},
	)

	agent.server.registerResource(
		'tag',
		new ResourceTemplate('epicme://tags/{id}', {
			complete: {
				async id(value) {
					const entries = await agent.db.getTags()
					return entries
						.map((entry) => entry.id.toString())
						.filter((id) => id.includes(value))
				},
			},
			list: async () => {
				const tags = await agent.db.getTags()
				return {
					resources: tags.map((tag) => ({
						name: tag.name,
						uri: `epicme://tags/${tag.id}`,
						mimeType: 'application/json',
					})),
				}
			},
		}),
		{ description: 'A journal tag' },
		async (uri: URL, { id }) => {
			const tag = await agent.db.getTag(Number(id))
			invariant(tag, `Tag with ID "${id}" not found`)
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(tag),
						uri: uri.toString(),
					},
				],
			}
		},
	)
}
