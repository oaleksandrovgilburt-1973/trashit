CREATE TABLE `worker_problems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` int NOT NULL,
	`workerOpenId` varchar(64) NOT NULL,
	`workerName` varchar(128),
	`requestId` int,
	`imageUrl` text,
	`description` text NOT NULL,
	`status` enum('open','resolved','forwarded') NOT NULL DEFAULT 'open',
	`adminNotes` text,
	`forwardedToClientAt` timestamp,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `worker_problems_id` PRIMARY KEY(`id`)
);
