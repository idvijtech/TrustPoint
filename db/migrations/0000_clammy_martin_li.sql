CREATE TABLE IF NOT EXISTS "access_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"device_id" integer,
	"event_type" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"permissions" jsonb,
	"department" text,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"action" text NOT NULL,
	"details" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"ip" text NOT NULL,
	"port" integer DEFAULT 80 NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"location" text,
	"status" text DEFAULT 'offline' NOT NULL,
	"last_connection" timestamp,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"admin_id" integer,
	"file_id" integer,
	"event_id" integer,
	"action" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content" text,
	"event_date" date NOT NULL,
	"department" text,
	"tags" text[],
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"storage_type" text DEFAULT 'local' NOT NULL,
	"event_id" integer,
	"visibility" text DEFAULT 'private' NOT NULL,
	"password" text,
	"expiry_date" timestamp,
	"views" integer DEFAULT 0 NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"watermark_enabled" boolean DEFAULT false NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"admin_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer NOT NULL,
	"group_id" integer,
	"admin_id" integer,
	"can_view" boolean DEFAULT true NOT NULL,
	"can_download" boolean DEFAULT false NOT NULL,
	"can_share" boolean DEFAULT false NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"granted_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_share_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer NOT NULL,
	"token" text NOT NULL,
	"password" text,
	"expiry_date" timestamp,
	"max_views" integer,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	CONSTRAINT "media_share_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"department" text,
	"position" text,
	"biometric_id" text,
	"card_number" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	CONSTRAINT "users_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "access_events" ADD CONSTRAINT "access_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "access_events" ADD CONSTRAINT "access_events_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admins" ADD CONSTRAINT "admins_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "devices" ADD CONSTRAINT "devices_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_activity_logs" ADD CONSTRAINT "media_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_activity_logs" ADD CONSTRAINT "media_activity_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_activity_logs" ADD CONSTRAINT "media_activity_logs_file_id_media_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media_files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_activity_logs" ADD CONSTRAINT "media_activity_logs_event_id_media_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."media_events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_events" ADD CONSTRAINT "media_events_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_files" ADD CONSTRAINT "media_files_event_id_media_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."media_events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploaded_by_admins_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_group_members" ADD CONSTRAINT "media_group_members_group_id_media_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."media_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_group_members" ADD CONSTRAINT "media_group_members_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_group_members" ADD CONSTRAINT "media_group_members_added_by_admins_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_groups" ADD CONSTRAINT "media_groups_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_permissions" ADD CONSTRAINT "media_permissions_file_id_media_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media_files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_permissions" ADD CONSTRAINT "media_permissions_group_id_media_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."media_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_permissions" ADD CONSTRAINT "media_permissions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_permissions" ADD CONSTRAINT "media_permissions_granted_by_admins_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_share_links" ADD CONSTRAINT "media_share_links_file_id_media_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media_files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_share_links" ADD CONSTRAINT "media_share_links_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
