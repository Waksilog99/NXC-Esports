ALTER TABLE "orders" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "scrim_player_stats" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "tournament_player_stats" ADD COLUMN "role" text;