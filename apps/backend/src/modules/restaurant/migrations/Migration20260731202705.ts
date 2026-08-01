import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260731202705 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "restaurant_branch_exception" ("id" text not null, "branch_id" text not null, "title" text not null, "title_i18n_json" jsonb null, "kind" text check ("kind" in ('closed', 'special_hours', 'capacity_override')) not null default 'closed', "starts_at" timestamptz not null, "ends_at" timestamptz not null, "opening_hours_json" jsonb null, "priority" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_branch_exception_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_branch_exception_deleted_at" ON "restaurant_branch_exception" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_delivery_zone" ("id" text not null, "branch_id" text not null, "name" text not null, "name_i18n_json" jsonb null, "sort_order" integer not null default 0, "is_active" boolean not null default true, "geometry_type" text check ("geometry_type" in ('radius_km', 'postal', 'polygon', 'named')) not null default 'named', "geometry_json" jsonb null, "min_order_amount" integer not null default 0, "fee_amount" integer not null default 0, "free_threshold" integer null, "estimated_minutes" integer not null default 30, "schedule_json" jsonb null, "medusa_shipping_option_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_delivery_zone_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_delivery_zone_deleted_at" ON "restaurant_delivery_zone" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_meal" ("id" text not null, "title" text not null, "subtitle" text null, "title_i18n_json" jsonb null, "subtitle_i18n_json" jsonb null, "status" text check ("status" in ('draft', 'published', 'archived')) not null default 'draft', "meal_type" text check ("meal_type" in ('fixed', 'choose', 'mix_match', 'family', 'upgrade', 'seasonal')) not null default 'choose', "pricing_mode" text check ("pricing_mode" in ('fixed', 'from', 'components_discount', 'dynamic')) not null default 'fixed', "base_price" integer not null default 0, "discount_amount" integer null, "product_id" text null, "thumbnail" text null, "badge" text null, "badge_i18n_json" jsonb null, "branch_ids_json" jsonb null, "applies_delivery" boolean not null default true, "applies_pickup" boolean not null default true, "schedule_json" jsonb null, "unavailable_policy" text check ("unavailable_policy" in ('hide_choice', 'show_substitute', 'pause_meal')) not null default 'hide_choice', "max_per_order" integer null, "sort_order" integer not null default 0, "version" integer not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_meal_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_meal_deleted_at" ON "restaurant_meal" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_meal_step" ("id" text not null, "title" text not null, "title_i18n_json" jsonb null, "instruction" text null, "instruction_i18n_json" jsonb null, "sort_order" integer not null default 0, "min_selections" integer not null default 1, "max_selections" integer not null default 1, "allow_repeat" boolean not null default false, "meal_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_meal_step_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_meal_step_meal_id" ON "restaurant_meal_step" ("meal_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_meal_step_deleted_at" ON "restaurant_meal_step" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_meal_step_item" ("id" text not null, "product_id" text not null, "variant_id" text null, "label" text null, "label_i18n_json" jsonb null, "upgrade_price" integer not null default 0, "is_default" boolean not null default false, "substitute_product_id" text null, "sort_order" integer not null default 0, "is_active" boolean not null default true, "step_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_meal_step_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_meal_step_item_step_id" ON "restaurant_meal_step_item" ("step_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_meal_step_item_deleted_at" ON "restaurant_meal_step_item" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_offer" ("id" text not null, "internal_name" text not null, "title" text not null, "title_i18n_json" jsonb null, "description" text null, "description_i18n_json" jsonb null, "terms" text null, "terms_i18n_json" jsonb null, "badge" text null, "badge_i18n_json" jsonb null, "image_url" text null, "banner_url" text null, "cta_label" text null, "cta_href" text null, "status" text check ("status" in ('draft', 'ready', 'scheduled', 'active', 'paused', 'ended', 'archived')) not null default 'draft', "offer_type" text not null default 'percent_order', "code" text null, "auto_apply" boolean not null default false, "exclusive" boolean not null default false, "priority" integer not null default 100, "starts_at" timestamptz null, "ends_at" timestamptz null, "schedule_json" jsonb null, "rules_json" jsonb not null default '{}', "branch_ids_json" jsonb null, "order_types_json" jsonb null, "medusa_promotion_id" text null, "version" integer not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_offer_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_offer_deleted_at" ON "restaurant_offer" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_translation_status" ("id" text not null, "resource_type" text not null, "resource_id" text not null, "locale" text not null, "status" text check ("status" in ('missing', 'draft', 'ready', 'needs_review')) not null default 'missing', "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_translation_status_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_translation_status_deleted_at" ON "restaurant_translation_status" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "restaurant_meal_step" add constraint "restaurant_meal_step_meal_id_foreign" foreign key ("meal_id") references "restaurant_meal" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "restaurant_meal_step_item" add constraint "restaurant_meal_step_item_step_id_foreign" foreign key ("step_id") references "restaurant_meal_step" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "restaurant_branch" add column if not exists "name_i18n_json" jsonb null, add column if not exists "email" text null, add column if not exists "address_i18n_json" jsonb null, add column if not exists "pickup_instructions" text null, add column if not exists "pickup_instructions_i18n_json" jsonb null, add column if not exists "latitude" integer null, add column if not exists "longitude" integer null, add column if not exists "image_url" text null, add column if not exists "delivery_paused" boolean not null default false, add column if not exists "pickup_paused" boolean not null default false, add column if not exists "scheduling_enabled" boolean not null default false, add column if not exists "slot_minutes" integer not null default 15, add column if not exists "max_orders_per_slot" integer null, add column if not exists "schedule_max_days" integer not null default 7;`);

    this.addSql(`alter table if exists "restaurant_branch_resource_availability" add column if not exists "display_mode" text check ("display_mode" in ('hide', 'sold_out', 'visible_disabled')) not null default 'sold_out';`);

    this.addSql(`alter table if exists "restaurant_menu_section" add column if not exists "title_i18n_json" jsonb null, add column if not exists "subtitle_i18n_json" jsonb null, add column if not exists "image_url" text null, add column if not exists "schedule_json" jsonb null;`);

    this.addSql(`alter table if exists "restaurant_menu_product" add column if not exists "badge_i18n_json" jsonb null, add column if not exists "display_title" text null, add column if not exists "display_title_i18n_json" jsonb null, add column if not exists "display_subtitle" text null, add column if not exists "variant_ids_json" jsonb null, add column if not exists "schedule_json" jsonb null;`);

    this.addSql(`alter table if exists "restaurant_settings" add column if not exists "default_currency" text not null default 'bhd', add column if not exists "max_cart_quantity" integer null, add column if not exists "schedule_slot_minutes" integer not null default 15, add column if not exists "schedule_max_days" integer not null default 7, add column if not exists "tip_presets_json" jsonb null, add column if not exists "guest_checkout_enabled" boolean not null default true, add column if not exists "require_phone" boolean not null default true, add column if not exists "require_email" boolean not null default false, add column if not exists "show_sold_out" boolean not null default true, add column if not exists "show_calories" boolean not null default false, add column if not exists "show_allergens" boolean not null default true, add column if not exists "price_display_mode" text check ("price_display_mode" in ('exact', 'from')) not null default 'from', add column if not exists "locale_fallback" text not null default 'ar', add column if not exists "ordering_pause_reason" text null, add column if not exists "ordering_pause_until" timestamptz null, add column if not exists "bag_fee_amount" integer null, add column if not exists "service_fee_amount" integer null, add column if not exists "cancel_grace_minutes" integer null, add column if not exists "overdue_threshold_minutes" integer not null default 15, add column if not exists "readiness_json" jsonb null;`);
    this.addSql(`alter table if exists "restaurant_settings" alter column "schema_version" type integer using ("schema_version"::integer);`);
    this.addSql(`alter table if exists "restaurant_settings" alter column "schema_version" set default 2;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_meal_step" drop constraint if exists "restaurant_meal_step_meal_id_foreign";`);

    this.addSql(`alter table if exists "restaurant_meal_step_item" drop constraint if exists "restaurant_meal_step_item_step_id_foreign";`);

    this.addSql(`drop table if exists "restaurant_branch_exception" cascade;`);

    this.addSql(`drop table if exists "restaurant_delivery_zone" cascade;`);

    this.addSql(`drop table if exists "restaurant_meal" cascade;`);

    this.addSql(`drop table if exists "restaurant_meal_step" cascade;`);

    this.addSql(`drop table if exists "restaurant_meal_step_item" cascade;`);

    this.addSql(`drop table if exists "restaurant_offer" cascade;`);

    this.addSql(`drop table if exists "restaurant_translation_status" cascade;`);

    this.addSql(`alter table if exists "restaurant_branch" drop column if exists "name_i18n_json", drop column if exists "email", drop column if exists "address_i18n_json", drop column if exists "pickup_instructions", drop column if exists "pickup_instructions_i18n_json", drop column if exists "latitude", drop column if exists "longitude", drop column if exists "image_url", drop column if exists "delivery_paused", drop column if exists "pickup_paused", drop column if exists "scheduling_enabled", drop column if exists "slot_minutes", drop column if exists "max_orders_per_slot", drop column if exists "schedule_max_days";`);

    this.addSql(`alter table if exists "restaurant_branch_resource_availability" drop column if exists "display_mode";`);

    this.addSql(`alter table if exists "restaurant_menu_section" drop column if exists "title_i18n_json", drop column if exists "subtitle_i18n_json", drop column if exists "image_url", drop column if exists "schedule_json";`);

    this.addSql(`alter table if exists "restaurant_menu_product" drop column if exists "badge_i18n_json", drop column if exists "display_title", drop column if exists "display_title_i18n_json", drop column if exists "display_subtitle", drop column if exists "variant_ids_json", drop column if exists "schedule_json";`);

    this.addSql(`alter table if exists "restaurant_settings" drop column if exists "default_currency", drop column if exists "max_cart_quantity", drop column if exists "schedule_slot_minutes", drop column if exists "schedule_max_days", drop column if exists "tip_presets_json", drop column if exists "guest_checkout_enabled", drop column if exists "require_phone", drop column if exists "require_email", drop column if exists "show_sold_out", drop column if exists "show_calories", drop column if exists "show_allergens", drop column if exists "price_display_mode", drop column if exists "locale_fallback", drop column if exists "ordering_pause_reason", drop column if exists "ordering_pause_until", drop column if exists "bag_fee_amount", drop column if exists "service_fee_amount", drop column if exists "cancel_grace_minutes", drop column if exists "overdue_threshold_minutes", drop column if exists "readiness_json";`);

    this.addSql(`alter table if exists "restaurant_settings" alter column "schema_version" type integer using ("schema_version"::integer);`);
    this.addSql(`alter table if exists "restaurant_settings" alter column "schema_version" set default 1;`);
  }

}
