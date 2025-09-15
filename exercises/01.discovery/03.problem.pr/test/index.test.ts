import { test, expect, inject } from 'vitest'
import { z } from 'zod'

const mcpServerPort = inject('mcpServerPort')
const mcpServerUrl = `http://localhost:${mcpServerPort}`

test(`Protected resource metadata is discoverable`, async () => {
	const resourceMetadataResponse = await fetch(
		`${mcpServerUrl}/.well-known/oauth-protected-resource/mcp`,
	)
	expect(
		resourceMetadataResponse.ok,
		'🚨 fetching resource metadata should succeed',
	).toBe(true)

	const resourceMetadataResult = z
		.object({
			resource: z.string(),
			authorization_servers: z.array(z.string()).length(1),
		})
		.safeParse(await resourceMetadataResponse.json())
	if (!resourceMetadataResult.success) {
		throw new Error(
			'🚨 Invalid resource metadata: ' + resourceMetadataResult.error.message,
		)
	}
})
