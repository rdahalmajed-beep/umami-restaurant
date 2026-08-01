import { z } from "zod"

/** Typed opening-hours JSON for restaurant branches (string or interval list). */
export const OpeningHoursJsonSchema = z
  .record(
    z.string(),
    z.union([
      z.string(),
      z.array(
        z.object({
          open: z.string(),
          close: z.string(),
        })
      ),
    ])
  )
  .nullable()
  .optional()

export type OpeningHoursJson = z.infer<typeof OpeningHoursJsonSchema>
