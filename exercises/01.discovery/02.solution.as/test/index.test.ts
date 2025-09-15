import { test, expect, inject } from 'vitest'
import { z } from 'zod'

const mcpServerPort = inject('mcpServerPort')
const mcpServerUrl = `http://localhost:${mcpServerPort}`

test(`The MCP server correctly proxies to the OAuth server for authorization server metadata`, async () => {
	const resourceMetadataResponse = await fetch(
		`${mcpServerUrl}/.well-known/oauth-authorization-server`,
	)
	expect(
		resourceMetadataResponse.ok,
		'🚨 fetching authorization server metadata should succeed',
	).toBe(true)

	const resourceMetadataResult = z
		.object({
			registration_endpoint: z.string(),
			authorization_endpoint: z.string(),
			token_endpoint: z.string(),
		})
		.safeParse(await resourceMetadataResponse.json())
	if (!resourceMetadataResult.success) {
		throw new Error(
			'🚨 Invalid authorization server metadata: ' +
				resourceMetadataResult.error.message,
		)
	}
})
