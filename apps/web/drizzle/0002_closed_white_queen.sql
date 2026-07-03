CREATE TABLE `entitlement` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`plan` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`source` text NOT NULL,
	`current_period_end` text,
	`external_ref` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
