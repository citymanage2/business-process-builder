CREATE TABLE `errorLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`errorType` varchar(100) NOT NULL,
	`errorMessage` text NOT NULL,
	`stackTrace` text,
	`requestUrl` text,
	`requestMethod` varchar(10),
	`userAgent` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `errorLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `errorLogs` ADD CONSTRAINT `errorLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;