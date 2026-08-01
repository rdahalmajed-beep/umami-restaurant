import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

type OutboxItem = {
  id: string
  channel?: string
  event_type: string
  status: string
  attempts: number
  last_error?: string | null
  created_at?: string
}

const OutboxPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-outbox"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/outbox?limit=50", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.outbox.loadError"))
      return (await res.json()) as { messages: OutboxItem[] }
    },
    refetchInterval: 10000,
  })

  const retry = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/admin/restaurant/outbox", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", id }),
      })
      if (!res.ok) throw new Error(t("restaurant.outbox.retryError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.outbox.retried"))
      qc.invalidateQueries({ queryKey: ["restaurant-outbox"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t("restaurant.outbox.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.outbox.subtitle")}
          </Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      {isLoading ? (
        <Text>{t("restaurant.outbox.loading")}</Text>
      ) : !(data?.messages || []).length ? (
        <Container className="p-6">
          <Text>{t("restaurant.outbox.empty")}</Text>
        </Container>
      ) : (
        <div className="flex flex-col gap-2">
          {(data?.messages || []).map((item) => (
            <Container
              key={item.id}
              className="p-3 text-sm flex items-start justify-between gap-3"
            >
              <div>
                <Text className="font-medium">
                  {item.event_type}
                  {item.channel ? ` · ${item.channel}` : ""}
                </Text>
                <Text className="text-ui-fg-subtle">
                  attempts {item.attempts}
                  {item.last_error ? ` · ${item.last_error}` : ""}
                  {item.created_at
                    ? ` · ${new Date(item.created_at).toLocaleString()}`
                    : ""}
                </Text>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge size="2xsmall">{item.status}</Badge>
                {item.status === "failed" && (
                  <Button
                    size="small"
                    variant="secondary"
                    isLoading={retry.isPending}
                    onClick={() => retry.mutate(item.id)}
                  >
                    {t("restaurant.outbox.retry")}
                  </Button>
                )}
              </div>
            </Container>
          ))}
        </div>
      )}
    </div>
  )
}

export default OutboxPage
