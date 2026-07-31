import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260727001032 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_order" drop constraint if exists "restaurant_order_order_id_unique";`);
    this.addSql(`create table if not exists "restaurant_order" ("id" text not null, "order_id" text not null, "status" text check ("status" in ('received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')) not null default 'received', "order_type" text check ("order_type" in ('delivery', 'pickup')) null, "branch_id" text null, "last_transition_at" timestamptz null, "last_transition_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_restaurant_order_order_id_unique" ON "restaurant_order" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_order_deleted_at" ON "restaurant_order" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "restaurant_order_status_event" ("id" text not null, "from_status" text null, "to_status" text not null, "changed_by" text null, "note" text null, "restaurant_order_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restaurant_order_status_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_order_status_event_restaurant_order_id" ON "restaurant_order_status_event" ("restaurant_order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restaurant_order_status_event_deleted_at" ON "restaurant_order_status_event" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "restaurant_order_status_event" add constraint "restaurant_order_status_event_restaurant_order_id_foreign" foreign key ("restaurant_order_id") references "restaurant_order" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_order_status_event" drop constraint if exists "restaurant_order_status_event_restaurant_order_id_foreign";`);

    this.addSql(`drop table if exists "restaurant_order" cascade;`);

    this.addSql(`drop table if exists "restaurant_order_status_event" cascade;`);
  }

}
