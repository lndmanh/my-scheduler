CREATE TABLE `courses` (
	`id` integer PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`name` text NOT NULL,
	`instructor` text NOT NULL,
	`credits` integer NOT NULL,
	`room` text NOT NULL,
	`day` text NOT NULL,
	`session` integer NOT NULL,
	`course_type` text DEFAULT 'theory' NOT NULL,
	`study_group` text,
	`code` text,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `credentials` (
	`user_id` integer NOT NULL,
	`id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer NOT NULL,
	`backed_up` integer NOT NULL,
	`transports` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credentials_id_unique` ON `credentials` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `credentials_user_id_id_unique` ON `credentials` (`user_id`,`id`);--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'My Schedule' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`session_number` integer NOT NULL,
	`start_time` text NOT NULL,
	`duration` integer NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_config_schedule_id_session_number_unique` ON `sessions_config` (`schedule_id`,`session_number`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`last_login_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);