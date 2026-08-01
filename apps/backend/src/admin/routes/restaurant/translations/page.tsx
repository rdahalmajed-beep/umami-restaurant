import {
  Badge,
  Button,
  Container,
  Heading,
  Table,
  Text,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

type I18nRow = {
  id: string
  title: string
  title_i18n_json?: Record<string, string> | null
  kind: "menu" | "offer" | "meal"
  href: string
}

const missingLocales = (row: {
  title_i18n_json?: Record<string, string> | null
}) => {
  const missing: string[] = []
  const i18n = row.title_i18n_json || {}
  if (!i18n.en) missing.push("en")
  if (!i18n.ar) missing.push("ar")
  return missing
}

const TranslationsPage = () => {
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-translations-center"],
    queryFn: async () => {
      const [menusRes, offersRes, mealsRes] = await Promise.all([
        fetch("/admin/restaurant/menus", { credentials: "include" }),
        fetch("/admin/restaurant/offers", { credentials: "include" }),
        fetch("/admin/restaurant/meals", { credentials: "include" }),
      ])
      if (!menusRes.ok || !offersRes.ok || !mealsRes.ok) {
        throw new Error(t("restaurant.translations.loadError"))
      }
      const menus = (await menusRes.json()) as {
        menus: {
          id: string
          title: string
          title_i18n_json?: Record<string, string> | null
        }[]
      }
      const offers = (await offersRes.json()) as {
        offers: {
          id: string
          title: string
          title_i18n_json?: Record<string, string> | null
        }[]
      }
      const meals = (await mealsRes.json()) as {
        meals: {
          id: string
          title: string
          title_i18n_json?: Record<string, string> | null
        }[]
      }

      const rows: I18nRow[] = [
        ...(menus.menus || []).map((m) => ({
          id: m.id,
          title: m.title,
          title_i18n_json: m.title_i18n_json,
          kind: "menu" as const,
          href: `/restaurant/menus/${m.id}`,
        })),
        ...(offers.offers || []).map((o) => ({
          id: o.id,
          title: o.title,
          title_i18n_json: o.title_i18n_json,
          kind: "offer" as const,
          href: `/restaurant/offers/${o.id}`,
        })),
        ...(meals.meals || []).map((m) => ({
          id: m.id,
          title: m.title,
          title_i18n_json: m.title_i18n_json,
          kind: "meal" as const,
          href: `/restaurant/meals/${m.id}`,
        })),
      ]
      return rows
    },
  })

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t("restaurant.translations.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.translations.subtitle")}
          </Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      <Container className="p-0 overflow-hidden">
        {isLoading ? (
          <Text className="p-4">{t("restaurant.translations.loading")}</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>
                  {t("restaurant.translations.kind")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.translations.itemTitle")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.translations.missing")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.translations.actions")}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(data || []).map((row) => {
                const missing = missingLocales(row)
                return (
                  <Table.Row key={`${row.kind}-${row.id}`}>
                    <Table.Cell>
                      <Badge size="2xsmall">{row.kind}</Badge>
                    </Table.Cell>
                    <Table.Cell>{row.title}</Table.Cell>
                    <Table.Cell>
                      {missing.length ? (
                        <Text className="text-sm text-ui-fg-subtle">
                          {t("restaurant.translations.missingHint", {
                            locales: missing.join(", "),
                          })}
                        </Text>
                      ) : (
                        <Badge color="green" size="2xsmall">
                          {t("restaurant.translations.ok")}
                        </Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Button asChild size="small" variant="secondary">
                        <Link to={row.href}>
                          {t("restaurant.translations.edit")}
                        </Link>
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        )}
      </Container>
    </div>
  )
}

export default TranslationsPage
