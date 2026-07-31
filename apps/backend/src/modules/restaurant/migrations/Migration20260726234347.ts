import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260726234347 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_branch" drop constraint if exists "restaurant_branch_slug_unique";`);
    this.addSql(`create table if not exists "restaurant_branch" ("id" text not null, "name" text not null, "slug" text not null, "phone" text null, "address" text null, "is_active" boolean not null default true, "accepts_delivery" boolean not null default true, "accepts_pickup" boolean not null default true, "preparation_minutes" integer not null default 20, "opening_hours_json" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_branch_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_restaurant_branch_slug_unique" ON "restaurant_branch" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_branch_deleted_at" ON "restaurant_branch" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_modifier_group" ("id" text not null, "name" text not null, "selection_type" text check ("selection_type" in ('single', 'multiple')) not null default 'single', "is_required" boolean not null default false, "min_selections" integer not null default 0, "max_selections" integer not null default 1, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_modifier_group_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_modifier_group_deleted_at" ON "restaurant_modifier_group" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_modifier_option" ("id" text not null, "name" text not null, "price_adjustment" integer not null default 0, "is_default" boolean not null default false, "is_active" boolean not null default true, "sort_order" integer not null default 0, "group_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_modifier_option_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_modifier_option_group_id" ON "restaurant_modifier_option" ("group_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_modifier_option_deleted_at" ON "restaurant_modifier_option" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_product_modifier_group" ("id" text not null, "product_id" text not null, "sort_order" integer not null default 0, "modifier_group_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_product_modifier_group_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_product_modifier_group_modifier_group_id" ON "restaurant_product_modifier_group" ("modifier_group_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_product_modifier_group_deleted_at" ON "restaurant_product_modifier_group" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "restaurant_modifier_option" add constraint "restaurant_modifier_option_group_id_foreign" foreign key ("group_id") references "restaurant_modifier_group" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "restaurant_product_modifier_group" add constraint "restaurant_product_modifier_group_modifier_group_id_foreign" foreign key ("modifier_group_id") references "restaurant_modifier_group" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_modifier_option" drop constraint if exists "restaurant_modifier_option_group_id_foreign";`);

    this.addSql(`alter table if exists "restaurant_product_modifier_group" drop constraint if exists "restaurant_product_modifier_group_modifier_group_id_foreign";`);

    this.addSql(`drop table if exists "restaurant_branch" cascade;`);

    this.addSql(`drop table if exists "restaurant_modifier_group" cascade;`);

    this.addSql(`drop table if exists "restaurant_modifier_option" cascade;`);

    this.addSql(`drop table if exists "restaurant_product_modifier_group" cascade;`);
  }

}
