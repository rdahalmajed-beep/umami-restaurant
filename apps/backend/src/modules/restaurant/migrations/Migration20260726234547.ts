import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260726234547 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_modifier_option" add column if not exists "raw_price_adjustment" jsonb not null default '{"value":"0","precision":20}';`);
    this.addSql(`alter table if exists "restaurant_modifier_option" alter column "price_adjustment" type numeric using ("price_adjustment"::numeric);`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_modifier_option" drop column if exists "raw_price_adjustment";`);

    this.addSql(`alter table if exists "restaurant_modifier_option" alter column "price_adjustment" type integer using ("price_adjustment"::integer);`);
  }

}
