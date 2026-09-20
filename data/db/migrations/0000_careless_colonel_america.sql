CREATE TABLE `actions` (
	`id` text PRIMARY KEY NOT NULL,
	`alert_id` text,
	`lot_id` text,
	`action_type` text NOT NULL,
	`description` text NOT NULL,
	`actor_id` text NOT NULL,
	`performed_at` text NOT NULL,
	FOREIGN KEY (`alert_id`) REFERENCES `alerts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`anomaly_id` text NOT NULL,
	`status` text NOT NULL,
	`assigned_to` text,
	`raised_at` text NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`anomaly_id`) REFERENCES `anomalies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `anomalies` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_id` text NOT NULL,
	`measurement_id` text,
	`kpi_value_id` text,
	`lot_id` text,
	`building_id` text,
	`severity` text NOT NULL,
	`explanation` text NOT NULL,
	`detected_at` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`rule_id`) REFERENCES `rules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`measurement_id`) REFERENCES `measurements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`kpi_value_id`) REFERENCES `kpi_values`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`field` text,
	`old_value` text,
	`new_value` text,
	`reason` text,
	`related_lot_id` text,
	`related_event_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`related_lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`related_event_id`) REFERENCES `lot_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `buildings` (
	`id` text PRIMARY KEY NOT NULL,
	`farm_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`capacity` integer NOT NULL,
	`zone_type` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`lot_id` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`destination_id` text,
	`collected_at` text NOT NULL,
	`data_status` text NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cooperatives` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`region` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `destinations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`city` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`installed_at` text NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `farms` (
	`id` text PRIMARY KEY NOT NULL,
	`producer_id` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`region` text NOT NULL,
	`geo_lat` real,
	`geo_lng` real,
	`created_at` text NOT NULL,
	FOREIGN KEY (`producer_id`) REFERENCES `producers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kpi_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`unit` text NOT NULL,
	`formula_desc` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kpi_definitions_code_unique` ON `kpi_definitions` (`code`);--> statement-breakpoint
CREATE TABLE `kpi_values` (
	`id` text PRIMARY KEY NOT NULL,
	`kpi_definition_id` text NOT NULL,
	`lot_id` text,
	`building_id` text,
	`period` text NOT NULL,
	`value` real NOT NULL,
	`data_status` text NOT NULL,
	`calculated_at` text NOT NULL,
	FOREIGN KEY (`kpi_definition_id`) REFERENCES `kpi_definitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lot_events` (
	`id` text PRIMARY KEY NOT NULL,
	`lot_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`occurred_at` text NOT NULL,
	`actor_id` text,
	`data_status` text NOT NULL,
	`source_type` text,
	`source_id` text,
	`device_id` text,
	`measurement_method` text,
	`validation_status` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lots` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`code` text NOT NULL,
	`species` text NOT NULL,
	`breed` text NOT NULL,
	`status` text NOT NULL,
	`initial_population` integer NOT NULL,
	`current_population` integer NOT NULL,
	`planned_start_at` text,
	`started_at` text,
	`ended_at` text,
	`data_status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`sensor_id` text NOT NULL,
	`lot_id` text,
	`value` real NOT NULL,
	`captured_at` text NOT NULL,
	`data_status` text NOT NULL,
	`source_type` text NOT NULL,
	FOREIGN KEY (`sensor_id`) REFERENCES `sensors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `producers` (
	`id` text PRIMARY KEY NOT NULL,
	`cooperative_id` text NOT NULL,
	`name` text NOT NULL,
	`contact_phone` text,
	`contact_email` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`cooperative_id`) REFERENCES `cooperatives`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`transformation_batch_id` text NOT NULL,
	`packaging_date` text NOT NULL,
	`expiry_date` text,
	`data_status` text NOT NULL,
	FOREIGN KEY (`transformation_batch_id`) REFERENCES `transformation_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_code_unique` ON `products` (`code`);--> statement-breakpoint
CREATE TABLE `qr_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`scope` text NOT NULL,
	`lot_id` text,
	`product_id` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qr_tokens_token_unique` ON `qr_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `relations` (
	`id` text PRIMARY KEY NOT NULL,
	`from_type` text NOT NULL,
	`from_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`to_type` text NOT NULL,
	`to_id` text NOT NULL,
	`metadata` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target` text NOT NULL,
	`condition` text NOT NULL,
	`severity` text NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sanitary_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`lot_id` text NOT NULL,
	`status` text NOT NULL,
	`notes` text NOT NULL,
	`observed_by` text NOT NULL,
	`observed_at` text NOT NULL,
	`validated_by` text,
	`validation_status` text NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`observed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`validated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sensors` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`sensor_type` text NOT NULL,
	`unit` text NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `slaughter_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`source_lot_id` text NOT NULL,
	`quantity_in` real NOT NULL,
	`quantity_out` real NOT NULL,
	`losses` real NOT NULL,
	`slaughtered_at` text NOT NULL,
	`data_status` text NOT NULL,
	FOREIGN KEY (`source_lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transformation_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`process_type` text NOT NULL,
	`input_quantity` real NOT NULL,
	`output_quantity` real NOT NULL,
	`losses` real NOT NULL,
	`occurred_at` text NOT NULL,
	`data_status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);