CREATE TABLE `businessProcesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`interviewId` int,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','in_review','approved') NOT NULL DEFAULT 'draft',
	`title` varchar(500) NOT NULL,
	`description` text,
	`startEvent` text,
	`endEvent` text,
	`stages` text,
	`roles` text,
	`steps` text,
	`branches` text,
	`documents` text,
	`itIntegration` text,
	`diagramData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessProcesses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessProcessId` int NOT NULL,
	`userId` int NOT NULL,
	`stepId` varchar(100),
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`industry` varchar(255),
	`region` varchar(255),
	`format` enum('B2B','B2C','mixed'),
	`averageCheck` varchar(100),
	`productsServices` text,
	`itSystems` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`status` enum('in_progress','completed','failed') NOT NULL DEFAULT 'in_progress',
	`audioUrl` text,
	`transcript` text,
	`structuredData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessProcessId` int NOT NULL,
	`category` enum('optimization','automation','risk','metric') NOT NULL,
	`priority` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`title` varchar(500) NOT NULL,
	`description` text,
	`toolsSuggested` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `businessProcesses` ADD CONSTRAINT `businessProcesses_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `businessProcesses` ADD CONSTRAINT `businessProcesses_interviewId_interviews_id_fk` FOREIGN KEY (`interviewId`) REFERENCES `interviews`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_businessProcessId_businessProcesses_id_fk` FOREIGN KEY (`businessProcessId`) REFERENCES `businessProcesses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `companies` ADD CONSTRAINT `companies_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interviews` ADD CONSTRAINT `interviews_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_businessProcessId_businessProcesses_id_fk` FOREIGN KEY (`businessProcessId`) REFERENCES `businessProcesses`(`id`) ON DELETE cascade ON UPDATE no action;