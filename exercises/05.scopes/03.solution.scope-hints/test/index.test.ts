import { expect, inject, test } from 'vitest'

const mcpServerPort = inject('mcpServerPort')
const mcpServerUrl = `http://localhost:${mcpServerPort}`

const supportedScopes = [
	'user:read',
	'entries:read',
	'entries:write',
	'tags:read',
	'tags:write',
]

test(`resource metadata includes scopes_supported`, async () => {
	const resourceMetadataResponse = await fetch(
		`${mcpServerUrl}/.well-known/oauth-protected-resource/mcp`,
	)

	expect(
		resourceMetadataResponse.ok,
		'🚨 fetching resource metadata should succeed',
	).toBe(true)

	const resourceMetadataResponseData = await resourceMetadataResponse.json()
	expect(resourceMetadataResponseData, '🚨 Invalid resource metadata').toEqual({
		resource: expect.any(String),
		authorization_servers: expect.any(Array),
		scopes_supported: expect.arrayContaining(supportedScopes),
	})
})
