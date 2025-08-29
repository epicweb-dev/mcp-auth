import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import devtoolsJson from 'vite-plugin-devtools-json'
import tsconfigPaths from 'vite-tsconfig-paths'

const port = 7788
if (!(globalThis as any).loggedPort) {
	console.log(`EpicMeApp running at http://localhost:${port}`)
	;(globalThis as any).loggedPort = true
}

export default defineConfig({
	server: { port },
	plugins: [
		{
			name: 'strip-typegen-imports',
			enforce: 'pre',
			resolveId(id) {
				if (id.includes('+types/')) return id
			},
			load(id) {
				if (id.includes('+types/')) return 'export {}'
			},
		},
		cloudflare({ viteEnvironment: { name: 'ssr' } }),
		tailwindcss(),
		reactRouter(),
		tsconfigPaths(),
		devtoolsJson(),
	],
})
