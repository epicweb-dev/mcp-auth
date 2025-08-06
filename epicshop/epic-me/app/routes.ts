import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
	index('routes/index.tsx'),
	route('/authorize', 'routes/authorize.tsx'),
	route('/healthcheck', 'routes/healthcheck.tsx'),
	route('/db-api', 'routes/db-api.tsx'),
	route('/introspect', 'routes/introspect.tsx'),
	route('/test-auth', 'routes/test-auth.tsx'),
] satisfies RouteConfig
