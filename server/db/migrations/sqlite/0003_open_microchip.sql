DROP TABLE `users`;--> statement-breakpoint
DROP TABLE `votes`;--> statement-breakpoint
ALTER TABLE `chats` ADD `personality` text DEFAULT 'friendly' NOT NULL;