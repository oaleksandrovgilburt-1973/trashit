CREATE TABLE `districts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `districts_id` PRIMARY KEY(`id`),
	CONSTRAINT `districts_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('standard','recycling','nonstandard','construction') NOT NULL,
	`status` enum('pending','assigned','completed','cancelled') NOT NULL DEFAULT 'pending',
	`userId` int NOT NULL,
	`userOpenId` varchar(64) NOT NULL,
	`description` text,
	`district` varchar(128) NOT NULL,
	`blok` varchar(64) NOT NULL,
	`vhod` varchar(32) NOT NULL,
	`etaj` varchar(16) NOT NULL,
	`apartament` varchar(16) NOT NULL,
	`contactPhone` varchar(32),
	`contactEmail` varchar(320),
	`gpsLat` decimal(10,7),
	`gpsLng` decimal(10,7),
	`imageUrl` text,
	`estimatedVolume` varchar(64),
	`estimatedVolumeDescription` text,
	`creditsUsed` decimal(10,2) NOT NULL DEFAULT '0.00',
	`creditType` enum('standard','recycling','none') NOT NULL DEFAULT 'none',
	`workerId` int,
	`workerOpenId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `requests_id` PRIMARY KEY(`id`)
);
