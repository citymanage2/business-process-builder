CREATE TABLE `faq_articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`keywords` text NOT NULL,
	`category` varchar(100),
	`order` int NOT NULL DEFAULT 0,
	`is_published` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faq_articles_id` PRIMARY KEY(`id`)
);
