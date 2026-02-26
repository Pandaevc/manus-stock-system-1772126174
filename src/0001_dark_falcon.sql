CREATE TABLE `analysis_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(16) NOT NULL,
	`stockName` varchar(64) NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`result` json,
	`summary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analysis_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitor_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`positionId` int NOT NULL,
	`code` varchar(16) NOT NULL,
	`stockName` varchar(64) NOT NULL,
	`signalType` enum('clear','reduce','buy','hold') NOT NULL,
	`signalReason` text NOT NULL,
	`triggerPrice` decimal(12,4),
	`indicators` json,
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monitor_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(16) NOT NULL,
	`stockName` varchar(64) NOT NULL,
	`buyPrice` decimal(12,4) NOT NULL,
	`buyDate` date NOT NULL,
	`quantity` int NOT NULL,
	`currentPrice` decimal(12,4),
	`profitPct` decimal(8,2),
	`status` enum('holding','closed') NOT NULL DEFAULT 'holding',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `selection_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchDate` date NOT NULL,
	`code` varchar(16) NOT NULL,
	`stockName` varchar(64) NOT NULL,
	`score` decimal(8,2),
	`chipConcentration90` decimal(8,4),
	`chipConcentration70` decimal(8,4),
	`blockHighCount` int,
	`cciValue` decimal(10,4),
	`followSignal` varchar(32),
	`buySignal` int DEFAULT 0,
	`capitalSignal` varchar(64),
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `selection_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_daily` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`tradeDate` date NOT NULL,
	`open` decimal(12,4) NOT NULL,
	`high` decimal(12,4) NOT NULL,
	`low` decimal(12,4) NOT NULL,
	`close` decimal(12,4) NOT NULL,
	`volume` bigint NOT NULL,
	`amount` decimal(20,2) NOT NULL,
	`turnover` decimal(10,4),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_daily_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(64) NOT NULL,
	`market` varchar(8) NOT NULL,
	`industry` varchar(64),
	`marketCap` decimal(20,2),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `stocks_code_unique` UNIQUE(`code`)
);
