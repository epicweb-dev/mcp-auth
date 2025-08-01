import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
	index('routes/index.tsx'),
	route('/authorize', 'routes/authorize.tsx'),
	route('/whoami', 'routes/whoami.tsx'),
	route('/db-api', 'routes/db-api.tsx'),
] satisfies RouteConfig
