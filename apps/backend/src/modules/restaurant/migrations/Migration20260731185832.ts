import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260731185832 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "restaurant_content" drop constraint if exists "restaurant_content_key_locale_unique";`);
    this.addSql(`drop index if exists "IDX_restaurant_content_key_unique";`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_restaurant_content_key_locale_unique" ON "restaurant_content" ("key", "locale") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_restaurant_content_key_locale_unique";`);

    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_restaurant_content_key_unique" ON "restaurant_content" ("key") WHERE deleted_at IS NULL;`);
  }

}
