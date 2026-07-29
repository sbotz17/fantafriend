CREATE TABLE "auction_live_state" (
	"league_id" uuid PRIMARY KEY NOT NULL,
	"player_name" text NOT NULL,
	"current_bid" integer,
	"matched_player_id" uuid,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auction_live_state" ADD CONSTRAINT "auction_live_state_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_live_state" ADD CONSTRAINT "auction_live_state_matched_player_id_players_id_fk" FOREIGN KEY ("matched_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_live_state" ADD CONSTRAINT "auction_live_state_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;