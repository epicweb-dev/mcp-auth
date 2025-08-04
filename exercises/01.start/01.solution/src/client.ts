import { DBClient } from '@epic-web/epicme-db-client'

const EPIC_ME_SERVER_URL = 'http://localhost:7788'

export function getClient() {
	return new DBClient(EPIC_ME_SERVER_URL)
}
