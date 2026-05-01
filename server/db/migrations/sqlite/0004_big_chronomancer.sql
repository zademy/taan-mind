CREATE TABLE `paperless_documents` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`correspondent` integer,
	`document_type` integer,
	`storage_path` integer,
	`original_file_name` text,
	`mime_type` text,
	`page_count` integer,
	`processed` integer DEFAULT 0 NOT NULL,
	`paperless_created` integer,
	`paperless_modified` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `paperless_docs_processed_idx` ON `paperless_documents` (`processed`);--> statement-breakpoint
CREATE INDEX `paperless_docs_updated_idx` ON `paperless_documents` (`updated_at`);