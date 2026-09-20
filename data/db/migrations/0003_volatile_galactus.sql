ALTER TABLE `anomalies` ADD `observed_value` real;--> statement-breakpoint
ALTER TABLE `anomalies` ADD `reference_value` real;--> statement-breakpoint
ALTER TABLE `anomalies` ADD `deviation_percent` real;--> statement-breakpoint
ALTER TABLE `anomalies` ADD `unit` text;--> statement-breakpoint
ALTER TABLE `anomalies` ADD `confidence` text NOT NULL;--> statement-breakpoint
ALTER TABLE `rules` ADD `description` text NOT NULL;--> statement-breakpoint
ALTER TABLE `rules` ADD `explanation_template` text NOT NULL;