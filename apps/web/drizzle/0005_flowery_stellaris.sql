CREATE TABLE `alert_subscription` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`saved_scenario_id` integer NOT NULL,
	`email` text NOT NULL,
	`confirm_token` text NOT NULL,
	`confirmed_at` text,
	`unsubscribed_at` text,
	`last_notified_dataset_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`saved_scenario_id`) REFERENCES `saved_scenario`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alert_subscription_saved_scenario_id_unique` ON `alert_subscription` (`saved_scenario_id`);