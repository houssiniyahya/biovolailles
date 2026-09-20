DROP TABLE `transformation_batches`;--> statement-breakpoint
CREATE TABLE `transformation_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`upstream_type` text NOT NULL,
	`upstream_id` text NOT NULL,
	`process_type` text NOT NULL,
	`input_quantity` real NOT NULL,
	`output_quantity` real NOT NULL,
	`losses` real NOT NULL,
	`rejects` real DEFAULT 0 NOT NULL,
	`occurred_at` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`actor_id` text,
	`data_status` text NOT NULL,
	`measurement_method` text,
	`device_id` text,
	`document_id` text,
	`validation_status` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transformation_batches_code_unique` ON `transformation_batches` (`code`);--> statement-breakpoint
ALTER TABLE `collections` ADD `code` text NOT NULL;--> statement-breakpoint
ALTER TABLE `collections` ADD `source_type` text NOT NULL;--> statement-breakpoint
ALTER TABLE `collections` ADD `source_id` text;--> statement-breakpoint
ALTER TABLE `collections` ADD `actor_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `collections` ADD `measurement_method` text;--> statement-breakpoint
ALTER TABLE `collections` ADD `device_id` text;--> statement-breakpoint
ALTER TABLE `collections` ADD `document_id` text;--> statement-breakpoint
ALTER TABLE `collections` ADD `validation_status` text;--> statement-breakpoint
ALTER TABLE `collections` ADD `created_at` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `collections_code_unique` ON `collections` (`code`);--> statement-breakpoint
ALTER TABLE `destinations` ADD `code` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `destinations_code_unique` ON `destinations` (`code`);--> statement-breakpoint
ALTER TABLE `products` ADD `source_type` text NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `source_id` text;--> statement-breakpoint
ALTER TABLE `products` ADD `actor_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `products` ADD `measurement_method` text;--> statement-breakpoint
ALTER TABLE `products` ADD `device_id` text;--> statement-breakpoint
ALTER TABLE `products` ADD `document_id` text;--> statement-breakpoint
ALTER TABLE `products` ADD `validation_status` text;--> statement-breakpoint
ALTER TABLE `products` ADD `created_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `slaughter_batches` ADD `code` text NOT NULL;--> statement-breakpoint
ALTER TABLE `slaughter_batches` ADD `source_type` text NOT NULL;--> statement-breakpoint
ALTER TABLE `slaughter_batches` ADD `source_id` text;--> statement-breakpoint
ALTER TABLE `slaughter_batches` ADD `actor_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `slaughter_batches` ADD `measurement_method` text;--> statement-breakpoint
ALTER TABLE `slaughter_batches` ADD `device_id` text;--> statement-breakpoint
ALTER TABLE `slaughter_batches` ADD `document_id` text;--> statement-breakpoint
ALTER TABLE `slaughter_batches` ADD `validation_status` text;--> statement-breakpoint
ALTER TABLE `slaughter_batches` ADD `created_at` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `slaughter_batches_code_unique` ON `slaughter_batches` (`code`);
