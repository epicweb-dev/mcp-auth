import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
	index('routes/index.tsx'),
	route('/healthcheck', 'routes/healthcheck.tsx'),
	route('/db-api', 'routes/db-api.tsx'),
	route('/oauth/authorize', 'routes/oauth/authorize.tsx'),
	route('/oauth/introspection', 'routes/oauth/introspection.ts'),
	route('/test-auth', 'routes/test-auth.tsx'),
] satisfies RouteConfig
