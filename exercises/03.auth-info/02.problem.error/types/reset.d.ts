import '@epic-web/config/reset.d.ts'

declare global {
	interface EpicMeExportedHandler<Props = {}> {
		fetch: (
			request: Request,
			env: Env,
			ctx: ExecutionContext<Props>,
		) => Response | Promise<Response>
	}
}
