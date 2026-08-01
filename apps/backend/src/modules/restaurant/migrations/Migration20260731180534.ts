import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260731180534 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "restaurant_branch_resource_availability" ("id" text not null, "branch_id" text not null, "resource_type" text check ("resource_type" in ('product', 'variant', 'modifier_option')) not null, "resource_id" text not null, "available" boolean not null default true, "reason_code" text null, "starts_at" timestamptz null, "ends_at" timestamptz null, "changed_by" text null, "version" integer not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_branch_resource_availability_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_branch_resource_availability_deleted_at" ON "restaurant_branch_resource_availability" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_settings" ("id" text not null, "timezone" text not null default 'Asia/Bahrain', "default_locale" text not null default 'ar', "supported_locales_json" jsonb not null default '["ar","en"]', "default_prep_minutes" integer not null default 20, "max_item_quantity" integer not null default 20, "auto_accept_orders" boolean not null default false, "scheduling_enabled" boolean not null default false, "lead_time_minutes" integer not null default 0, "customer_notes_enabled" boolean not null default true, "tips_enabled" boolean not null default false, "ordering_enabled" boolean not null default true, "schema_version" integer not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_settings_deleted_at" ON "restaurant_settings" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "restaurant_branch" add column if not exists "timezone" text not null default 'Asia/Bahrain', add column if not exists "is_paused" boolean not null default false, add column if not exists "pause_reason" text null, add column if not exists "pause_until" timestamptz null, add column if not exists "prep_override_minutes" integer null, add column if not exists "prep_override_until" timestamptz null, add column if not exists "capacity_orders_per_hour" integer null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "restaurant_branch_resource_availability" cascade;`);

    this.addSql(`drop table if exists "restaurant_settings" cascade;`);

    this.addSql(`alter table if exists "restaurant_branch" drop column if exists "timezone", drop column if exists "is_paused", drop column if exists "pause_reason", drop column if exists "pause_until", drop column if exists "prep_override_minutes", drop column if exists "prep_override_until", drop column if exists "capacity_orders_per_hour";`);
  }

}
