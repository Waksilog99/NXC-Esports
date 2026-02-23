CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"description" text NOT NULL,
	"image" text,
	"placement" text,
	"game" text
);
--> statement-breakpoint
CREATE TABLE "event_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer,
	"type" text NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"location" text,
	"description" text,
	"status" text DEFAULT 'upcoming',
	"image" text
);
--> statement-breakpoint
CREATE TABLE "player_quota_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"week_start" text NOT NULL,
	"aim_status" text DEFAULT 'pending',
	"grind_status" text DEFAULT 'pending',
	"total_aim_kills" integer DEFAULT 0,
	"total_grind_rg" integer DEFAULT 0,
	"aim_proof" text,
	"grind_proof" text,
	"assigned_base_aim" integer DEFAULT 0,
	"assigned_base_grind" integer DEFAULT 0,
	"punishment_kills" integer DEFAULT 0,
	"punishment_rg" integer DEFAULT 0,
	"carry_over_kills" integer DEFAULT 0,
	"carry_over_rg" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"user_id" integer,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"kda" text,
	"win_rate" text,
	"acs" text,
	"image" text,
	"level" integer DEFAULT 1,
	"xp" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "roster_quotas" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"base_aim_kills" integer DEFAULT 0,
	"base_grind_rg" integer DEFAULT 0,
	"reduced_aim_kills" integer DEFAULT 0,
	"reduced_grind_rg" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roster_quotas_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE "scrim_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"scrim_id" integer,
	"type" text NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scrim_player_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"scrim_id" integer,
	"player_id" integer,
	"kills" integer DEFAULT 0,
	"deaths" integer DEFAULT 0,
	"assists" integer DEFAULT 0,
	"acs" integer DEFAULT 0,
	"is_win" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "scrims" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"date" text NOT NULL,
	"opponent" text NOT NULL,
	"format" text NOT NULL,
	"status" text DEFAULT 'pending',
	"results" text,
	"maps" text
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"logo" text NOT NULL,
	"description" text,
	"website" text
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"manager_id" integer,
	"game" text NOT NULL,
	"logo" text,
	"description" text,
	CONSTRAINT "teams_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tournament_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer,
	"type" text NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tournament_player_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer,
	"player_id" integer,
	"kills" integer DEFAULT 0,
	"deaths" integer DEFAULT 0,
	"assists" integer DEFAULT 0,
	"acs" integer DEFAULT 0,
	"is_win" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"date" text NOT NULL,
	"name" text NOT NULL,
	"opponent" text,
	"format" text NOT NULL,
	"status" text DEFAULT 'pending',
	"results" text,
	"maps" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"fullname" text NOT NULL,
	"google_id" text,
	"avatar" text,
	"role" text DEFAULT 'member',
	"bio" text,
	"games_played" text,
	"achievements" text,
	"birthday" text,
	"created_at" timestamp DEFAULT now(),
	"ign" text,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" text NOT NULL,
	"week_end" text NOT NULL,
	"generated_at" text NOT NULL,
	"report_data" text NOT NULL,
	"pdf_path" text
);
--> statement-breakpoint
ALTER TABLE "event_notifications" ADD CONSTRAINT "event_notifications_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_quota_progress" ADD CONSTRAINT "player_quota_progress_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_quotas" ADD CONSTRAINT "roster_quotas_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrim_notifications" ADD CONSTRAINT "scrim_notifications_scrim_id_scrims_id_fk" FOREIGN KEY ("scrim_id") REFERENCES "public"."scrims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrim_player_stats" ADD CONSTRAINT "scrim_player_stats_scrim_id_scrims_id_fk" FOREIGN KEY ("scrim_id") REFERENCES "public"."scrims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrim_player_stats" ADD CONSTRAINT "scrim_player_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrims" ADD CONSTRAINT "scrims_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_notifications" ADD CONSTRAINT "tournament_notifications_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_player_stats" ADD CONSTRAINT "tournament_player_stats_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_player_stats" ADD CONSTRAINT "tournament_player_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;