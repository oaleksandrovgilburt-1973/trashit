ALTER TABLE `requests` ADD `hasProblem` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `requests` ADD `problemDescription` text;