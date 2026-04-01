CREATE TABLE `worker_districts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` int NOT NULL,
	`workerOpenId` varchar(64) NOT NULL,
	`districtName` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `worker_districts_id` PRIMARY KEY(`id`)
);
