CREATE TABLE `admin_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL DEFAULT 'admin',
	`passwordHash` varchar(256) NOT NULL,
	`defaultBlocked` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `worker_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` int NOT NULL,
	`deviceToken` varchar(256) NOT NULL,
	`deviceName` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsed` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `worker_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `worker_sessions_deviceToken_unique` UNIQUE(`deviceToken`)
);
--> statement-breakpoint
CREATE TABLE `workers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` varchar(256) NOT NULL,
	`mustChangePassword` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`activeDistricts` json DEFAULT ('[]'),
	`deviceTokens` json DEFAULT ('[]'),
	`createdByAdmin` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp,
	CONSTRAINT `workers_id` PRIMARY KEY(`id`),
	CONSTRAINT `workers_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `workers_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `creditsStandard` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creditsRecycling` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `addressKvartal` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `addressBlok` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `addressVhod` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `addressEtaj` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `addressApartament` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `addressCity` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `isFirstLogin` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `bonusGranted` boolean DEFAULT false NOT NULL;