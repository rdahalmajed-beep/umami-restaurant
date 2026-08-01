/**
 * Kitchen vs Medusa payment/fulfillment alignment (ORD-006).
 *
 * Kitchen status lives on `restaurant_order` and is intentionally separate from
 * Medusa payment / fulfillment enums. Do not silently map one onto the other.
 *
 * ## When does a paid online order enter `received`?
 *
 * On successful cart completion (`order.placed` / ensureRestaurantOrder).
 * Payment authorization/capture is Medusa's concern; kitchen starts at `received`
 * once the commerce order exists — even if capture is async — because the kitchen
 * must see the ticket. If business later requires "paid only", gate transitions
 * out of `received` (accept) on payment status via an explicit workflow, not by
 * delaying row creation.
 *
 * ## Can COD enter `received` before payment?
 *
 * Yes. Cash-on-delivery / pay-at-pickup orders enter `received` immediately on
 * place. Collecting cash is a storefront/branch operational step, not a kitchen
 * state. Medusa payment session for COD/manual remains independent.
 *
 * ## What does restaurant `cancelled` trigger in Medusa?
 *
 * Cancelling kitchen status alone does **not** cancel the Medusa order or refund.
 * Staff must run an explicit cancel/refund workflow (future) that coordinates:
 * 1) restaurant → `cancelled` with reason,
 * 2) Medusa order cancel / payment refund as required.
 * Until that workflow exists, treat kitchen cancel as operational only and handle
 * commerce cancel from standard Admin Order actions.
 *
 * ## When does `completed` create/complete fulfillment?
 *
 * Marking kitchen `completed` does **not** auto-create Medusa fulfillments.
 * Fulfillment remains a Medusa Admin / API action. A future
 * `completeRestaurantOrderFulfillmentWorkflow` may create+complete fulfillment
 * when the business action is "handed to customer / delivered".
 *
 * ## What if refund fails after restaurant rejection?
 *
 * Keep kitchen at `cancelled` (or prior state) and surface a payment error for
 * ops. Never roll kitchen status back silently to hide a failed refund. Retry
 * refunds via Medusa payment APIs; alert on persistent failure.
 *
 * ## Concurrent edits
 *
 * Kitchen transitions use optimistic `version` + workflow lock
 * `restaurant-order:{order_id}`. Stale clients receive
 * `RESTAURANT_ORDER_VERSION_CONFLICT` and must refresh.
 */

export const RESTAURANT_PAYMENT_ALIGNMENT = {
  received_on_order_placed: true,
  cod_received_before_payment: true,
  kitchen_cancel_does_not_refund: true,
  kitchen_completed_does_not_fulfill: true,
  refund_failure_keeps_kitchen_cancelled: true,
} as const
