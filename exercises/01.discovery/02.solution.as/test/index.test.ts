import { test, expect, inject } from 'vitest'

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
	const resourceMetadata = await resourceMetadataResponse.json()
	expect(
		resourceMetadata,
		'🚨 authorization server metadata should be valid',
	).toEqual(
		expect.objectContaining({
			registration_endpoint: expect.any(String),
			authorization_endpoint: expect.any(String),
			token_endpoint: expect.any(String),
		}),
	)
})
