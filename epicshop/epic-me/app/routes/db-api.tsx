import { z } from 'zod'
import { type Route } from './+types/db-api'

// Define the JSON-RPC request schema
const rpcRequestSchema = z.object({
	method: z.string(),
	params: z.record(z.any()).optional(),
})

// Define available methods and their parameter schemas
const methodSchemas = {
	// Entry methods
	createEntry: z.object({
		title: z.string(),
		content: z.string(),
		mood: z.string().optional().nullable(),
		location: z.string().optional().nullable(),
		weather: z.string().optional().nullable(),
		isPrivate: z.number().optional().default(1),
		isFavorite: z.number().optional().default(0),
	}),
	getEntry: z.object({
		id: z.number(),
	}),
	getEntries: z.object({
		tagIds: z.array(z.number()).optional(),
		from: z.string().optional(),
		to: z.string().optional(),
	}),
	updateEntry: z.object({
		id: z.number(),
		title: z.string().optional(),
		content: z.string().optional(),
		mood: z.string().nullable().optional(),
		location: z.string().nullable().optional(),
		weather: z.string().nullable().optional(),
		isPrivate: z.number().optional(),
		isFavorite: z.number().optional(),
	}),
	deleteEntry: z.object({
		id: z.number(),
	}),

	// Tag methods
	createTag: z.object({
		name: z.string(),
		description: z.string().optional(),
	}),
	getTag: z.object({
		id: z.number(),
	}),
	getTags: z.object({}),
	updateTag: z.object({
		id: z.number(),
		name: z.string().optional(),
		description: z.string().nullable().optional(),
	}),
	deleteTag: z.object({
		id: z.number(),
	}),

	// User methods
	getUserById: z.object({
		id: z.number(),
	}),

	// Entry tag methods
	addTagToEntry: z.object({
		entryId: z.number(),
		tagId: z.number(),
	}),
	getEntryTags: z.object({
		entryId: z.number(),
	}),
}

export async function action({ request, context }: Route.ActionArgs) {
	try {
		// Get user info from OAuth props (automatically validated by OAuth provider)
		const userId = context.cloudflare.ctx.props.userId

		if (!userId) {
			return Response.json({ error: 'Unauthorized' }, { status: 401 })
		}

		// Parse the request body
		const body = await request.json()
		const { method, params = {} } = rpcRequestSchema.parse(body)

		// Validate that the method exists
		if (!(method in methodSchemas)) {
			return Response.json(
				{ error: `Unknown method: ${method}` },
				{ status: 400 },
			)
		}

		// Call the appropriate database method
		let result: any

		switch (method) {
			case 'createEntry': {
				const entryParams = methodSchemas.createEntry.parse(params)
				result = await context.db.createEntry(Number(userId), entryParams)
				break
			}

			case 'getEntry': {
				const entryParams = methodSchemas.getEntry.parse(params)
				result = await context.db.getEntry(Number(userId), entryParams.id)
				break
			}

			case 'getEntries': {
				const entryParams = methodSchemas.getEntries.parse(params)
				result = await context.db.getEntries(
					Number(userId),
					entryParams.tagIds,
					entryParams.from,
					entryParams.to,
				)
				break
			}

			case 'updateEntry': {
				const entryParams = methodSchemas.updateEntry.parse(params)
				const { id, ...updateData } = entryParams
				result = await context.db.updateEntry(Number(userId), id, updateData)
				break
			}

			case 'deleteEntry': {
				const entryParams = methodSchemas.deleteEntry.parse(params)
				result = await context.db.deleteEntry(Number(userId), entryParams.id)
				break
			}

			case 'createTag': {
				const tagParams = methodSchemas.createTag.parse(params)
				result = await context.db.createTag(Number(userId), tagParams)
				break
			}

			case 'getTag': {
				const tagParams = methodSchemas.getTag.parse(params)
				result = await context.db.getTag(Number(userId), tagParams.id)
				break
			}

			case 'getTags': {
				methodSchemas.getTags.parse(params) // Validate but no params needed
				result = await context.db.getTags(Number(userId))
				break
			}

			case 'updateTag': {
				const tagParams = methodSchemas.updateTag.parse(params)
				const { id, ...updateData } = tagParams
				result = await context.db.updateTag(Number(userId), id, updateData)
				break
			}

			case 'deleteTag': {
				const tagParams = methodSchemas.deleteTag.parse(params)
				result = await context.db.deleteTag(Number(userId), tagParams.id)
				break
			}

			case 'getUserById': {
				const userParams = methodSchemas.getUserById.parse(params)
				result = await context.db.getUserById(userParams.id)
				break
			}

			case 'addTagToEntry': {
				const entryTagParams = methodSchemas.addTagToEntry.parse(params)
				result = await context.db.addTagToEntry(Number(userId), entryTagParams)
				break
			}

			case 'getEntryTags': {
				const entryTagParams = methodSchemas.getEntryTags.parse(params)
				result = await context.db.getEntryTags(
					Number(userId),
					entryTagParams.entryId,
				)
				break
			}

			default:
				return Response.json(
					{ error: `epicme:db-api:Method not implemented: ${method}` },
					{ status: 501 },
				)
		}

		return Response.json({ result })
	} catch (error) {
		console.error('API error:', error)

		if (error instanceof z.ZodError) {
			return Response.json(
				{ error: 'Invalid parameters', details: error.errors },
				{ status: 400 },
			)
		}

		return Response.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			{ status: 500 },
		)
	}
}
