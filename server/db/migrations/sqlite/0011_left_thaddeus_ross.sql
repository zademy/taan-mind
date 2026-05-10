CREATE TABLE `chat_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`chat_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`mode` text DEFAULT 'live' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_shares_token_unique_idx` ON `chat_shares` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `chat_shares_chat_id_unique_idx` ON `chat_shares` (`chat_id`);--> statement-breakpoint
CREATE INDEX `chat_shares_owner_user_id_idx` ON `chat_shares` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `chat_shares_active_idx` ON `chat_shares` (`active`);