# WarungOS API Reference

REST API for WarungOS. All routes under `/api`. Runtime: Node.js.

## Auth

Session-cookie based, powered by [better-auth](https://better-auth.com).

- Protected routes call `getRequestUser()` — missing/invalid session throws `UNAUTHORIZED`.
- Send the better-auth session cookie with every request to a protected route.

### Error format

All routes return JSON errors:

```json
{ "error": "<message>" }
```

| Status | Meaning |
|--------|---------|
| `401`  | `{ "error": "UNAUTHORIZED" }` — no valid session |
| `400`  | Bad request — validation failure or thrown error message |
| `404`  | Resource not found |
| `500`  | Server error (bootstrap routes use 500 fallback) |

Auth required for every route below **except** `/api/auth/*` and `/api/session/:intent`.

### Bearer token (API testing)

For automated API tests, a static Bearer token can stand in for a session cookie.

```
Authorization: Bearer <API_TEST_TOKEN>
```

- Active **only** when both env vars are set:
  - `API_TEST_TOKEN` — the secret token (paste this value into the test tool's Credential field, no `Bearer ` prefix).
  - `API_TEST_USER_ID` — the user id the token authenticates as.
  - Optional: `API_TEST_USER_NAME`, `API_TEST_USER_EMAIL` — used when the test account's workspace is first created.
- The token is a **long-lived credential with no expiry**. Keep it secret; scope `API_TEST_USER_ID` to a throwaway test account; rotate by changing `API_TEST_TOKEN`.
- All `/api/*` routes that need auth accept this header — no per-route config.

---

## Auth

### `GET|POST /api/auth/*`

better-auth catch-all handler. Handles sign-in, sign-up, session, sign-out, etc. See better-auth docs for sub-paths (e.g. `/api/auth/sign-in/email`, `/api/auth/sign-up/email`).

### `POST /api/session/:intent`

Form-post wrapper around better-auth — used by the `/auth` page. Accepts `multipart/form-data`, sets session cookie, then **303 redirect**.

`:intent` ∈ `sign-in` | `sign-up`. Unknown intent → `404`.

**Form fields**

| Field | sign-in | sign-up |
|-------|---------|---------|
| `name` | — | required |
| `email` | required | required |
| `password` | required | required |
| `callbackURL` | optional (default `/dashboard`) | optional |

**Responses**

- Success → `303` redirect to `callbackURL` (or auth-provided URL), with `set-cookie`.
- Missing field / auth failure → `303` redirect to `/auth?mode=<mode>&error=<message>`.

---

## Bootstrap

### `GET /api/bootstrap`

Full app state for current user.

**200**

```json
{
  "appState": {
    "products": [],
    "cart": [],
    "transactions": [],
    "debts": [],
    "expenses": [],
    "paymentMethod": "Tunai",
    "settings": { }
  }
}
```

### `POST /api/bootstrap/reset`

Reset workspace to defaults. Returns fresh `appState` (same shape as above).

---

## Products

`Product` shape:

```ts
{
  id: string;
  name: string;
  category: "Makanan" | "Minuman" | "Sembako" | "Kebutuhan Harian";
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minimumStock: number;
  description: string;
}
```

### `POST /api/products`

Create product. Body = `ProductDraft` (all `Product` fields except `id`).

**200** → `{ "product": Product }`

### `PATCH /api/products/:id`

Update product. Body = `ProductDraft`.

**200** → `{ "product": Product }`

### `POST /api/products/:id/restock`

Add stock.

Body:

```json
{ "quantity": 10 }
```

**200** → `{ "product": Product }`

---

## Transactions

### `POST /api/transactions`

Record a sale. Decrements stock.

Body:

```json
{
  "paymentMethod": "Tunai",
  "items": [
    { "productId": "prd_x", "quantity": 2 }
  ]
}
```

`paymentMethod` ∈ `Tunai` | `QRIS` | `Transfer`.

**200** → result of `createTransaction` (created `Transaction` + updated state).

`Transaction` shape:

```ts
{
  id: string;
  paymentMethod: "Tunai" | "QRIS" | "Transfer";
  total: number;
  createdAt: string;        // ISO
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
  }>;
}
```

---

## Debts (Kasbon)

`Debt` shape:

```ts
{
  id: string;
  borrowerName: string;
  whatsapp: string;
  amount: number;
  createdAt: string;        // ISO
  dueDate: string;          // ISO
  isPaid: boolean;
  lastReminderAt?: string;  // ISO
}
```

### `POST /api/debts`

Create debt. Body = `DebtDraft`:

```json
{
  "borrowerName": "Budi",
  "whatsapp": "628123456789",
  "amount": 50000,
  "dueDate": "2026-06-01T00:00:00.000Z"
}
```

**200** → `{ "debt": Debt }`

### `PATCH /api/debts/:id`

Mark debt paid. Only `isPaid: true` accepted.

Body:

```json
{ "isPaid": true }
```

**200** → `{ "debt": Debt }`
**400** → if `isPaid` ≠ `true` (`"Hanya perubahan status lunas yang didukung."`)

### `POST /api/debts/:id/remind`

Mark a reminder sent — sets `lastReminderAt`.

**200** → `{ "debt": Debt }`

---

## Settings

`Settings` shape:

```ts
{
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  ownerName: string;
  ownerWhatsapp: string;
  city: string;
  businessNotes: string;
  stockAlertThreshold: number;
  enabledPayments: Array<"Tunai" | "QRIS" | "Transfer">;
}
```

### `PUT /api/settings`

Replace store settings. Body = full `Settings` object.

**200** → `{ "settings": Settings }`

---

## AI Assistant

### `GET /api/ai/chats`

List user's AI chats.

**200** → `{ "chats": Chat[] }`

### `POST /api/ai/chats`

Create chat.

Body (optional):

```json
{ "title": "Percakapan baru" }
```

Empty/missing title → defaults to `"Percakapan baru"`.

**200** → `{ "chat": Chat }`

### `GET /api/ai/chats/:id/messages`

Get a chat and its messages.

**200** → `{ "chat": Chat, "messages": StoredMessage[] }`
**404** → chat not found / not owned by user.

### `POST /api/ai/chats/:id/messages`

Send a user message; runs an AI turn. `maxDuration` 60s.

Body:

```json
{ "text": "berapa stok kopi?" }
```

**200** → `{ "newMessages": StoredMessage[] }` — messages created during this turn (user + assistant + any tool messages).
**400** → empty text (`"Pesan kosong."`)
**404** → chat not found.

`StoredMessage` shape:

```ts
{
  id: string;
  chatId: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolName: string | null;
  toolCallId: string | null;
  toolCalls: unknown;
  toolArgs: unknown;
  toolResult: unknown;
  createdAt: string;        // ISO
}
```

---

## Route summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `*` | `/api/auth/*` | — | better-auth handler |
| `POST` | `/api/session/:intent` | — | form sign-in / sign-up |
| `GET` | `/api/bootstrap` | ✓ | full app state |
| `POST` | `/api/bootstrap/reset` | ✓ | reset workspace |
| `POST` | `/api/products` | ✓ | create product |
| `PATCH` | `/api/products/:id` | ✓ | update product |
| `POST` | `/api/products/:id/restock` | ✓ | add stock |
| `POST` | `/api/transactions` | ✓ | record sale |
| `POST` | `/api/debts` | ✓ | create debt |
| `PATCH` | `/api/debts/:id` | ✓ | mark debt paid |
| `POST` | `/api/debts/:id/remind` | ✓ | mark reminder sent |
| `PUT` | `/api/settings` | ✓ | update store settings |
| `GET` | `/api/ai/chats` | ✓ | list AI chats |
| `POST` | `/api/ai/chats` | ✓ | create AI chat |
| `GET` | `/api/ai/chats/:id/messages` | ✓ | get chat messages |
| `POST` | `/api/ai/chats/:id/messages` | ✓ | send message to AI |
