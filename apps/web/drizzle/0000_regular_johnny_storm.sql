CREATE TABLE `content_block` (
	`name` text NOT NULL,
	`lang` text NOT NULL,
	`payload_json` text NOT NULL,
	PRIMARY KEY(`name`, `lang`)
);
--> statement-breakpoint
CREATE TABLE `glossary` (
	`id` text PRIMARY KEY NOT NULL,
	`term_pt` text NOT NULL,
	`term_en` text NOT NULL,
	`def_pt` text NOT NULL,
	`def_en` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `municipalities` (
	`dataset_id` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`district` text NOT NULL,
	`region` text NOT NULL,
	`derrama_rate` real NOT NULL,
	`derrama_reduced_rate` real NOT NULL,
	`derrama_threshold` real NOT NULL,
	`participacao_devolution` real NOT NULL,
	`src` text NOT NULL,
	`year` integer NOT NULL,
	PRIMARY KEY(`dataset_id`, `code`),
	FOREIGN KEY (`dataset_id`) REFERENCES `tax_dataset`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`code` text PRIMARY KEY NOT NULL,
	`label_pt` text NOT NULL,
	`label_en` text NOT NULL,
	`iva_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `simulation_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text NOT NULL,
	`session_id` text,
	`user_id` text,
	`lang` text,
	`source` text,
	`dataset_version` integer,
	`params_json` text NOT NULL,
	`revenue` real,
	`winner` text,
	`region` text,
	`municipality_code` text,
	`hourly_rate` real,
	`hours_per_day` real,
	`days_per_year` real,
	`salary` real,
	`country_coarse` text,
	`referrer_host` text
);
--> statement-breakpoint
CREATE TABLE `simulation_result` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`scenario` text NOT NULL,
	`net` real NOT NULL,
	`effective_rate` real NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `simulation_event`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tax_dataset` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`source` text NOT NULL,
	`effective_from` text,
	`checksum` text,
	`payload_json` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
