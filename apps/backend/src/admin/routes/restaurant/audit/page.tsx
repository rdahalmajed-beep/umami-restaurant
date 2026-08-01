import { Button, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

type Log = {
  id: string
  action: string
  resource_type: string
  resource_id?: string | null
  actor_id?: string | null
  created_at?: string
  reason?: string | null
}

const AuditLogsPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-audit-logs"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/audit-logs?limit=50", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.audit.loadError"))
      return (await res.json()) as { logs: Log[] }
    },
    refetchInterval: 15000,
  })

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t("restaurant.audit.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.audit.subtitle")}
          </Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      {isLoading ? (
        <Text>{t("restaurant.audit.loading")}</Text>
      ) : !(data?.logs || []).length ? (
        <Container className="p-6">
          <Text>{t("restaurant.audit.empty")}</Text>
        </Container>
      ) : (
        <div className="flex flex-col gap-2">
          {(data?.logs || []).map((log) => (
            <Container key={log.id} className="p-3 text-sm">
              <Text className="font-medium">
                {log.action} · {log.resource_type}
              </Text>
              <Text className="text-ui-fg-subtle">
                {log.resource_id || "—"} · {log.actor_id || "system"} ·{" "}
                {log.created_at
                  ? new Date(log.created_at).toLocaleString()
                  : ""}
                {log.reason ? ` · ${log.reason}` : ""}
              </Text>
            </Container>
          ))}
        </div>
      )}
    </div>
  )
}

export default AuditLogsPage
