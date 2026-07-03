import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

// --- Versioned tax data (the "dynamic" layer) ---

// One snapshot of the T constants per vintage; payloadJson holds the full T object
// (including T.regions factors). Exactly one row is is_active at a time.
export const taxDataset = sqliteTable('tax_dataset', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	year: integer('year').notNull(),
	source: text('source').notNull(),
	effectiveFrom: text('effective_from'),
	checksum: text('checksum'),
	payloadJson: text('payload_json').notNull(),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
	createdAt: text('created_at').notNull()
});

// The municipality rate table per dataset vintage.
export const municipalities = sqliteTable(
	'municipalities',
	{
		datasetId: integer('dataset_id').notNull().references(() => taxDataset.id),
		code: text('code').notNull(),
		name: text('name').notNull(),
		district: text('district').notNull(),
		region: text('region').notNull(),
		derramaRate: real('derrama_rate').notNull(),
		derramaReducedRate: real('derrama_reduced_rate').notNull(),
		derramaThreshold: real('derrama_threshold').notNull(),
		participacaoDevolution: real('participacao_devolution').notNull(),
		src: text('src').notNull(),
		year: integer('year').notNull()
	},
	(t) => [primaryKey({ columns: [t.datasetId, t.code] })]
);

// Region labels + VAT (factors live in T.regions inside the dataset payload).
export const regions = sqliteTable('regions', {
	code: text('code').primaryKey(),
	labelPt: text('label_pt').notNull(),
	labelEn: text('label_en').notNull(),
	ivaJson: text('iva_json').notNull()
});

// --- Bilingual content ---

export const glossary = sqliteTable('glossary', {
	id: text('id').primaryKey(),
	termPt: text('term_pt').notNull(),
	termEn: text('term_en').notNull(),
	defPt: text('def_pt').notNull(),
	defEn: text('def_en').notNull()
});

// name: concepts | negotiation | intl | risks | setup | obligations | englobamento
// Arrays (concepts/negotiation) are JSON; prose blocks are the HTML string.
export const contentBlock = sqliteTable(
	'content_block',
	{
		name: text('name').notNull(),
		lang: text('lang').notNull(),
		payloadJson: text('payload_json').notNull()
	},
	(t) => [primaryKey({ columns: [t.name, t.lang] })]
);

// --- Analytics (anonymous by default) ---

export const simulationEvent = sqliteTable('simulation_event', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at').notNull(),
	sessionId: text('session_id'),
	userId: text('user_id'),
	lang: text('lang'),
	source: text('source'),
	datasetVersion: integer('dataset_version'),
	paramsJson: text('params_json').notNull(),
	revenue: real('revenue'),
	winner: text('winner'),
	region: text('region'),
	municipalityCode: text('municipality_code'),
	hourlyRate: real('hourly_rate'),
	hoursPerDay: real('hours_per_day'),
	daysPerYear: real('days_per_year'),
	salary: real('salary'),
	countryCoarse: text('country_coarse'),
	referrerHost: text('referrer_host')
});

export const simulationResult = sqliteTable('simulation_result', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	eventId: integer('event_id').notNull().references(() => simulationEvent.id),
	scenario: text('scenario').notNull(),
	net: real('net').notNull(),
	effectiveRate: real('effective_rate').notNull()
});

// --- Email capture ---

// One row per emailed-report request. The report itself is transactional (sent
// immediately); alertsConsent + the double opt-in (confirmToken → confirmedAt)
// gate only the ongoing law-change alerts list. paramsJson snapshots the scenario.
export const emailSubscriber = sqliteTable('email_subscriber', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull(),
	lang: text('lang').notNull(),
	source: text('source').notNull(),
	paramsJson: text('params_json').notNull(),
	alertsConsent: integer('alerts_consent', { mode: 'boolean' }).notNull().default(false),
	confirmToken: text('confirm_token'),
	confirmedAt: text('confirmed_at'),
	unsubscribedAt: text('unsubscribed_at'),
	createdAt: text('created_at').notNull()
});

// --- Entitlements ---

// Grants a user access to premium ('pro') features. Empty in this build; a real
// entitlement integration would populate it. userId is the auth user id (the
// user table is added in the auth increment); the relationship is enforced in
// application code, so no FK is declared yet and this migration is
// self-contained (it can land before the user table).
export const entitlement = sqliteTable('entitlement', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	plan: text('plan').notNull(),
	status: text('status').notNull().default('active'), // 'active' | 'canceled' | 'expired'
	source: text('source').notNull(), // e.g. 'launch' | 'manual'
	currentPeriodEnd: text('current_period_end'), // ISO; null = no expiry
	externalRef: text('external_ref'), // external reference id
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
});

// --- Auth (Better Auth) ---

// These four tables are owned by Better Auth (better-auth/adapters/drizzle) and
// deliberately follow ITS schema rather than the house convention: string (text)
// ids and integer epoch timestamps (mode: 'timestamp'), because the adapter
// reads/writes JS Date objects. The Drizzle field (property) names MUST match
// Better Auth's field names (camelCase) - the adapter references them directly.
// Magic-link-only auth: the account table stays empty, but the adapter still
// expects it to exist; the verification table backs the magic-link tokens.
export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
	image: text('image'),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
	token: text('token').notNull().unique(),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' })
});

export const account = sqliteTable('account', {
	id: text('id').primaryKey(),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
	refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
	scope: text('scope'),
	password: text('password'),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
});

export const verification = sqliteTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
});

// --- Saved scenarios ---

// A user's saved snapshot of clamped SimParams (see $lib/params.clampParams).
// Own-only: every read/write in the API is scoped to userId.
export const savedScenario = sqliteTable('saved_scenario', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	lang: text('lang').notNull(),
	paramsJson: text('params_json').notNull(),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
});

// --- Law-change alerts ---

// One row per saved scenario a user wants notified about (unique per scenario:
// resubscribing clears unsubscribedAt on the same row rather than duplicating
// it). Mirrors emailSubscriber's opt-in columns so the confirm/unsubscribe token
// flow is reused. The subscriber's email is already verified (they
// are signed in via Better Auth magic-link), so confirmedAt is set immediately
// at creation - there is no separate email-confirmation step, only unsubscribe.
export const alertSubscription = sqliteTable('alert_subscription', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	savedScenarioId: integer('saved_scenario_id').notNull().unique().references(() => savedScenario.id, { onDelete: 'cascade' }),
	email: text('email').notNull(),
	confirmToken: text('confirm_token').notNull(),
	confirmedAt: text('confirmed_at'),
	unsubscribedAt: text('unsubscribed_at'),
	lastNotifiedDatasetId: integer('last_notified_dataset_id'),
	createdAt: text('created_at').notNull()
});
