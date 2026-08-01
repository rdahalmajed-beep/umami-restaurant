import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260731185522 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_integration_outbox" drop constraint if exists "restaurant_integration_outbox_idempotency_key_unique";`);
    this.addSql(`alter table if exists "restaurant_content" drop constraint if exists "restaurant_content_key_unique";`);
    this.addSql(`create table if not exists "restaurant_audit_log" ("id" text not null, "actor_id" text null, "actor_role" text null, "action" text not null, "resource_type" text not null, "resource_id" text null, "before_json" jsonb null, "after_json" jsonb null, "reason" text null, "correlation_id" text null, "ip" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_audit_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_audit_log_deleted_at" ON "restaurant_audit_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_branch_fulfillment_policy" ("id" text not null, "branch_id" text not null, "order_type" text check ("order_type" in ('delivery', 'pickup')) not null, "min_order_amount" integer not null default 0, "flat_fee" integer null, "free_threshold" integer null, "estimated_minutes" integer not null default 30, "lead_time_minutes" integer not null default 0, "is_paused" boolean not null default false, "zone_notes_json" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_branch_fulfillment_policy_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_branch_fulfillment_policy_deleted_at" ON "restaurant_branch_fulfillment_policy" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_content" ("id" text not null, "key" text not null, "locale" text not null default 'ar', "content_json" jsonb not null, "schema_version" integer not null default 1, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_content_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_restaurant_content_key_unique" ON "restaurant_content" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_content_deleted_at" ON "restaurant_content" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_integration_outbox" ("id" text not null, "event_type" text not null, "payload_json" jsonb not null, "status" text check ("status" in ('pending', 'sent', 'failed', 'dead')) not null default 'pending', "attempts" integer not null default 0, "last_error" text null, "idempotency_key" text not null, "next_attempt_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_integration_outbox_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_restaurant_integration_outbox_idempotency_key_unique" ON "restaurant_integration_outbox" ("idempotency_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_integration_outbox_deleted_at" ON "restaurant_integration_outbox" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "restaurant_menu" add column if not exists "title_i18n_json" jsonb null, add column if not exists "subtitle_i18n_json" jsonb null, add column if not exists "branch_ids_json" jsonb null, add column if not exists "schedule_json" jsonb null;`);

    this.addSql(`alter table if exists "restaurant_product_modifier_group" add column if not exists "is_required_override" boolean null, add column if not exists "min_selections_override" integer null, add column if not exists "max_selections_override" integer null, add column if not exists "variant_ids_json" jsonb null, add column if not exists "branch_ids_json" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "restaurant_audit_log" cascade;`);

    this.addSql(`drop table if exists "restaurant_branch_fulfillment_policy" cascade;`);

    this.addSql(`drop table if exists "restaurant_content" cascade;`);

    this.addSql(`drop table if exists "restaurant_integration_outbox" cascade;`);

    this.addSql(`alter table if exists "restaurant_menu" drop column if exists "title_i18n_json", drop column if exists "subtitle_i18n_json", drop column if exists "branch_ids_json", drop column if exists "schedule_json";`);

    this.addSql(`alter table if exists "restaurant_product_modifier_group" drop column if exists "is_required_override", drop column if exists "min_selections_override", drop column if exists "max_selections_override", drop column if exists "variant_ids_json", drop column if exists "branch_ids_json";`);
  }

}
