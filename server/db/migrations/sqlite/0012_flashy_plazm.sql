CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_user_id_idx` ON `projects` (`user_id`);--> statement-breakpoint
CREATE INDEX `projects_created_at_idx` ON `projects` (`created_at`);--> statement-breakpoint
ALTER TABLE `chats` ADD `project_id` text REFERENCES projects(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `chats_project_id_idx` ON `chats` (`project_id`);
