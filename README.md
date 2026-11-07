# Chekbit Stellar Service

The Chekbit Stellar Service is the Stellar-network integration service for the Chekbit platform. It handles Stellar-specific wallet operations, payment orders, Horizon monitoring, transaction records, and payment callbacks.

It works alongside the main **Chekbit backend system**, which owns the broader application domain, including the ledger, escrow, user/account workflows, and associated business rules. This service reports confirmed Stellar payment events to the Chekbit backend; it is not the platform's ledger or escrow system of record.

## Responsibilities

- Create Stellar payment orders with a unique memo and the configured platform receiving address.
- Monitor Stellar Horizon for payments to tracked wallets and the platform account, resuming from a persisted cursor after restart.
- Reconcile incoming payments with orders by memo/reference, asset, and amount, including partial payments.
- Create user wallets, encrypt wallet secrets for storage, synchronize balances, and submit wallet payments.
- Record Stellar transaction movements and Stellar-specific order/payment state in MySQL.
- Queue confirmed-payment callbacks to the Chekbit backend and track webhook delivery status.
- Provide XLM/USDC market rates and indicative swap estimates using public Horizon.
- Provide development utilities for testnet funding and direct wallet-key generation.

## System integration

1. The Chekbit backend calls the authenticated order API to request a Stellar payment destination and memo.
2. The customer sends the requested asset on Stellar.
3. This service monitors Horizon, reconciles the payment, records Stellar-specific transaction activity, and updates the payment order.
4. A queued webhook notifies the Chekbit backend when the payment is confirmed. The Chekbit backend then applies its own ledger, escrow, and application-level workflows.

The service uses its own MySQL persistence for Stellar orders, wallets, balances, listener state, transaction movements, and webhook delivery records. Redis/BullMQ is used for asynchronous transaction processing, webhook delivery, and mail jobs.

## Technology

- Node.js 20+
- NestJS 11 and TypeScript
- MySQL and TypeORM
- Redis and BullMQ
- Stellar SDK and Horizon

## Requirements

- Node.js 20 or later and npm
- MySQL reachable by the service
- Redis reachable by the service
- Stellar Horizon endpoint for the selected network
- Chekbit backend webhook URL and shared secret for payment callbacks

## Configuration

Create `.env.sandbox` and/or `.env.live` locally or inject equivalent variables through your deployment secret manager. Do not commit credentials. Existing process/container environment variables take precedence over values loaded from env files.

The Nest configuration selects `.env.live` only when `APP_ENV=live`; otherwise it selects `.env.sandbox`, then falls back to `src/.env` and `.env`. The provided Compose configuration sets its own `APP_ENV` values and also injects each service's configured env file.

| Variable | Purpose |
| --- | --- |
| `APP_ENV` | Runtime mode. The Nest configuration file selector treats only `live` as live; all other values select sandbox settings. Swagger is disabled when the value is `production`. |
| `PORT` | HTTP port. Sandbox defaults to `5001`; other modes default to `5000`. |
| `BASE_URL` | Public/base URL used by application utilities. |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | MySQL connection. The default database name is `chekbit_stellar`. |
| `DB_SYNC` | Enables TypeORM schema synchronization for `true`, `1`, `yes`, or `on`. Keep disabled in production and use reviewed migrations. |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`, `REDIS_DB` | Redis connection used by BullMQ. Username, password, and DB are optional. |
| `APP_CLIENT_ID`, `APP_CLIENT_SECRET` | Client credentials accepted by `POST /oauth/token`. Keep confidential. |
| `JWT_SECRET` | JWT configuration used by admin middleware. |
| `STELLAR_PUBLIC_KEY`, `STELLAR_SECRET_KEY` | Platform Stellar receiving account and transaction-signing key. Protect the secret key. |
| `STELLAR_HORIZON_URL`, `STELLAR_NETWORK` | Horizon endpoint and network passphrase selection (`TESTNET` or `PUBLIC`). These must refer to the same network. |
| `STELLAR_USDC_ISSUER` | USDC issuer for wallet operations and trustlines on the configured Stellar network. Use the matching testnet issuer for sandbox and mainnet issuer for live. |
| `STELLAR_PUBLIC_USDC_ISSUER` | Mainnet USDC issuer queried by public-Horizon market-rate and swap-estimate endpoints, even when the service itself runs against testnet. |
| `STELLAR_WALLET_INITIAL_XLM` | XLM funded to a newly created wallet by the trustline endpoint. Defaults to `2`; the implementation requires at least `2` XLM for account/trustline reserves. |
| `STELLAR_TRACKED_ADDRESS_REFRESH_MS` | How often the listener refreshes tracked wallet addresses. Defaults to `30000` milliseconds. |
| `WALLET_SECRET_ENCRYPTION_KEY` | Secret used to encrypt wallet secret keys before storing them in MySQL. Keep stable and backed up securely; rotating it requires re-encrypting stored wallet keys. |
| `CHEKBIT_BACKEND_API_WEBHOOK_URL` | Chekbit backend endpoint that receives confirmed Stellar payment callbacks. Defaults to `http://localhost:7100/api/webhooks/stellar`. |
| `WEBHOOK_SECRET` | Shared secret sent in the callback's `X-Webhook-Secret` header. |
| `BULL_DASHBOARD_USER`, `BULL_DASHBOARD_PASS` | Basic-auth credentials for the Bull Board queue dashboard. |
| `BULL_DEFAULT_REMOVE_ON_COMPLETE_COUNT`, `BULL_DEFAULT_REMOVE_ON_FAIL_COUNT` | Completed/failed BullMQ job retention counts; defaults to `50` and `200`. |
| `BULL_INCOMING_REMOVE_ON_COMPLETE_COUNT`, `BULL_INCOMING_REMOVE_ON_FAIL_COUNT` | Incoming payment job retention counts; defaults to `50` and `200`. |
| `BULL_INCOMING_CONCURRENCY` | Incoming-transaction worker concurrency; defaults to `15`. |
| `BULL_INCOMING_RATE_LIMIT_MAX`, `BULL_INCOMING_RATE_LIMIT_DURATION_MS` | Incoming-transaction worker rate limit; defaults to `120` jobs per `1000` ms. |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` | SMTP settings for queued mail jobs. |

Configure separate Stellar keys, Horizon URLs, network passphrases, and issuer accounts for sandbox and live. Never use live signing keys or live credentials in sandbox. Market-rate and swap-estimate routes always query public Horizon; they do not use the configured testnet Horizon endpoint.

## Install and run

```bash
npm install
npm run start:sandbox
```

Useful scripts:

| Command | Purpose |
| --- | --- |
| `npm run start:sandbox` | Run Nest in watch mode using `.env.sandbox`. |
| `npm run start:dev` | Run the sandbox configuration in watch mode. |
| `npm run start:live` | Run in watch mode using `.env.live`. |
| `npm run build` | Compile the Nest application into `dist/`. |
| `npm run start:prod` | Run the compiled app. |
| `npm test` | Run unit tests. |
| `npm run test:e2e` | Run end-to-end tests. |

The local sandbox port is `5001` by default. Swagger UI is available at `/api/docs` unless `APP_ENV=production`.

## Docker Compose

Compose defines `stellar-sandbox`, `stellar-live`, and Redis. MySQL is external. The API ports bind to localhost only: sandbox `5001` and live `5000`.

Compose interpolates `${...}` expressions from the shell or the Compose CLI env file; this is separate from the service-specific `env_file` loaded into each container. Ensure values referenced by `docker-compose.yml` (including DB settings and `LARAVEL_WEBHOOK_URL`) are available to Compose interpolation, and run one environment at a time:

```bash
docker compose --env-file .env.sandbox up --build -d stellar-sandbox redis
```

For live, use `.env.live` with the `stellar-live` service. Do not expose the API or queue dashboard directly to the public internet; place them behind the Chekbit deployment's access controls and network policy.

## HTTP API

Unless noted otherwise, successful API responses use this envelope:

```json
{
  "statusCode": 200,
  "message": "...",
  "data": {}
}
```

The OAuth token route returns its token fields directly. HTTP `POST` routes generally respond with status `201` unless otherwise specified by the framework or controller.

### Health and authentication

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/` | No bearer token | Basic service health response. |
| `POST` | `/oauth/token` | HTTP Basic client credentials | Issues a bearer token for `grant_type=client_credentials`, provided in the query string or JSON body. |

Supply the token as `Authorization: Bearer <token>` to payment-instruction routes. The current token implementation is in-memory and process-local; account for this before running multiple API replicas or expecting tokens to survive a restart.

### Payment instructions and payments

Both payment-instruction routes require the bearer token obtained from `/oauth/token`. A payment instruction identifies the user and payment purpose; it does not require an amount. Confirmed incoming chain transactions are recorded separately as payments.

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/payment-instructions/wallet-topups/stellar` | Bearer token | Create or retrieve the user's existing Stellar wallet top-up instruction. |
| `POST` | `/payment-instructions/stellar` | Bearer token | Create or retrieve a payment instruction by required reference. |
| `POST` | `/payment-instructions/wallet-topups/verify-transaction` | Bearer token | Verify a wallet top-up by required transaction hash. |
| `POST` | `/payment-instructions/stellar/:reference/verify-transaction` | Bearer token | Verify payment status by reference, optionally checking a transaction hash. |
| `GET` | `/payment-instructions/stellar/:reference/payments` | Bearer token | Retrieve confirmed payment records for a payment reference. |
| `GET` | `/payment-instructions/users/:userUuid/history` | Bearer token | Retrieve all payment records for a user UUID. |

Wallet top-up instruction JSON (only `user_uuid` is required):

```json
{
  "user_uuid": "USR8K2M9QX"
}
```

Payment instruction JSON (`reference` and `user_uuid` are required):

```json
{
  "user_uuid": "USR8K2M9QX",
  "reference": "ORDER-12345"
}
```

Either endpoint may also provide an optional `currency` (defaults to `USDC`). The response includes the generated memo, platform receiving address, currency, and network; instructions contain no received-amount total. Repeated top-up requests return the user's existing top-up instruction. Repeated payment-instruction requests for the same reference and user return the existing instruction.

When a chain payment is recorded, the webhook payload has `event: "wallet.topup.received"` for top-ups or `event: "payment.received"` for reference-based payments. Every distinct confirmed transaction is recorded and emits the corresponding event.

Verification accepts optional fields:

```json
{
  "status": "paid",
  "memo": "12345678",
  "transaction_hash": "stellar-transaction-hash"
}
```

`status`, if supplied, must be `paid` or `completed`.

### Wallets

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/wallets/create` | No route-level bearer guard | Create and persist a Stellar wallet for a Chekbit user; the secret is encrypted for storage and initial balance records are created. |
| `POST` | `/wallets/:walletId/sync-balance` | No route-level bearer guard | Fetch chain balances and update stored wallet balance records. |
| `POST` | `/wallets/pay` | No route-level bearer guard | Create or retrieve a payment instruction by reference and submit an on-chain payment from the user's wallet to the platform. |

Wallet creation JSON:

```json
{
  "user_id": "user_12345",
  "network": "stellar"
}
```

Wallet payment JSON:

```json
{
  "user_uuid": "USR8K2M9QX",
  "reference": "ORDER-12345",
  "asset_amount": 25,
  "currency": "USDC",
  "fait_amount": 1500,
  "fait_currency": "NGN"
}
```

`asset_amount` is required to submit an actual wallet transfer; this amount is not part of payment-instruction creation. `currency` is `USDC` or `XLM` and defaults to `USDC`. These routes have no controller-level authentication guard in this service; protect them at the API gateway and do not expose them publicly without authorization.

### Wallet swaps

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/stellar/swap/xlm-to-usdc` | No route-level bearer guard | Execute a strict-send XLM-to-USDC path payment from the configured platform account back to itself. |
| `POST` | `/stellar/swap/usdc-to-xlm` | No route-level bearer guard | Execute a strict-send USDC-to-XLM path payment from the configured platform account back to itself. |

Both routes accept `amount` (the input-asset amount) and optional `slippagePercent` (defaults to `1`):

```json
{
  "amount": 10,
  "slippagePercent": 1
}
```

The service uses `STELLAR_PUBLIC_KEY` as both the transaction source and destination, and signs with the matching `STELLAR_SECRET_KEY`. The keypair must match, the platform account must have enough of the input asset and fee balance, and it must hold the USDC trustline for the configured network. The service selects the best available strict-send path, applies the slippage minimum, and submits the transaction. The response includes the quote, minimum output, platform address, and transaction hash. A successful API response means submission was accepted, not that final ledger confirmation has been observed.

These routes spend or convert assets held by the global platform account; they do not use a user's wallet. They are distinct from the public rate/estimate routes below, which do not execute transactions. Swap routes have no controller-level bearer guard; protect them with authenticated, authorized gateway access.

### Stellar wallet utilities

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/stellar/wallet/generate` | No route-level bearer guard | Generate a new keypair and return the public key and secret. This does not create a persisted user wallet. |
| `POST` | `/stellar/wallet/generate-with-usdc-trustline` | No route-level bearer guard | Create and fund an account, establish a USDC trustline, and return the keypair and transaction hash. Uses platform XLM. |
| `POST` | `/stellar/fund/testnet/user` | No route-level bearer guard | Development utility to fund an existing user's testnet wallet with XLM or platform-funded USDC. |

The trustline endpoint requires `STELLAR_SECRET_KEY` and `STELLAR_USDC_ISSUER`. The configured platform account pays the initial XLM amount and transaction fee. Its request body is empty; `STELLAR_WALLET_INITIAL_XLM` sets the starting balance. The testnet funding request accepts:

```json
{
  "user_id": "user_12345",
  "asset_code": "USDC",
  "amount": "10"
}
```

`asset_code` may be `USDC` or `XLM`; the amount is optional. The XLM flow uses the testnet funding service. Do not enable or expose testnet utilities in live environments.

### Market rate and swap estimates

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/stellar/rates/xlm-usdc` | No route-level bearer guard | Return the best XLM/USDC bid and ask and their midpoint from the public Stellar order book. |
| `POST` | `/stellar/estimate/xlm-to-usdc` | No route-level bearer guard | Estimate USDC output for a strict-send XLM input without submitting a transaction. |
| `POST` | `/stellar/estimate/usdc-to-xlm` | No route-level bearer guard | Estimate XLM output for a strict-send USDC input without submitting a transaction. |

Both estimate routes accept `amount` and optional `slippagePercent` (defaults to `1`):

```json
{
  "amount": 100,
  "slippagePercent": 1
}
```

Responses include the quoted output, slippage-adjusted minimum output, quoted rate, and selected path. Quotes are indicative only and do not submit a swap or guarantee execution. These routes query public Horizon and use `STELLAR_PUBLIC_USDC_ISSUER`, which must identify the intended public-network USDC asset.

## Payment processing and callbacks

The Horizon listener streams transactions for tracked addresses and persists its cursor so it can resume after a restart. Incoming events are queued for processing. The worker reconciles order memos/references, updates partial or completed payment state, records debit/credit movements, and syncs affected wallet balances. When an order becomes paid, BullMQ queues a callback to `CHEKBIT_BACKEND_API_WEBHOOK_URL` with `X-Webhook-Secret: <WEBHOOK_SECRET>`. Webhook attempts and delivery status are stored; failed jobs are retried with backoff.

The Bull Board dashboard is mounted at `/admin/queues` and protected with HTTP Basic authentication configured by `BULL_DASHBOARD_USER` and `BULL_DASHBOARD_PASS`.

## Security and operations

- Protect every state-changing route at the gateway or service layer. Several utility and wallet routes currently have no route-level bearer guard.
- Treat all generated wallet secrets and platform signing keys as highly sensitive. The key-generation routes return private secrets and must not be publicly accessible.
- Ensure authentication logs never contain client secrets or bearer tokens before live deployment.
- Restrict the trustline-generation route because it spends platform XLM; restrict the testnet funding route to sandbox use.
- Restrict the platform swap routes: they sign and spend assets held by the global platform account.
- Keep environment files out of source control and use a secret manager for deployed environments. Rotate any credential that was exposed or committed.
- Use matching Horizon URLs, network passphrases, keys, and network-specific USDC issuers. Keep `STELLAR_PUBLIC_USDC_ISSUER` configured separately for public market queries.
- Keep `DB_SYNC` disabled in production and apply reviewed migrations.
- Require TLS for external traffic and limit access to `/admin/queues`.
- Monitor Horizon connectivity, listener state, queue retries, webhook delivery records, and MySQL/Redis health.
