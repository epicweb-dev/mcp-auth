import { execa } from 'execa'
import type { TestProject } from 'vitest/node'

export default function setup(project: TestProject) {
	let appServerProcess: ReturnType<typeof execa> | null = null
	let mcpServerProcess: ReturnType<typeof execa> | null = null

	const startServers = async () => {
		// Start the app server from the root directory
		console.log('Starting app server...')
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
			],
			{
				cwd: process.cwd().replace(/exercises\/.*$/, ''),
				stdio: 'pipe',
				env: {
					...process.env,
					PORT: '7788',
				},
			},
		)

		// Start the MCP server from the exercise directory
		console.log('Starting MCP server...')
		mcpServerProcess = execa('npm', ['run', 'dev:server'], {
			cwd: process.cwd(),
			stdio: 'pipe',
			env: {
				...process.env,
				PORT: '8787',
			},
		})

		// Wait a bit for servers to start
		await new Promise((resolve) => setTimeout(resolve, 3000))
		console.log('Servers started successfully')
	}

	const cleanup = async () => {
		console.log('Cleaning up servers...')
		
		if (mcpServerProcess) {
			mcpServerProcess.kill('SIGTERM')
			try {
				await mcpServerProcess
			} catch {
				// Process was killed, which is expected
			}
		}

		if (appServerProcess) {
			appServerProcess.kill('SIGTERM')
			try {
				await appServerProcess
			} catch {
				// Process was killed, which is expected
			}
		}

		console.log('Servers cleaned up')
	}

	// Start servers immediately
	startServers().catch((error) => {
		console.error('Failed to start servers:', error)
		process.exit(1)
	})

	// Return cleanup function
	return cleanup
}