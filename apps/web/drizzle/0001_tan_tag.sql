CREATE TABLE `email_subscriber` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`lang` text NOT NULL,
	`source` text NOT NULL,
	`params_json` text NOT NULL,
	`alerts_consent` integer DEFAULT false NOT NULL,
	`confirm_token` text,
	`confirmed_at` text,
	`unsubscribed_at` text,
	`created_at` text NOT NULL
);
