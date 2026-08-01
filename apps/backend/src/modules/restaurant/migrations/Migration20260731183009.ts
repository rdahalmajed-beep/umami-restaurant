import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260731183009 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "restaurant_menu" ("id" text not null, "title" text not null, "subtitle" text null, "status" text check ("status" in ('draft', 'published', 'archived')) not null default 'draft', "sort_order" integer not null default 0, "applies_delivery" boolean not null default true, "applies_pickup" boolean not null default true, "published_at" timestamptz null, "version" integer not null default 1, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_menu_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_menu_deleted_at" ON "restaurant_menu" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_menu_section" ("id" text not null, "title" text not null, "subtitle" text null, "sort_order" integer not null default 0, "is_active" boolean not null default true, "menu_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_menu_section_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_menu_section_menu_id" ON "restaurant_menu_section" ("menu_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_menu_section_deleted_at" ON "restaurant_menu_section" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_menu_product" ("id" text not null, "product_id" text not null, "sort_order" integer not null default 0, "is_featured" boolean not null default false, "badge" text null, "is_active" boolean not null default true, "section_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_menu_product_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_menu_product_section_id" ON "restaurant_menu_product" ("section_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_menu_product_deleted_at" ON "restaurant_menu_product" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "restaurant_menu_section" add constraint "restaurant_menu_section_menu_id_foreign" foreign key ("menu_id") references "restaurant_menu" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "restaurant_menu_product" add constraint "restaurant_menu_product_section_id_foreign" foreign key ("section_id") references "restaurant_menu_section" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_menu_section" drop constraint if exists "restaurant_menu_section_menu_id_foreign";`);

    this.addSql(`alter table if exists "restaurant_menu_product" drop constraint if exists "restaurant_menu_product_section_id_foreign";`);

    this.addSql(`drop table if exists "restaurant_menu" cascade;`);

    this.addSql(`drop table if exists "restaurant_menu_section" cascade;`);

    this.addSql(`drop table if exists "restaurant_menu_product" cascade;`);
  }

}
