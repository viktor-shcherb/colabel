CREATE TABLE "invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"email" text,
	"name" text,
	"role" text DEFAULT 'annotator' NOT NULL,
	"project_id" uuid,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;