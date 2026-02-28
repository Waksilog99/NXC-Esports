CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"product_id" integer,
	"recipient_name" text NOT NULL,
	"delivery_address" text NOT NULL,
	"contact_number" text NOT NULL,
	"payment_method" text NOT NULL,
	"payment_proof_url" text,
	"status" text DEFAULT 'For Payment Verification',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "playbook_strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"title" text NOT NULL,
	"map" text,
	"category" text,
	"side" text,
	"priority" text DEFAULT 'medium',
	"content" text,
	"notes" text,
	"images" text,
	"references" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"sponsor_id" integer,
	"image_url" text NOT NULL,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"waks_qr_ewallet" text,
	"waks_qr_bank" text
);
--> statement-breakpoint
ALTER TABLE "scrim_player_stats" ADD COLUMN "agent" text;--> statement-breakpoint
ALTER TABLE "scrim_player_stats" ADD COLUMN "map" text;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "qr_ewallet" text;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "qr_bank" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_strategies" ADD CONSTRAINT "playbook_strategies_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;