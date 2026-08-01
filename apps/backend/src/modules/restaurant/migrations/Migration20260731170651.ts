import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260731170651 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_order" add column if not exists "version" integer not null default 1;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_order" drop column if exists "version";`);
  }

}
