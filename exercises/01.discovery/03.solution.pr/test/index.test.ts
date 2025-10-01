import { test, expect, inject } from 'vitest'
import { EPIC_ME_AUTH_SERVER_URL } from '../src/client.ts'

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
	const resourceMetadata = await resourceMetadataResponse.json()
	expect(resourceMetadata, '🚨 resource metadata should be valid').toEqual({
		resource: expect.any(String),
		authorization_servers: expect.arrayContaining([EPIC_ME_AUTH_SERVER_URL]),
	})
})
