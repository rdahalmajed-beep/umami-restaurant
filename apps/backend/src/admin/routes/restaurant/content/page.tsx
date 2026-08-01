import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

const emptyForm = () => ({
  brandName: "",
  logoUrl: "",
  heroTitle: "",
  heroSubtitle: "",
  announcement: "",
  phone: "",
  email: "",
  whatsapp: "",
  instagram: "",
  seoTitle: "",
  seoDescription: "",
  termsUrl: "",
  privacyUrl: "",
})

const ContentPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [locale, setLocale] = useState("ar")
  const [form, setForm] = useState(emptyForm())

  const clearForm = () => setForm(emptyForm())

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-content", locale],
    queryFn: async () => {
      const res = await fetch(
        `/admin/restaurant/content?key=brand&locale=${locale}`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error(t("restaurant.content.loadError"))
      return (await res.json()) as {
        content: { content_json?: Record<string, unknown> }
      }
    },
  })

  useEffect(() => {
    clearForm()
  }, [locale])

  useEffect(() => {
    const c = (data?.content?.content_json || {}) as {
      brand_name?: string
      logo_url?: string | null
      hero?: { title?: string; subtitle?: string }
      announcement?: { text?: string }
      contact?: {
        phone?: string
        email?: string
        whatsapp?: string
        instagram?: string
      }
      seo?: { title?: string; description?: string }
      legal?: { terms_url?: string | null; privacy_url?: string | null }
    }
    setForm({
      brandName: c.brand_name || "",
      logoUrl: c.logo_url || "",
      heroTitle: c.hero?.title || "",
      heroSubtitle: c.hero?.subtitle || "",
      announcement: c.announcement?.text || "",
      phone: c.contact?.phone || "",
      email: c.contact?.email || "",
      whatsapp: c.contact?.whatsapp || "",
      instagram: c.contact?.instagram || "",
      seoTitle: c.seo?.title || "",
      seoDescription: c.seo?.description || "",
      termsUrl: c.legal?.terms_url || "",
      privacyUrl: c.legal?.privacy_url || "",
    })
  }, [data])

  const setField = (key: keyof ReturnType<typeof emptyForm>, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const save = useMutation({
    mutationFn: async () => {
      const content: Record<string, unknown> = {
        brand_name: form.brandName,
        hero: {
          title: form.heroTitle || form.brandName,
          subtitle: form.heroSubtitle || undefined,
        },
      }
      if (form.logoUrl.trim()) content.logo_url = form.logoUrl.trim()
      if (form.announcement) {
        content.announcement = { enabled: true, text: form.announcement }
      }
      const contact: Record<string, string> = {}
      if (form.phone) contact.phone = form.phone
      if (form.email) contact.email = form.email
      if (form.whatsapp) contact.whatsapp = form.whatsapp
      if (form.instagram) contact.instagram = form.instagram
      if (Object.keys(contact).length) content.contact = contact
      const seo: Record<string, string> = {}
      if (form.seoTitle) seo.title = form.seoTitle
      if (form.seoDescription) seo.description = form.seoDescription
      if (Object.keys(seo).length) content.seo = seo
      const legal: Record<string, string> = {}
      if (form.termsUrl.trim()) legal.terms_url = form.termsUrl.trim()
      if (form.privacyUrl.trim()) legal.privacy_url = form.privacyUrl.trim()
      if (Object.keys(legal).length) content.legal = legal

      const res = await fetch("/admin/restaurant/content", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "brand", locale, content }),
      })
      if (!res.ok) throw new Error(t("restaurant.content.saveError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.content.saved"))
      qc.invalidateQueries({ queryKey: ["restaurant-content"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t("restaurant.content.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.content.subtitle")}
          </Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      <Container className="p-4 flex flex-col gap-3">
        <div>
          <Label>{t("restaurant.content.locale")}</Label>
          <select
            className="border border-ui-border-base rounded-md px-3 py-2 w-full"
            value={locale}
            onChange={(e) => {
              clearForm()
              setLocale(e.target.value)
            }}
          >
            <option value="ar">ar</option>
            <option value="en">en</option>
          </select>
        </div>
        {isLoading ? (
          <Text>{t("restaurant.content.loading")}</Text>
        ) : (
          <>
            <div>
              <Label>{t("restaurant.content.brandName")}</Label>
              <Input
                value={form.brandName}
                onChange={(e) => setField("brandName", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.logoUrl")}</Label>
              <Input
                value={form.logoUrl}
                onChange={(e) => setField("logoUrl", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.heroTitle")}</Label>
              <Input
                value={form.heroTitle}
                onChange={(e) => setField("heroTitle", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.heroSubtitle")}</Label>
              <Input
                value={form.heroSubtitle}
                onChange={(e) => setField("heroSubtitle", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.announcement")}</Label>
              <Input
                value={form.announcement}
                onChange={(e) => setField("announcement", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.phone")}</Label>
              <Input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.email")}</Label>
              <Input
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.whatsapp")}</Label>
              <Input
                value={form.whatsapp}
                onChange={(e) => setField("whatsapp", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.instagram")}</Label>
              <Input
                value={form.instagram}
                onChange={(e) => setField("instagram", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.seoTitle")}</Label>
              <Input
                value={form.seoTitle}
                onChange={(e) => setField("seoTitle", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.seoDescription")}</Label>
              <Input
                value={form.seoDescription}
                onChange={(e) => setField("seoDescription", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.termsUrl")}</Label>
              <Input
                value={form.termsUrl}
                onChange={(e) => setField("termsUrl", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.content.privacyUrl")}</Label>
              <Input
                value={form.privacyUrl}
                onChange={(e) => setField("privacyUrl", e.target.value)}
              />
            </div>
            <Button isLoading={save.isPending} onClick={() => save.mutate()}>
              {t("restaurant.content.save")}
            </Button>
          </>
        )}
      </Container>
    </div>
  )
}

export default ContentPage
