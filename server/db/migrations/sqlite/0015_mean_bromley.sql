CREATE TABLE `ai_usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`chat_id` text,
	`document_id` integer,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`operation` text NOT NULL,
	`usage_available` integer DEFAULT false NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`total_tokens` integer,
	`no_cache_tokens` integer,
	`cache_read_tokens` integer,
	`cache_write_tokens` integer,
	`text_tokens` integer,
	`reasoning_tokens` integer,
	`finish_reason` text,
	`provider_response_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`document_id`) REFERENCES `paperless_documents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_usage_events_user_created_at_idx` ON `ai_usage_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_usage_events_created_at_idx` ON `ai_usage_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `ai_usage_events_model_created_at_idx` ON `ai_usage_events` (`model`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_usage_events_provider_created_at_idx` ON `ai_usage_events` (`provider`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_usage_events_operation_created_at_idx` ON `ai_usage_events` (`operation`,`created_at`);