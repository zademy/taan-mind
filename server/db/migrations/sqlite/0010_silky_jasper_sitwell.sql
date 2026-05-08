ALTER TABLE `chats` ADD `document_id` integer;
--> statement-breakpoint
CREATE TABLE `chat_documents` (
	`chat_id` text NOT NULL,
	`document_id` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`chat_id`, `document_id`),
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `paperless_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_documents_chat_id_idx` ON `chat_documents` (`chat_id`);--> statement-breakpoint
CREATE INDEX `chat_documents_document_id_idx` ON `chat_documents` (`document_id`);
--> statement-breakpoint
INSERT INTO `chat_documents` (`chat_id`, `document_id`, `position`, `created_at`)
SELECT `chats`.`id`, `chats`.`document_id`, 0, `chats`.`created_at`
FROM `chats`
INNER JOIN `paperless_documents` ON `paperless_documents`.`id` = `chats`.`document_id`
WHERE `chats`.`document_id` IS NOT NULL;
