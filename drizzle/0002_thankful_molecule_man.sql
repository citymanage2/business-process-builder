CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `interviews` MODIFY COLUMN `status` enum('draft','in_progress','completed','failed') NOT NULL DEFAULT 'in_progress';--> statement-breakpoint
ALTER TABLE `companies` ADD `businessModel` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `clientSegments` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `keyProducts` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `regions` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `seasonality` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `strategicGoals` text;--> statement-breakpoint
ALTER TABLE `interviews` ADD `interviewType` enum('voice','form_full','form_short') DEFAULT 'voice' NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `answers` text;--> statement-breakpoint
ALTER TABLE `interviews` ADD `progress` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;