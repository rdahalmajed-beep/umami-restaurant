import { z } from "zod"

/** Allow-listed CMS block schema (CMS-001). No arbitrary HTML/scripts. */
export const BrandContentSchema = z.object({
  brand_name: z.string().max(120).optional(),
  logo_url: z.string().url().optional().nullable(),
  favicon_url: z.string().url().optional().nullable(),
  hero: z
    .object({
      title: z.string().max(200),
      subtitle: z.string().max(400).optional(),
      media_url: z.string().url().optional().nullable(),
      cta_label: z.string().max(80).optional(),
      cta_href: z.string().max(300).optional(),
    })
    .optional(),
  announcement: z
    .object({
      enabled: z.boolean(),
      text: z.string().max(300),
    })
    .optional(),
  contact: z
    .object({
      phone: z.string().max(40).optional(),
      email: z.string().email().optional(),
      address: z.string().max(300).optional(),
      instagram: z.string().max(200).optional(),
      whatsapp: z.string().max(40).optional(),
    })
    .optional(),
  seo: z
    .object({
      title: z.string().max(120).optional(),
      description: z.string().max(300).optional(),
      social_image_url: z.string().url().optional().nullable(),
    })
    .optional(),
  legal: z
    .object({
      terms_url: z.string().url().optional().nullable(),
      privacy_url: z.string().url().optional().nullable(),
    })
    .optional(),
})

export type BrandContent = z.infer<typeof BrandContentSchema>
