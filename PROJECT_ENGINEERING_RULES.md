# Restaurant Platform Engineering Rules
## Backend (Medusa) + Customer Storefront

> **Purpose**
>
> This document is the engineering constitution for the project.
> It exists to keep the codebase coherent while the product evolves quickly with Cursor/AI-assisted development.
>
> The objective is **not** maximum abstraction or enterprise complexity.
> The objective is:
>
> - one source of truth for each concept,
> - predictable places for code,
> - reusable foundations,
> - safe incremental changes,
> - minimal duplication,
> - centralized visual and behavioral changes,
> - and the ability to add features without slowly creating parallel systems.
>
> Cursor must treat user requests as **product requirements**, not always as exact technical instructions.
> If a requested implementation would create duplication, conflict, or long-term structural problems, Cursor must explain the issue and choose or propose the structurally safer solution.

---

# 0. Priority Order

When two rules appear to conflict, use this priority:

1. **Data correctness and order/payment safety**
2. **One source of truth**
3. **Medusa-native architecture**
4. **Backward compatibility with existing working flows**
5. **Reuse before duplication**
6. **Simple user experience**
7. **Simple implementation**
8. **Performance**
9. **Developer convenience**

Do not sacrifice data correctness to make a feature faster to implement.

Do not introduce a large abstraction merely to avoid a few lines of code.

---

# 1. Required Workflow Before Any Meaningful Change

Before implementing a meaningful feature or behavior change, Cursor MUST inspect the existing codebase.

Search for:

- existing Medusa modules,
- data models,
- workflows,
- workflow steps,
- API routes,
- services,
- module links,
- subscribers,
- scheduled jobs,
- shared types,
- validation schemas,
- SDK wrappers,
- frontend features,
- shared UI components,
- existing forms,
- existing hooks,
- existing state,
- duplicated implementations,
- old or deprecated implementations.

Never assume a capability does not exist because it is not visible in the current file.

## Change classification

### Level 1 — Local change

Examples:

- copy/text,
- spacing,
- icon,
- small layout adjustment,
- minor component styling,
- a table column,
- empty-state wording.

Action:

- inspect the shared component first,
- make the smallest correct change,
- do not produce unnecessary architecture.

### Level 2 — Feature change

Examples:

- tags,
- product availability,
- archive behavior,
- modifiers,
- restaurant settings,
- filters,
- new shared storefront block,
- new customer interaction.

Before implementation, briefly determine:

1. What already exists?
2. What is the source of truth?
3. Which backend domain owns the behavior?
4. Which frontend feature owns the UI?
5. Can an existing component/workflow/schema be extended?
6. What other pages or flows consume the same concept?
7. Will the change affect Store API contracts?
8. Are migrations required?
9. Is there a simpler implementation with less duplication?

Then implement.

### Level 3 — Structural change

Examples:

- new Medusa module,
- new major relation,
- branch architecture,
- inventory architecture,
- order lifecycle,
- payment flow,
- fulfillment architecture,
- cart architecture,
- authentication architecture,
- major storefront state architecture,
- major refactor.

Before implementation, analyze:

1. current architecture,
2. actual business requirement,
3. available approaches,
4. recommended approach,
5. affected data,
6. affected APIs,
7. affected workflows,
8. migration implications,
9. compatibility risk,
10. rollback/recovery path.

Do not start a structural rewrite merely because another architecture looks cleaner.

---

# PART I — BACKEND / MEDUSA

# 2. Medusa Owns Commerce Unless There Is a Real Reason Otherwise

Before building custom commerce logic, check whether Medusa already owns the concept.

Prefer Medusa-native capabilities for appropriate domains such as:

- products,
- variants,
- product categories,
- prices,
- promotions,
- carts,
- customers,
- orders,
- payments,
- fulfillment,
- inventory,
- stock locations,
- sales channels,
- regions,
- authentication and users where applicable.

Custom code should primarily represent **restaurant-specific business domains** that Medusa does not already model correctly.

Possible restaurant-specific domains include:

- modifier groups,
- modifiers,
- menu availability schedules,
- preparation rules,
- restaurant operational settings,
- branch-specific operational configuration,
- kitchen-specific behavior,
- restaurant-specific ordering rules.

Do not create a second product system, second pricing system, second inventory system, or second order system beside Medusa.

---

# 3. One Source of Truth

Each important business concept MUST have one canonical owner.

Examples:

| Concept | Canonical Owner |
|---|---|
| Product | Medusa Product domain |
| Product variant | Medusa Product domain |
| Price | Medusa Pricing |
| Inventory quantity | Medusa Inventory |
| Stock location | Medusa Stock Location |
| Customer | Medusa Customer |
| Order | Medusa Order |
| Restaurant modifier | Restaurant modifier module |
| Modifier group rules | Restaurant modifier module |
| Menu availability schedule | Restaurant availability module |

Never create another field/model/service that represents the same concept using different names unless there is a documented reason.

Bad:

```text
product.active
menu_item.enabled
product_metadata.available
branch_product.visible
```

when all four are being used to mean the same thing.

If different concepts genuinely exist, give them different names and definitions.

Example:

```text
lifecycle_status
visibility
stock_availability
scheduled_availability
```

These may coexist because they mean different things.

---

# 4. Every Domain Has an Owner

A module should own its own:

- models,
- invariants,
- validation rules,
- domain operations,
- repository access,
- domain-specific queries.

Other modules should not reach into its internal tables and mutate them directly.

When a restaurant module needs a relationship with a Medusa domain, use the appropriate Medusa extension/linking mechanisms rather than creating hidden foreign-key coupling that bypasses module boundaries.

Cross-domain behavior should be orchestrated deliberately, usually through workflows.

---

# 5. API Routes Must Be Thin

An API route is an entry point, not the home of business logic.

A route may:

1. authenticate,
2. authorize,
3. validate the request,
4. call the canonical workflow/service,
5. serialize the response.

A route SHOULD NOT contain large blocks of:

- pricing logic,
- availability logic,
- inventory logic,
- order-state logic,
- multi-step mutations,
- duplicated domain validation.

Bad:

```text
POST /admin/menu-items
  create product
  create variants
  calculate prices
  attach modifiers
  update inventory
  update branch availability
```

implemented directly inside the route.

Better:

```text
POST /admin/menu-items
        ↓
createRestaurantMenuItemWorkflow(...)
```

The workflow coordinates the operation.

---

# 6. One Business Operation, One Canonical Mutation Path

Multiple interfaces are allowed.

Multiple independent implementations of the same business operation are not.

Example:

```text
Full Create Product
Quick Create Product
Duplicate Product
Import Product
```

may all exist.

But where they overlap, they should reuse the same canonical services/workflows/steps.

If a business rule changes, there should be one obvious place to update it.

---

# 7. Prefer Existing Medusa Workflows and Steps

When Medusa already provides a suitable workflow or workflow step, reuse it.

Do not manually reproduce core Medusa behavior unless there is a clear reason.

For multi-step business mutations, prefer workflows because they provide a deliberate orchestration boundary and make consistency/rollback easier to reason about.

Examples that deserve workflow thinking:

- creating a complete restaurant menu item,
- attaching restaurant data to a product,
- publishing a product across required channels,
- order acceptance flows,
- branch assignment,
- payment-related changes,
- inventory-sensitive operations,
- operations involving multiple modules.

Simple read operations do not need workflows merely for architectural purity.

---

# 8. Keep Read Logic and Write Logic Understandable

Writes must have clear canonical paths.

Reads may be optimized for the consumer, but derived read models must not silently become new sources of truth.

Caching, indexing, denormalized views, or frontend-ready responses are allowed.

But their data must be derived from canonical domain data.

Never require an administrator to manually update two places to keep one concept synchronized.

---

# 9. Stable Contracts and Canonical Naming

Use consistent names for the same concept across:

- models,
- schemas,
- services,
- workflow inputs,
- APIs,
- frontend types,
- UI labels where technically relevant.

Avoid:

```text
product_name
name
title
item_name
```

all referring to the same canonical property in different internal APIs.

Create canonical input/output types where helpful.

Example:

```text
CreateRestaurantMenuItemInput
UpdateRestaurantMenuItemInput
RestaurantMenuItemDTO
```

Do not create a unique payload contract for every page if the operation is the same.

---

# 10. Validation Must Have a Canonical Home

Frontend validation improves UX.

Backend validation protects the system.

Important business rules MUST be enforced on the backend even when the frontend also validates them.

Examples:

- required relationships,
- price constraints,
- modifier min/max rules,
- valid status transitions,
- availability constraints,
- order acceptance rules,
- permissions.

Do not trust the storefront or admin frontend as the only enforcement layer.

Avoid copying complex validation logic into many routes.

Use shared backend schemas/domain validation where appropriate.

---

# 11. Statuses Must Be Explicit

Avoid ambiguous booleans.

Bad:

```text
is_active
```

if it can mean:

- published,
- visible,
- in stock,
- operationally available,
- available at this branch,
- available at this time.

Use explicit concepts.

Example:

```text
status: draft | published | archived
visibility: visible | hidden
```

and separately derive availability from stock/schedule/branch rules where needed.

Do not create new statuses casually.

Before adding a status, ask:

- Is this lifecycle?
- Is this visibility?
- Is this workflow state?
- Is this fulfillment state?
- Is this operational availability?
- Is it already modeled by Medusa?

---

# 12. Think Through the Lifecycle of Important Entities

Before designing an important entity, consider:

- create,
- read/view,
- update,
- activate/publish,
- hide/unpublish,
- archive,
- restore if useful,
- delete,
- relationships,
- search/filter,
- historical references,
- permissions.

This does NOT mean all lifecycle actions must be implemented immediately.

It means the underlying design must not make obvious future actions destructive or expensive.

---

# 13. Archive Before Destructive Delete Where Business History Matters

Commerce data often participates in historical records.

Before hard deletion, determine:

- Is it referenced by past orders?
- Does reporting need it?
- Does an audit/history screen need it?
- Could deletion break relationships?
- Is archive/deactivation sufficient?

Prefer archive, soft-delete, or deactivation semantics where appropriate.

Hard delete should be intentional, safe, and limited to cases where data truly can disappear.

---

# 14. Metadata Is Not a Database Design Strategy

Metadata is useful for lightweight extension information.

Do not place important domains in metadata merely because it is fast.

A concept probably deserves a proper model/module if it:

- has relationships,
- needs filtering/search,
- needs indexes,
- has complex validation,
- has lifecycle,
- affects behavior,
- is edited frequently,
- must be queried independently.

Examples likely deserving real models:

- modifier groups,
- modifiers,
- complex menu schedules,
- branch operational configuration.

A lightweight display hint may reasonably remain metadata.

---

# 15. Database Changes Require Migrations

Never treat schema changes as local code edits.

For every schema change consider:

- migration,
- existing data,
- nullable/default strategy,
- backfill,
- indexes,
- uniqueness,
- relationships,
- rollback/recovery,
- deployment order.

Do not rewrite a previously executed production migration as a shortcut.

Do not manually modify production tables and then leave the codebase unaware of the change.

---

# 16. No Hidden Data Synchronization

Avoid architectures where data must be copied manually or synchronized by unrelated UI actions.

Bad:

```text
Product.price
RestaurantMenuItem.price
BranchMenu.price
```

where all three are intended to represent one price.

If different prices are genuinely supported, model the distinction explicitly.

Example:

```text
Medusa price lists / pricing rules
```

or another deliberate canonical architecture.

Do not create duplicated business data simply to make a page easier to code.

---

# 17. Side Effects Must Be Deliberate

Ask whether side effects belong:

- inside the primary workflow,
- in a workflow hook,
- as a subscriber/event reaction,
- as a scheduled job,
- or as an external integration.

Critical changes that must succeed together should not be split into loosely coupled background effects without a reason.

Non-critical secondary work such as notifications, analytics, or external synchronization may be handled asynchronously where appropriate.

Do not hide essential data creation behind a subscriber if the main operation cannot be considered complete without it.

---

# 18. Idempotency for Sensitive Operations

Operations that may be retried must not accidentally execute twice.

Pay particular attention to:

- payment actions,
- order creation,
- order confirmation,
- external webhooks,
- fulfillment actions,
- inventory-sensitive operations,
- third-party callbacks.

A network retry must not create duplicate business consequences.

Use provider IDs, request identifiers, state checks, or platform mechanisms as appropriate.

---

# 19. Concurrency Must Be Considered Where It Matters

Do not over-engineer every screen for concurrency.

But explicitly consider race conditions for:

- inventory,
- checkout,
- payment,
- order state transitions,
- coupon/redemption limits,
- branch capacity if added later,
- operations that update the same resource from multiple channels.

Never implement "read value → change locally → write value" for sensitive counters without considering concurrent writes.

---

# 20. Permissions Are Backend Rules

Hiding a button is not authorization.

Every protected mutation must enforce authorization on the backend.

If roles/permissions are introduced:

- define them centrally,
- use consistent checks,
- avoid page-specific permission logic becoming the source of truth.

Frontend permission handling exists to improve UX, not to secure the system.

---

# 21. Secrets Never Reach the Storefront

Private credentials belong in server-side environment configuration.

Never expose:

- secret API keys,
- database credentials,
- private provider credentials,
- admin tokens,
- server-only configuration

to browser bundles.

Only explicitly public configuration may be exposed to the customer frontend.

---

# 22. Environment Configuration Is Centralized

Configuration should have predictable homes.

Examples:

```text
env validation
provider configuration
URLs
feature flags
public storefront configuration
```

Do not scatter `process.env` reads throughout arbitrary business files if a central typed configuration layer can reasonably handle them.

Fail clearly when required configuration is missing.

Avoid silent fallback values for critical production configuration.

---

# 23. External Integrations Need Adapters

Payment, delivery, messaging, maps, analytics, storage, or other providers should not leak provider-specific code throughout the system.

Use clear integration boundaries.

Bad:

```text
Provider-specific calls inside:
- order route
- admin component
- cart service
- cron file
```

Better:

```text
DeliveryProvider / PaymentProvider / NotificationAdapter
```

or Medusa's native provider architecture where available.

This allows providers to change without rewriting unrelated domains.

---

# 24. Logging Must Explain Business Failures

Do not log random debug messages everywhere.

Important failures should include enough context to understand:

- operation,
- entity identifier,
- workflow/step where relevant,
- provider,
- safe error details.

Never log secrets.

Avoid swallowing exceptions.

If a fallback happens, it must be intentional and observable.

---

# 25. Errors Need Consistent Meaning

Do not make every route invent random error strings.

Use consistent error categories where appropriate:

- validation,
- not found,
- conflict,
- unauthorized,
- forbidden,
- provider failure,
- temporary service failure,
- internal error.

Frontend code should be able to respond consistently.

Do not expose sensitive internal stack details to customers.

---

# 26. Tests Follow Risk, Not File Count

Do not chase 100% coverage.

Prioritize tests for:

- business rules,
- workflows,
- order transitions,
- modifier validation,
- pricing-sensitive logic,
- payment-related behavior,
- inventory-sensitive behavior,
- permissions,
- regressions previously encountered.

UI snapshots for every component are not automatically valuable.

Critical behavior should have automated protection before the project becomes difficult to change safely.

---

# 27. Refactoring Rules

Refactor when:

- the same business logic exists in multiple places,
- one concept has multiple sources of truth,
- a feature must be modified in several files for the same reason,
- domain boundaries are being violated,
- a known implementation blocks the next feature.

Do NOT refactor merely because:

- a file is not aesthetically perfect,
- another pattern is fashionable,
- Cursor prefers a different library,
- a complete rewrite feels easier.

Prefer targeted consolidation.

---

# 28. Remove or Mark Superseded Implementations

When replacing an implementation:

- update all known consumers,
- remove the old path when safe,
- or clearly mark/document temporary compatibility.

Do not leave two active implementations indefinitely without an explicit reason.

Before deleting, search usage across the repository.

---

# 29. Backend Suggested Structural Boundaries

Exact folders may differ, but responsibilities should remain clear.

Example:

```text
src/
  api/
    admin/
    store/

  modules/
    modifiers/
    availability/
    restaurant-settings/

  workflows/
    create-restaurant-menu-item/
    update-menu-availability/

  links/

  subscribers/

  jobs/

  lib/
    shared infrastructure utilities only

  scripts/
```

Rules:

- `api/` = transport layer.
- `modules/` = domain ownership.
- `workflows/` = orchestration across operations/domains.
- `links/` = deliberate domain relationships.
- `subscribers/` = reaction to events, not hidden core mutations.
- `jobs/` = scheduled/background operations.
- `lib/` must not become a dumping ground for business logic.

---

# PART II — CUSTOMER STOREFRONT FRONTEND

# 30. Core Frontend Principle

**Pages do not own the design system, business data access, or reusable behavior.**

Pages primarily compose reusable building blocks.

A page may decide:

- which sections appear,
- their order,
- page-specific content,
- genuinely unique interactions.

A page should NOT independently decide:

- global colors,
- typography scale,
- standard spacing,
- button styles,
- card styles,
- form styles,
- breakpoint strategy,
- API client setup,
- product formatting,
- cart behavior,
- shared error behavior.

---

# 31. Central Design Tokens

All global visual foundations must come from centralized tokens.

At minimum centralize:

- colors,
- background/surface colors,
- text colors,
- borders,
- radius scale,
- shadows,
- spacing scale,
- typography families,
- typography scale,
- container widths,
- major breakpoints if custom,
- z-index conventions if needed.

Prefer CSS variables or the chosen styling system's theme/token mechanism.

Example concept:

```css
:root {
  --color-primary: ...;
  --color-surface: ...;
  --color-text: ...;
  --radius-md: ...;
  --space-4: ...;
  --container-max: ...;
}
```

Pages must not hardcode alternative brand colors because it is convenient.

If a page has a justified special visual treatment, derive it from an explicit page/section variant where possible.

Goal:

> Changing a brand color should normally require one central change, not a repository-wide search.

---

# 32. Typography Is a System

Do not style headings independently on every page.

Define reusable typography roles such as:

```text
Display
H1
H2
H3
Body
BodySmall
Label
Caption
Price
```

Pages use roles.

They should not repeatedly invent:

```text
font-size
font-weight
line-height
letter-spacing
```

for the same semantic purpose.

Exceptions must be explicit.

---

# 33. Shared Primitive Components

Create a small stable set of primitives.

Examples:

```text
Button
LinkButton
Input
Textarea
Select
Checkbox
Radio
Dialog
Drawer
Sheet
Badge
Tabs
Accordion
Skeleton
Spinner
Container
Section
Stack/Grid helpers if useful
```

Do not create:

```text
HomeButton
MenuButton
CheckoutButton
OfferButton
```

as separate components when they are merely style variants of the same Button.

Use variants:

```text
<Button variant="primary" />
<Button variant="secondary" />
<Button variant="ghost" />
```

Create a specialized component only when behavior or semantics truly differ.

---

# 34. Reusable Commerce Components

Shared ecommerce concepts should have canonical components.

Examples:

```text
ProductCard
ProductPrice
ProductImage
QuantitySelector
AddToCartButton
CartLineItem
CategoryCard
Money
AvailabilityBadge
ModifierSelector
OrderSummary
AddressForm
EmptyCart
```

If the Product Card changes, all ordinary product listings should inherit the change automatically.

Do not copy Product Card markup into:

- home page,
- category page,
- search page,
- related products,
- offers page.

Use one component with deliberate variants when necessary.

---

# 35. Feature Components Own Feature Behavior

Use feature/domain boundaries instead of giant global component folders.

Example:

```text
features/
  products/
    components/
    queries/
    adapters/
    types/

  cart/
    components/
    actions/
    state/
    types/

  checkout/
    components/
    actions/
    validation/

  menu/
    components/
    queries/

  account/
```

A feature should group code that changes together.

Avoid placing every component in a single `components/` directory with no ownership.

---

# 36. Pages Must Stay Thin

Route/page files should mostly:

1. read route params/search params,
2. request data through the canonical data layer,
3. compose feature/layout components,
4. provide page-specific metadata where required.

Avoid building giant page files containing:

- API calls,
- transformation,
- business rules,
- form validation,
- repeated styling,
- state machinery,
- large markup blocks.

If changing a shared concept requires editing many route files, the abstraction is probably in the wrong place.

---

# 37. One Canonical Medusa Client

The storefront must have one standard way to communicate with Medusa.

Centralize SDK/client initialization.

Example:

```text
src/lib/medusa/
  client.ts
```

Do not initialize the SDK independently inside random pages/components.

Centralize:

- backend URL,
- publishable key,
- credentials behavior,
- default headers,
- safe shared configuration.

Provider or environment changes should not require changing every page.

---

# 38. API Calls Must Not Be Scattered Through Presentational Components

Presentational components should receive data or call feature-level actions.

Bad:

```text
ProductCard
  → directly fetches Medusa product
  → directly fetches inventory
  → directly creates cart
```

Better:

```text
Page/feature query
   ↓
ProductCard(props)
```

and:

```text
AddToCartButton
   ↓
canonical cart action
```

Data access belongs in predictable query/action/data-layer files.

---

# 39. Separate Server Data from Client UI State

Do not place all state into one global store.

Differentiate:

### Server state

Examples:

- products,
- categories,
- product details,
- customer orders,
- backend availability.

Source of truth: backend.

### Client interaction state

Examples:

- open/closed drawer,
- selected tab,
- temporary modal state,
- unsaved local selection.

Source of truth: current UI.

### Shared commerce session state

Examples:

- cart identity,
- authentication/session-related client state if required,
- branch selection if it is genuinely global.

Only make state global when multiple distant parts of the application genuinely require it.

Do not globalize state "in case we need it later."

---

# 40. Server Components by Default When Using Next.js App Router

If the storefront uses a modern Next.js App Router architecture, avoid making everything a client component.

Use server rendering/data fetching where appropriate.

Add `"use client"` only when the component genuinely requires:

- browser APIs,
- client state,
- effects,
- event-driven interactive state,
- client-only libraries.

Keep client boundaries as low as practical.

Do not convert entire pages to client components merely because one button is interactive.

---

# 41. Central Data Adapters

Backend response shape and UI shape do not always have to be identical.

If the storefront repeatedly transforms Medusa data, create a canonical adapter.

Example:

```text
Medusa Product
      ↓
toProductCardModel(...)
      ↓
ProductCard
```

This is useful when the UI needs a stable view model such as:

```text
id
title
image
displayPrice
originalPrice
badge
availability
```

Do not repeat the same transformation in five pages.

Adapters must not become a second source of business truth.

They format/derive data for presentation.

---

# 42. Money Formatting Is Centralized

Never format price values manually throughout pages.

Use one canonical money utility/component.

It should own:

- currency formatting,
- locale behavior,
- decimal rules,
- fallback behavior.

Bad:

```text
price + " BHD"
```

repeated everywhere.

Better:

```text
<Money amount={...} currency="bhd" />
```

or canonical formatter.

A future currency/format change should be centralized.

---

# 43. Image Rendering Is Centralized

Use a canonical image component/helper for product/content images where practical.

Centralize:

- responsive sizing behavior,
- placeholders,
- aspect behavior,
- optimization defaults,
- fallback image policy.

Do not let every page invent its own image sizing logic.

Page-specific hero media can be an explicit exception.

---

# 44. Routes and Navigation Are Centralized

Do not scatter route strings throughout the codebase.

Avoid:

```text
"/cart"
"/checkout"
"/products/" + handle
```

everywhere.

Use route helpers/constants.

Example:

```text
routes.cart()
routes.checkout()
routes.product(handle)
routes.category(handle)
```

This makes routing changes safer.

---

# 45. Shared Layout Is Actually Shared

Elements such as:

- header,
- navigation,
- footer,
- announcement bar,
- mobile navigation,
- cart drawer,
- customer shell,
- main container

should live in shared layout structures.

Do not copy them into pages.

A global header change should normally happen once.

---

# 46. Page Sections Are Reusable, but Not Artificially Generic

For repeated marketing/storefront sections, use reusable section components.

Examples:

```text
HeroSection
CategoryGrid
ProductCarousel
ProductGrid
PromoBanner
FeatureStrip
TestimonialsSection
```

Allow intentional variants.

Do not create one giant `UniversalSection` with 40 props that tries to represent the entire site.

Prefer several understandable reusable blocks.

---

# 47. Use Variants Instead of Copies

If two components are mostly the same, consider an explicit variant.

Example:

```text
ProductCard
  variant="default"
  variant="compact"
  variant="horizontal"
```

Do not create three unrelated ProductCard implementations if they share the same product semantics.

However, if two designs have fundamentally different structure and behavior, separate components may be clearer.

Reuse must reduce complexity, not hide it.

---

# 48. Exceptions Must Still Obey Foundations

A unique landing page or campaign page may have custom layout.

It MUST still normally use:

- global design tokens,
- shared typography,
- shared buttons/inputs,
- canonical data access,
- canonical money formatting,
- route helpers,
- shared API client,
- shared cart actions,
- shared accessibility foundations.

"Unique page" does not mean "new mini-application."

---

# 49. No Hardcoded Theme Values in Pages

Avoid arbitrary values such as:

```text
#FF3912
17px
23px
border-radius: 11px
margin-top: 37px
```

repeated in page code.

If an arbitrary value is truly unique and visually justified, it may exist locally.

If it appears twice or represents a design concept, promote it to a token/variant.

Do not turn the token system into hundreds of meaningless variables.

Centralize repeated decisions, not every single number.

---

# 50. Responsive Behavior Is Component-Owned

A shared component should generally own its responsive behavior.

Do not require every page to fix the same component separately on mobile.

Example:

`ProductGrid` should understand its own standard responsive columns.

Pages may configure documented variants/limits.

If ProductGrid breaks on mobile everywhere, one fix should repair it everywhere.

---

# 51. Forms Use Shared Field Foundations

Forms should reuse canonical:

- input components,
- labels,
- error display,
- validation style,
- disabled/loading behavior,
- success/error feedback.

Complex forms may have feature-specific schemas.

Do not repeat the same address fields or customer fields in several unrelated forms if one reusable feature form can own them.

---

# 52. Validation Schemas Are Reused Where Meaning Is Shared

If the same input concept exists in several places, reuse schemas or shared field definitions where practical.

Examples:

- email,
- phone,
- address,
- quantity constraints,
- modifier selection.

Do not force unrelated forms to share one giant schema.

Share semantics, not accidental similarity.

---

# 53. Loading, Error, Empty, and Disabled States Are First-Class

Every data-driven feature must consider:

- loading,
- empty,
- error,
- success where relevant,
- disabled,
- unavailable.

Do not implement only the happy path.

Use shared patterns/components for common states.

Examples:

```text
ProductGridSkeleton
EmptyState
InlineError
RetryAction
```

Pages should not invent different error UX for the same type of failure without reason.

---

# 54. Cart Logic Is Centralized

Adding/removing/updating cart items must use canonical cart actions.

Do not implement cart mutation separately in:

- product page,
- product card,
- quick add,
- recommendations,
- cart drawer.

All entry points should converge into the same cart behavior.

Restaurant modifier selections should be transformed into the canonical cart operation in one predictable feature layer.

---

# 55. Checkout Logic Must Not Be Duplicated

Checkout is business-critical.

Keep canonical actions for:

- customer/address data,
- shipping/fulfillment selection,
- payment selection,
- cart completion,
- error handling.

Do not create separate checkout implementations for desktop/mobile.

Responsive presentation can differ.

The commerce operation remains one flow.

---

# 56. Product Availability Logic Is Not a UI Guess

The storefront must not independently decide business availability using scattered client conditions.

Bad:

```text
if inventory > 0 and currentHour < 22 ...
```

inside ProductCard.

Availability should come from the backend or from a canonical frontend adapter based on explicit backend data.

The same item should not appear available on one page and unavailable on another because each page calculates differently.

---

# 57. No Duplicate Product Models

Do not create:

```text
HomeProduct
CategoryProduct
SearchProduct
OfferProduct
```

as unrelated business types if they all represent the same product.

Use:

- canonical backend type,
- shared lightweight UI model,
- explicit specialized projection only when genuinely needed.

Avoid type drift.

---

# 58. TypeScript Must Protect Shared Contracts

Avoid unnecessary `any`.

Shared domain/API types should be explicit.

If the backend contract changes, TypeScript should help reveal affected consumers.

Do not bypass type errors with casts simply to make a build pass unless the runtime truth is known.

Prefer fixing the contract.

---

# 59. Component Public APIs Must Stay Small

A reusable component with 30 boolean props is usually a warning sign.

Bad:

```text
<ProductCard
  showPrice
  hideImage
  smallImage
  useRedTitle
  leftButton
  mobileSpecial
  campaignMode
  ...
/>
```

Prefer:

- meaningful variants,
- composition,
- separate truly different components.

The component API should communicate design intent.

---

# 60. Avoid Premature Global Abstractions

Do not centralize something merely because it might be reused someday.

Use the Rule of Evidence:

- repeated once: observe,
- repeated twice: consider,
- repeated three times or clearly a shared domain concept: consolidate.

Important foundational concepts such as Button, Money, ProductCard, SDK client, routes, theme tokens, cart actions do not need to wait for three copies; they are inherently shared.

---

# 61. Dependency Direction

Prefer:

```text
page
  ↓
feature
  ↓
shared component / data layer
  ↓
SDK / backend
```

Avoid:

```text
shared component
  ↓
specific page
```

Shared layers must not import page-specific code.

Generic UI primitives must not depend on commerce features.

Example:

```text
Button
```

must not know about cart.

```text
AddToCartButton
```

may use Button.

---

# 62. Suggested Storefront Structure

The exact structure can evolve, but responsibilities should remain predictable.

```text
src/
  app/
    (store)/
    account/
    cart/
    checkout/
    products/
    categories/

  components/
    ui/
      button/
      input/
      dialog/
      badge/

    layout/
      header/
      footer/
      navigation/
      container/

  features/
    products/
      components/
      queries/
      adapters/
      types/

    categories/
      components/
      queries/

    menu/
      components/
      queries/
      adapters/

    cart/
      components/
      actions/
      state/
      types/

    checkout/
      components/
      actions/
      validation/

    account/
      components/
      queries/
      actions/

  lib/
    medusa/
      client.ts
    money/
    routes/
    config/

  styles/
    tokens.css
    globals.css

  types/
    truly cross-feature types only
```

Rules:

- `app/` composes.
- `components/ui/` contains generic visual primitives.
- `components/layout/` contains shared site shell.
- `features/` owns business-facing frontend functionality.
- `lib/medusa/` owns SDK setup.
- `lib/` is not a dumping ground for feature logic.
- `styles/` owns global design foundations.
- feature-specific code stays in the feature.

---

# 63. Central Theme Change Requirement

A normal global redesign must be possible primarily through a limited set of locations.

Examples:

```text
styles/tokens.css
styles/globals.css
components/ui/*
components/layout/*
```

Changing:

- primary color,
- text color,
- border radius,
- button style,
- input style,
- typography,
- site container width,
- common card treatment

should not require manually editing every route.

If a global theme request causes edits across many page files, stop and inspect the architecture before continuing.

---

# 64. Shared Component Change Impact Rule

Before modifying a shared component, Cursor must:

1. search all usages,
2. identify variants,
3. determine whether change should affect all consumers,
4. preserve existing contracts where reasonable,
5. explicitly isolate exceptions.

Do not "fix Home" by changing ProductCard in a way that accidentally breaks Checkout.

If only one consumer needs a difference, add a meaningful variant or local composition rather than changing global behavior silently.

---

# 65. No Copy-Paste to Protect a Page From Change

Do not copy a shared component into a page just because that page needs one difference.

First consider:

- variant,
- slot/composition,
- wrapper,
- optional subcomponent,
- page-specific child content.

Copying is acceptable only when the concepts have actually diverged and should evolve independently.

If copied, rename it to reflect the new concept and remove the false relationship.

---

# 66. Accessibility Belongs in Shared Components

Shared primitives should own common accessibility behavior:

- semantic elements,
- keyboard interaction,
- focus states,
- labels,
- dialog behavior,
- disabled semantics,
- accessible names.

Do not re-solve accessibility page by page.

A Button should be accessible everywhere because the Button component is correct.

---

# 67. Performance Rules Without Premature Optimization

Default rules:

- do not fetch the same data repeatedly within one flow without reason,
- avoid shipping unnecessary client JavaScript,
- lazy-load genuinely heavy optional features,
- optimize images through the canonical image solution,
- paginate large lists,
- avoid massive client-side datasets,
- keep client component boundaries focused.

Do not introduce complicated caching merely because performance might become a problem.

Measure meaningful bottlenecks before complex optimization.

---

# 68. Cache Is Never the Source of Truth

Caching can improve reads.

It must never become the only place where business data exists.

Any cache invalidation strategy must be connected to canonical mutations.

When unsure about stale commerce-critical information, prefer correctness over aggressive caching.

---

# 69. Feature Flags for Incomplete/Risky Features When Useful

If a feature is:

- incomplete,
- experimental,
- being rolled out gradually,
- risky to expose immediately,

use a simple deliberate feature flag where appropriate.

Do not leave half-built UI reachable and rely on users not finding it.

Do not build a complex feature-flag platform for a small project unless needed.

---

# 70. Analytics Is Centralized

If analytics is added, do not call analytics providers directly from arbitrary components everywhere.

Use a canonical event layer.

Example:

```text
analytics.track("product_viewed", ...)
analytics.track("add_to_cart", ...)
analytics.track("checkout_started", ...)
```

Provider implementation stays behind the interface.

This prevents changing an analytics provider from becoming a site-wide rewrite.

---

# 71. Customer-Facing Copy Should Not Be Buried in Logic

Reusable UI text should be easy to locate.

Do not concatenate user-facing sentences deep inside business utilities.

If multilingual support is planned or likely, avoid architecture that requires rewriting every component later.

Do not add a full internationalization framework prematurely if the project does not need it yet, but keep presentation text separated from backend business rules.

---

# 72. Error Boundaries and Failure Isolation

A failure in one optional section should not unnecessarily destroy the entire storefront page.

Use framework-appropriate error boundaries where valuable.

Critical checkout/order errors must be explicit and recoverable.

Non-critical sections such as recommendations can fail more gracefully.

Never hide a failed checkout operation behind a generic success state.

---

# PART III — BACKEND ↔ STOREFRONT CONTRACT

# 73. Storefront Never Reads the Database Directly

The customer frontend communicates through:

- Medusa Store API,
- Medusa SDK,
- intentional custom Store API routes.

Never connect the storefront directly to PostgreSQL.

Never expose Admin APIs/tokens to the customer browser.

---

# 74. Admin and Storefront Share Business Truth, Not UI Code

The Admin and Storefront may have different interfaces.

They must share the same backend concepts.

Example:

```text
Admin changes menu availability
        ↓
canonical backend state
        ↓
Storefront automatically reflects it
```

Do not create a storefront-only availability system.

---

# 75. Custom Store API Routes Must Be Customer-Safe

Custom `/store` behavior must:

- expose only required data,
- enforce customer-safe permissions,
- validate inputs,
- avoid leaking internal/admin-only fields,
- preserve canonical domain logic.

Never reuse an admin response blindly if it contains more information than customers need.

---

# 76. Publishable/Environment Configuration Must Be Centralized

Store API access configuration belongs in one predictable place.

Do not hardcode backend URLs or public keys inside components.

Switching local/staging/production should primarily be environment configuration, not code edits.

---

# 77. Contract Changes Require Consumer Review

Before changing an API response/input used by the Storefront:

1. search consumers,
2. determine compatibility,
3. update canonical types,
4. update adapters,
5. update affected tests,
6. avoid silent shape drift.

If a breaking change is unavoidable, make it deliberate.

---

# PART IV — CURSOR OPERATING RULES

# 78. Cursor Must Search Before Creating

Before creating any new:

- model,
- route,
- workflow,
- service,
- schema,
- type,
- hook,
- component,
- utility,
- form,
- state store,
- API client,

search the repository for an existing equivalent or near-equivalent.

If one exists, prefer:

1. reuse,
2. extend,
3. unify,
4. only then create a new implementation.

---

# 79. Cursor Must Identify the Change Surface

Before a meaningful modification, identify:

```text
Canonical owner:
Consumers:
Shared dependencies:
Data impact:
API impact:
UI impact:
Migration impact:
```

The goal is not to produce a long report.

The goal is to avoid fixing one page while leaving three copies inconsistent.

---

# 80. Cursor Must Challenge Harmful Instructions

If the user asks for an implementation that would create:

- duplicate source of truth,
- duplicate business logic,
- unnecessary new database table,
- misuse of Medusa,
- unsafe deletion,
- scattered theme code,
- duplicated ProductCard/form/cart logic,
- page-specific API clients,
- breaking schema shortcuts,

Cursor must say so briefly and propose the better implementation.

The user defines the desired product outcome.

Cursor is responsible for technical coherence.

---

# 81. Cursor Must Not Over-Engineer

Avoid:

- unnecessary repository patterns,
- abstract base classes without clear need,
- generic "engine" layers for simple features,
- microservices for local domains,
- event systems for simple synchronous behavior,
- premature design systems with hundreds of tokens,
- global state for local interactions,
- creating interfaces with only one trivial implementation unless an integration boundary genuinely benefits.

Choose the simplest architecture that preserves correct ownership and reuse.

---

# 82. Every New Shared Abstraction Needs a Reason

A shared abstraction is justified when one or more apply:

- it represents a stable domain concept,
- multiple consumers need the same behavior,
- changing it centrally is valuable,
- it protects an external/provider boundary,
- duplication is already causing drift.

Do not create abstractions solely because future reuse is imaginable.

---

# 83. Do Not Hide Technical Debt

If a safe temporary implementation is necessary:

- mark it clearly,
- explain why,
- isolate it,
- avoid letting it become the canonical architecture accidentally.

Use a clear TODO only when there is a real next action.

Do not leave vague TODOs everywhere.

---

# 84. Preserve Working Behavior During Refactors

A refactor should not silently become a feature redesign.

Unless requested:

- preserve API behavior,
- preserve user-visible behavior,
- preserve data,
- preserve important URLs,
- preserve permissions.

Separate cleanup from product behavior changes when practical.

---

# 85. Update Lightweight Architecture Documentation

Maintain:

```text
docs/ARCHITECTURE.md
docs/DATA-MODEL.md
docs/DECISIONS.md
```

Update only when a meaningful architectural decision changes.

Examples worth documenting:

- how branches are represented,
- whether modifiers are variants or custom domain data,
- canonical availability architecture,
- cart modifier representation,
- order state extensions,
- file storage provider strategy.

Do not document every button or component.

---

# 86. Architectural Decision Rule

When making a decision that future Cursor sessions could reasonably reverse, add a short record.

Format:

```md
## DEC-00X — Title

Date:
Status: Active

Decision:
Why:
Consequences:
Do not:
```

Keep decisions short.

---

# 87. Definition of Done — Backend Feature

Before calling a meaningful backend feature complete:

- [ ] Existing equivalent code was searched.
- [ ] Source of truth is clear.
- [ ] Correct Medusa/custom domain owns the data.
- [ ] No unnecessary parallel model was introduced.
- [ ] API route is thin.
- [ ] Validation exists on the backend.
- [ ] Shared business rules are not duplicated.
- [ ] Workflow is used when multi-step consistency requires it.
- [ ] Relationships are explicit.
- [ ] Migration is correct if schema changed.
- [ ] Historical data remains safe.
- [ ] Permission checks are backend-enforced where needed.
- [ ] Sensitive retries cannot create obvious duplicate effects.
- [ ] Errors are handled intentionally.
- [ ] Critical behavior has appropriate tests.
- [ ] Old implementation is removed or intentionally retained.
- [ ] Architecture docs are updated only if architecture changed.

---

# 88. Definition of Done — Storefront Feature

Before calling a meaningful storefront feature complete:

- [ ] Existing component/feature was searched.
- [ ] Page remains reasonably thin.
- [ ] Global theme values were not duplicated locally.
- [ ] Shared primitives are reused.
- [ ] Shared commerce components are reused.
- [ ] Medusa client/API access follows the canonical data layer.
- [ ] No new duplicate cart/product/price logic was introduced.
- [ ] Types are coherent.
- [ ] Loading state is handled.
- [ ] Empty state is handled when applicable.
- [ ] Error state is handled.
- [ ] Mobile/responsive behavior is owned at the correct component level.
- [ ] Shared component changes were checked across consumers.
- [ ] Accessibility fundamentals are preserved.
- [ ] No secret/private backend configuration reaches the browser.
- [ ] Unique page exceptions still follow global tokens and shared foundations.

---

# 89. Red Flags — Stop and Inspect Before Continuing

Cursor should pause implementation and inspect architecture when any of these appear:

### Backend

- Same field meaning exists under different names.
- Same operation exists in several routes.
- Route contains large business logic.
- Custom table duplicates a Medusa domain.
- Important relational data is being pushed into metadata.
- One boolean controls unrelated concepts.
- UI must update two backend records manually to keep data synced.
- Product/order/payment logic is being copied.
- Direct cross-module table access is introduced.
- Production schema is being changed without migration.
- Hard deletion affects commerce history.
- A retry could create duplicate orders/payments/actions.

### Frontend

- Same UI change requires editing several pages.
- ProductCard exists in multiple copies.
- Button/input/card styles are hardcoded per page.
- Medusa SDK is initialized in several files.
- API calls are spread through visual components.
- Price formatting is repeated.
- Cart mutation exists in multiple implementations.
- Header/footer is copied.
- Same form is recreated.
- A page has its own global-looking theme rules.
- `use client` is being added to a large tree for one small interaction.
- A new global state store is being created for a local modal/tab.
- A shared component is modified without searching its consumers.

When a red flag is found:

1. identify the canonical implementation,
2. consolidate only the affected concept,
3. avoid unrelated rewrites,
4. then continue the requested feature.

---

# 90. The Central Test

For every recurring concept, ask:

> If we change this requirement tomorrow, how many places should we need to edit?

Examples:

### Brand primary color
Expected: one theme/token location.

### Standard button appearance
Expected: shared Button component/theme.

### Product card design
Expected: one ProductCard implementation or a small set of deliberate variants.

### Money display
Expected: one formatter/component.

### Medusa backend URL
Expected: environment/client configuration.

### Add-to-cart behavior
Expected: canonical cart action.

### Modifier validation
Expected: canonical backend domain rule, plus frontend UX validation.

### Menu availability
Expected: one backend source of truth consumed everywhere.

### Product create behavior
Expected: one canonical workflow/operation.

If the answer is "many unrelated pages/files," inspect whether the responsibility is misplaced.

---

# 91. Final Engineering Philosophy

Build the system so that most future requests look like:

```text
change a token
or
change a shared component
or
extend one feature
or
extend one workflow/domain
```

not:

```text
search the whole project
edit every page
patch three APIs
synchronize duplicate fields
and hope nothing else broke
```

The codebase should optimize for **predictable change**.

The target is not perfect architecture.

The target is a project where:

- each concept has an obvious home,
- shared behavior changes once,
- page-specific behavior stays local,
- Medusa remains the commerce foundation,
- restaurant-specific logic is modeled deliberately,
- backend rules protect correctness,
- the storefront remains composable,
- and new features can be added without creating a second implementation of what already exists.

---

# 92. Instruction to Cursor at the Start of Every Task

Use this operating instruction automatically:

> Before implementing this request, inspect the existing implementation and determine the canonical source of truth, shared components, backend domain, workflows, schemas, and all meaningful consumers affected by the requested concept. Reuse or extend existing foundations instead of creating parallel implementations. Treat my request as the desired product outcome; if my proposed technical approach would introduce duplication, conflicting state, misuse of Medusa, or a change that will make future maintenance unnecessarily difficult, explain the concern briefly and use/propose the simplest structurally correct approach. For storefront changes, ensure global design and repeated behavior remain centralized so a shared change does not require manually editing every page. Do not over-engineer unrelated parts of the project.
