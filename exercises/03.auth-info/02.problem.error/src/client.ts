import { DBClient } from '@epic-web/epicme-db-client'

export const EPIC_ME_AUTH_SERVER_URL = 'http://localhost:7788'

export function getClient() {
	return new DBClient(EPIC_ME_AUTH_SERVER_URL)
}
