/// <reference path="../../types/worker-configuration.d.ts" />

import { sql } from './utils.ts'

const migrations = [
	{
		version: 1,
		name: 'initial_schema',
		up: async (db: D1Database) => {
			console.log('Starting initial schema migration...')
			try {
				await db.batch([
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS schema_versions (
							version INTEGER PRIMARY KEY,
							name TEXT NOT NULL,
							applied_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL
						);
					`),
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS users (
							id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
							email text NOT NULL UNIQUE,
							created_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							updated_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
						);
						CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
					`),
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS entries (
							id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
							user_id integer NOT NULL,
							title text NOT NULL,
							content text NOT NULL,
							mood text,
							location text,
							weather text,
							is_private integer DEFAULT 1 NOT NULL CHECK (is_private IN (0, 1)),
							is_favorite integer DEFAULT 0 NOT NULL CHECK (is_favorite IN (0, 1)),
							created_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							updated_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
						);
						CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
						CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
						CREATE INDEX IF NOT EXISTS idx_entries_is_private ON entries(is_private);
					`),
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS tags (
							id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
							user_id integer NOT NULL,
							name text NOT NULL,
							description text,
							created_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							updated_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
							UNIQUE(user_id, name)
						);
						CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
					`),
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS entry_tags (
							id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
							user_id integer NOT NULL,
							entry_id integer NOT NULL,
							tag_id integer NOT NULL,
							created_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							updated_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
							FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
							FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
							UNIQUE(entry_id, tag_id)
						);
						CREATE INDEX IF NOT EXISTS idx_entry_tags_user ON entry_tags(user_id);
						CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id);
						CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);
					`),
				])
				console.log('Successfully created all tables')
			} catch (error) {
				console.error('Error in initial schema migration:', error)
				throw error
			}
		},
	},
	{
		version: 2,
		name: 'create_multiple_users_with_data',
		up: async (db: D1Database) => {
			console.log('Starting multiple users creation migration...')
			try {
				// Helper function to create user with data
				const createUserWithData = async (
					email: string,
					userData: {
						tags: Array<{ name: string; description: string }>
						entries: Array<{
							title: string
							content: string
							mood: string
							location: string
							weather: string
							isPrivate: number
							isFavorite: number
						}>
						entryTagMappings: Array<{ entryIndex: number; tagNames: string[] }>
					},
				) => {
					// Create user
					const userResult = await db
						.prepare(sql`INSERT INTO users (email) VALUES (?) RETURNING id;`)
						.bind(email)
						.first<{ id: number }>()

					if (!userResult) {
						throw new Error(`Failed to create user ${email}`)
					}

					const userId = userResult.id
					console.log(`Created user ${email} with ID: ${userId}`)

					// Create tags
					const tagIds: number[] = []
					for (const tag of userData.tags) {
						const tagResult = await db
							.prepare(
								sql`
								INSERT INTO tags (user_id, name, description) 
								VALUES (?, ?, ?)
								RETURNING id;
							`,
							)
							.bind(userId, tag.name, tag.description)
							.first<{ id: number }>()

						if (tagResult) {
							tagIds.push(tagResult.id)
						}
					}
					console.log(`Created ${tagIds.length} tags for ${email}`)

					// Create entries
					const entryIds: number[] = []
					for (const entry of userData.entries) {
						const entryResult = await db
							.prepare(
								sql`
								INSERT INTO entries (user_id, title, content, mood, location, weather, is_private, is_favorite) 
								VALUES (?, ?, ?, ?, ?, ?, ?, ?)
								RETURNING id;
							`,
							)
							.bind(
								userId,
								entry.title,
								entry.content,
								entry.mood,
								entry.location,
								entry.weather,
								entry.isPrivate,
								entry.isFavorite,
							)
							.first<{ id: number }>()

						if (entryResult) {
							entryIds.push(entryResult.id)
						}
					}
					console.log(`Created ${entryIds.length} entries for ${email}`)

					// Apply tags to entries
					let totalTagApplications = 0
					for (const mapping of userData.entryTagMappings) {
						const entryId = entryIds[mapping.entryIndex]

						for (const tagName of mapping.tagNames) {
							const tagIndex = userData.tags.findIndex(
								(t) => t.name === tagName,
							)
							if (tagIndex !== -1) {
								const tagId = tagIds[tagIndex]
								await db
									.prepare(
										sql`
										INSERT INTO entry_tags (user_id, entry_id, tag_id) 
										VALUES (?, ?, ?)
									`,
									)
									.bind(userId, entryId, tagId)
									.run()
								totalTagApplications++
							}
						}
					}
					console.log(
						`Applied ${totalTagApplications} tag relationships for ${email}`,
					)
				}

				// Create Kody user with data
				await createUserWithData('kody@kcd.dev', {
					tags: [
						{ name: 'coding', description: 'Programming and development work' },
						{ name: 'family', description: 'Time spent with family' },
						{ name: 'health', description: 'Exercise and wellness activities' },
						{
							name: 'travel',
							description: 'Travel experiences and adventures',
						},
						{
							name: 'learning',
							description: 'Educational activities and courses',
						},
					],
					entries: [
						{
							title: 'First Day at Epic Web',
							content:
								"Started my new role at Epic Web today. The team is amazing and I'm excited to work on such innovative projects. The office has a great vibe and everyone is so welcoming.",
							mood: 'excited',
							location: 'work',
							weather: 'sunny',
							isPrivate: 0,
							isFavorite: 1,
						},
						{
							title: 'Weekend Hike with Family',
							content:
								'Took the kids on a beautiful hike this weekend. The weather was perfect and we discovered a new trail with amazing views. The kids loved exploring and we found some interesting rocks.',
							mood: 'happy',
							location: 'park',
							weather: 'sunny',
							isPrivate: 0,
							isFavorite: 0,
						},
						{
							title: 'Learning React Server Components',
							content:
								'Spent the evening diving deep into React Server Components. The concept is fascinating and I can see how it will revolutionize how we build web applications. Need to practice more with the new patterns.',
							mood: 'focused',
							location: 'home',
							weather: 'cloudy',
							isPrivate: 1,
							isFavorite: 1,
						},
						{
							title: 'Gym Session',
							content:
								'Had a great workout today. Focused on strength training and managed to hit some new personal records. Feeling energized and ready to tackle the rest of the day.',
							mood: 'energized',
							location: 'gym',
							weather: 'rainy',
							isPrivate: 1,
							isFavorite: 0,
						},
						{
							title: 'Planning Summer Vacation',
							content:
								'Started planning our summer vacation today. Looking at destinations and trying to find the perfect balance between adventure and relaxation. The kids are excited about the possibilities.',
							mood: 'excited',
							location: 'home',
							weather: 'sunny',
							isPrivate: 0,
							isFavorite: 1,
						},
					],
					entryTagMappings: [
						{ entryIndex: 0, tagNames: ['coding', 'learning'] },
						{ entryIndex: 1, tagNames: ['family', 'travel'] },
						{ entryIndex: 2, tagNames: ['coding', 'learning'] },
						{ entryIndex: 3, tagNames: ['health'] },
						{ entryIndex: 4, tagNames: ['family', 'travel'] },
					],
				})

				// Create Olivia user with data
				await createUserWithData('olivia@kcd.dev', {
					tags: [
						{
							name: 'nature',
							description: 'Outdoor activities and wildlife observation',
						},
						{
							name: 'photography',
							description: 'Photo sessions and camera work',
						},
						{ name: 'wisdom', description: 'Learning and sharing knowledge' },
						{
							name: 'nocturnal',
							description: 'Night-time activities and observations',
						},
						{
							name: 'forest',
							description: 'Time spent in woodland environments',
						},
					],
					entries: [
						{
							title: 'Night Watch in the Forest',
							content:
								'Spent the evening observing the nocturnal wildlife from my favorite perch. The moonlight filtering through the trees created such a magical atmosphere. Saw several owls hunting and even spotted a family of raccoons.',
							mood: 'peaceful',
							location: 'forest',
							weather: 'clear',
							isPrivate: 0,
							isFavorite: 1,
						},
						{
							title: 'Photography Session at Dawn',
							content:
								'Captured some stunning photos of the sunrise over the lake. The golden light was perfect for wildlife photography. Managed to get a beautiful shot of a heron taking flight.',
							mood: 'inspired',
							location: 'lake',
							weather: 'sunny',
							isPrivate: 0,
							isFavorite: 1,
						},
						{
							title: 'Sharing Wisdom with Young Owls',
							content:
								'Had a wonderful mentoring session with some young owls today. Taught them about the importance of patience in hunting and the value of silent flight. They were such eager learners!',
							mood: 'fulfilled',
							location: 'nest',
							weather: 'cloudy',
							isPrivate: 1,
							isFavorite: 0,
						},
						{
							title: 'Exploring New Territory',
							content:
								'Ventured into a new part of the forest I had never explored before. Discovered some ancient trees and found a perfect new nesting spot. The biodiversity here is incredible.',
							mood: 'adventurous',
							location: 'forest',
							weather: 'sunny',
							isPrivate: 0,
							isFavorite: 1,
						},
						{
							title: 'Storm Watching',
							content:
								'Watched an incredible thunderstorm roll in from my tree. The lightning was spectacular and the rain created such a soothing sound. Nature truly is the greatest show.',
							mood: 'awe-struck',
							location: 'tree',
							weather: 'stormy',
							isPrivate: 1,
							isFavorite: 0,
						},
					],
					entryTagMappings: [
						{ entryIndex: 0, tagNames: ['nature', 'nocturnal', 'forest'] },
						{ entryIndex: 1, tagNames: ['photography', 'nature'] },
						{ entryIndex: 2, tagNames: ['wisdom'] },
						{ entryIndex: 3, tagNames: ['nature', 'forest'] },
						{ entryIndex: 4, tagNames: ['nocturnal', 'nature'] },
					],
				})

				// Create Kellie user with data
				await createUserWithData('kellie@kcd.dev', {
					tags: [
						{
							name: 'adventure',
							description: 'Exploration and daring activities',
						},
						{
							name: 'magic',
							description: 'Mystical experiences and enchantments',
						},
						{ name: 'friendship', description: 'Time spent with companions' },
						{ name: 'quests', description: 'Important missions and journeys' },
						{
							name: 'crafting',
							description: 'Creating magical items and tools',
						},
					],
					entries: [
						{
							title: 'Embarking on a New Quest',
							content:
								'Set out on an exciting new adventure today! The journey promises to be challenging but rewarding. Packed my magical supplies and prepared my spells. Ready to face whatever comes my way.',
							mood: 'determined',
							location: 'adventure-path',
							weather: 'mystical',
							isPrivate: 0,
							isFavorite: 1,
						},
						{
							title: 'Crafting Session with Friends',
							content:
								'Spent the afternoon crafting magical items with my fellow adventurers. The workshop was filled with laughter and the sound of enchantments being woven. Created some truly beautiful pieces together.',
							mood: 'joyful',
							location: 'workshop',
							weather: 'enchanted',
							isPrivate: 0,
							isFavorite: 0,
						},
						{
							title: 'Solving Ancient Riddles',
							content:
								'Came across some ancient runes today that required all my magical knowledge to decipher. The challenge was intense but incredibly satisfying. Each riddle solved revealed new secrets.',
							mood: 'focused',
							location: 'ancient-ruins',
							weather: 'mysterious',
							isPrivate: 1,
							isFavorite: 1,
						},
						{
							title: 'Celebrating Victory with Companions',
							content:
								'After a successful quest, we gathered to celebrate our achievements. The feast was magnificent and the stories shared were even better. These moments with friends are what make every adventure worthwhile.',
							mood: 'celebratory',
							location: 'tavern',
							weather: 'festive',
							isPrivate: 0,
							isFavorite: 1,
						},
						{
							title: 'Learning New Spells',
							content:
								'Dedicated today to studying ancient spellbooks and practicing new magical techniques. The power flowing through me was incredible. Each spell mastered brings me closer to becoming a true master of magic.',
							mood: 'inspired',
							location: 'library',
							weather: 'magical',
							isPrivate: 1,
							isFavorite: 0,
						},
					],
					entryTagMappings: [
						{ entryIndex: 0, tagNames: ['adventure', 'quests'] },
						{ entryIndex: 1, tagNames: ['crafting', 'friendship'] },
						{ entryIndex: 2, tagNames: ['magic', 'quests'] },
						{ entryIndex: 3, tagNames: ['friendship', 'adventure'] },
						{ entryIndex: 4, tagNames: ['magic', 'crafting'] },
					],
				})

				console.log(
					'Successfully created all users with their tags and entries',
				)
			} catch (error) {
				console.error('Error in multiple users creation migration:', error)
				throw error
			}
		},
	},
	// Add future migrations here with incrementing version numbers
]

// Run migrations
export async function migrate(db: D1Database) {
	try {
		// Create schema_versions table if it doesn't exist (this is our first run)
		await db.exec(sql`
			CREATE TABLE IF NOT EXISTS schema_versions (
				version INTEGER PRIMARY KEY,
				name TEXT NOT NULL,
				applied_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL
			);
		`)

		// Get the current version
		const result = await db
			.prepare(sql`SELECT MAX(version) as version FROM schema_versions;`)
			.first<{ version: number | null }>()

		const currentVersion = result?.version ?? 0

		// Run any migrations that haven't been applied yet
		for (const migration of migrations) {
			if (migration.version > currentVersion) {
				console.log(`Running migration ${migration.version}: ${migration.name}`)
				await migration.up(db)
				await db
					.prepare(
						sql`INSERT INTO schema_versions (version, name) VALUES (?, ?);`,
					)
					.bind(migration.version, migration.name)
					.run()
				console.log(`Completed migration ${migration.version}`)
			}
		}
	} catch (error) {
		console.error('Error during migration process:', error)
		throw error
	}
}
