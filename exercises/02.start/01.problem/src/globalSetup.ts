import { execa } from 'execa'
import { type TestProject } from 'vitest/node'

export default async function setup(project: TestProject) {
	let appServerProcess: ReturnType<typeof execa> | null = null
	let mcpServerProcess: ReturnType<typeof execa> | null = null

	const waitForServer = async (
		url: string,
		maxAttempts = 30,
		method = 'HEAD',
	) => {
		for (let i = 0; i < maxAttempts; i++) {
			try {
				console.log(`Attempt ${i + 1}/${maxAttempts}: Checking ${url}`)
				const response = await fetch(url, { method })
				if (
					response.ok ||
					(method === 'POST' &&
						(response.status === 400 || response.status === 406))
				) {
					// For MCP endpoints, a 400 or 406 response to an empty POST is expected and means the server is up
					console.log(
						`✓ Server at ${url} is ready (status: ${response.status})`,
					)
					return true
				}
				console.log(`Server responded with status: ${response.status}`)
			} catch (error) {
				console.log(`Server not ready: ${error.message}`)
			}
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
		return false
	}

	const startServers = async () => {
		console.log('Starting servers...')

		// Kill any existing processes on our ports
		try {
			await execa('pkill', ['-f', 'port.*7788'], { reject: false })
			await execa('pkill', ['-f', 'port.*8787'], { reject: false })
			await new Promise((resolve) => setTimeout(resolve, 1000))
		} catch {
			// Ignore errors, processes might not exist
		}

		// Get the root directory
		const rootDir = process.cwd().replace(/exercises\/.*$/, '')

		// Start the app server from the root directory
		console.log('Starting app server on port 7788...')
		appServerProcess = execa(
			'npm',
			[
				'run',
				'dev',
				'--prefix',
				'./epicshop/epic-me',
				'--',
				'--clearScreen=false',
				'--logLevel=error',
				'--strictPort',
				'--port=7788',
			],
			{
				cwd: rootDir,
				stdio: ['ignore', 'pipe', 'pipe'],
				env: {
					...process.env,
					PORT: '7788',
				},
			},
		)

		// Start the MCP server from the exercise directory
		console.log('Starting MCP server on port 8787...')
		mcpServerProcess = execa('npx', ['wrangler', 'dev', '--port', '8787'], {
			cwd: process.cwd(),
			stdio: ['ignore', 'pipe', 'pipe'],
			env: {
				...process.env,
				PORT: '8787',
			},
		})

		// Log MCP server output for debugging
		mcpServerProcess.stdout?.on('data', (data) => {
			console.log(`MCP Server stdout: ${data}`)
		})
		mcpServerProcess.stderr?.on('data', (data) => {
			console.log(`MCP Server stderr: ${data}`)
		})
		mcpServerProcess.on('exit', (code) => {
			console.log(`MCP Server exited with code: ${code}`)
		})

		// Wait for app server to be ready
		console.log('Waiting for app server to be ready...')
		const appReady = await waitForServer('http://localhost:7788')
		if (!appReady) {
			throw new Error('App server failed to start within timeout')
		}

		// Wait for MCP server to be ready
		console.log('Waiting for MCP server to be ready...')
		const mcpReady = await waitForServer(
			'http://localhost:8787/mcp',
			30,
			'POST',
		)
		if (!mcpReady) {
			throw new Error('MCP server failed to start within timeout')
		}

		console.log('Servers started successfully')
	}

	const cleanup = async () => {
		console.log('Cleaning up servers...')

		if (mcpServerProcess && !mcpServerProcess.killed) {
			mcpServerProcess.kill('SIGTERM')
			try {
				await mcpServerProcess
			} catch {
				// Process was killed, which is expected
			}
		}

		if (appServerProcess && !appServerProcess.killed) {
			appServerProcess.kill('SIGTERM')
			try {
				await appServerProcess
			} catch {
				// Process was killed, which is expected
			}
		}

		console.log('Servers cleaned up')
	}

	// Start servers and wait for them to be ready before returning
	await startServers()

	// Return cleanup function
	return cleanup
}
