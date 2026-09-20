ALTER TABLE `devices` ADD `last_communication_at` text;--> statement-breakpoint
ALTER TABLE `devices` ADD `battery_level` integer;--> statement-breakpoint
ALTER TABLE `devices` ADD `signal_quality` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `devices_code_unique` ON `devices` (`code`);--> statement-breakpoint
ALTER TABLE `measurements` ADD `building_id` text NOT NULL REFERENCES buildings(id);--> statement-breakpoint
ALTER TABLE `measurements` ADD `unit` text NOT NULL;--> statement-breakpoint
ALTER TABLE `measurements` ADD `source_id` text;--> statement-breakpoint
ALTER TABLE `measurements` ADD `actor_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `measurements` ADD `measurement_method` text;--> statement-breakpoint
ALTER TABLE `measurements` ADD `device_id` text NOT NULL REFERENCES devices(id);--> statement-breakpoint
ALTER TABLE `measurements` ADD `document_id` text;--> statement-breakpoint
ALTER TABLE `measurements` ADD `validation_status` text;--> statement-breakpoint
ALTER TABLE `measurements` ADD `created_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `sensors` ADD `status` text NOT NULL;--> statement-breakpoint
ALTER TABLE `sensors` ADD `configuration` text;