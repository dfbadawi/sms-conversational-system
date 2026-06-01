# Architecture

This is a small SMS conversation system built for the staff full-stack assessment. The goal is not production polish; it is a clear, durable design that handles slow processing, duplicate webhooks, unordered delivery, and basic admin visibility without unnecessary machinery.

## System Shape

The repository is a Bun workspace with four apps and one shared package:

- `apps/api` receives Twilio webhooks, writes Postgres records, publishes outbox work to BullMQ, and serves admin APIs.
- `apps/worker` consumes BullMQ jobs, simulates the 3-15 second processing delay, creates outbound replies, and sends them through Twilio.
- `apps/twilio-mock` simulates inbound webhooks and accepts outbound sends during local development.
- `apps/frontend` is a minimal React admin UI for conversation list/detail views.
- `packages/shared` contains DTOs and queue payload types shared across apps.

```
┌─────────────┐   webhook POST   ┌──────────────┐    GET/POST   ┌──────────────┐
│   Twilio    │ ────────────────▶│     API      │◀──────────────│   Frontend   │
│  (or Mock)  │                  │    :3000     │               │    :5173     │
└──────▲──────┘                  └──────┬───────┘               └──────────────┘
       │ outbound SMS API call          │ write message + outbox event
       │                                ▼
       │                         ┌──────────────┐
       │                         │  PostgreSQL  │
       │                         │ messages +   │
       │                         │ outbox       │
       │                         └──────┬───────┘
       │                                │ publish unpublished events
       │                                ▼
       │                         ┌──────────────┐
       │                         │    Redis     │
       │                         │  (BullMQ)    │
       │                         └──────────────┘
       │                                ▲
       │                                |  consume
       |                                |
       │                         ┌──────────────┐
       └─────────────────────────│    Worker    │
                                 │ (N replicas  │
                                 │  possible)   │
                                 └──────────────┘
```

## Webhook Timeout

Twilio expects the webhook to respond within 5 seconds, while message processing may take 3-15 seconds. The API therefore does no processing in the request path. It validates the payload, upserts the conversation, inserts the inbound message, inserts an outbox event in the same transaction, and returns `200 OK`.

After commit, the API wakes a small background publisher. If that wakeup is missed, the publisher also has a fixed 30 second fallback poll. This keeps the webhook fast while preserving a durable handoff.

## Async Processing

Postgres is the source of truth. Redis/BullMQ is the execution queue.

The outbox table prevents the classic dual-write loss case. If the API stores a message but crashes before publishing to Redis, the unpublished `outbox_events` row remains and is picked up later. BullMQ jobs use deterministic IDs (`inbound-<messageId>`) so retrying publication does not create duplicate work.

The worker is a separate process so slow or crashing processors do not affect webhook ingestion. More worker replicas can be added without changing the API.

## Idempotency

Inbound webhook duplicates are handled by `UNIQUE(messages.twilio_sid)`. A repeated Twilio `MessageSid` returns success but does not create another message or outbox event.

Worker retries are safe because each inbound message can create only one outbound reply through `UNIQUE(in_reply_to_message_id)`. If a retry sees an existing outbound row, it reuses it. If the outbound send already returned a Twilio SID, the worker only finishes the local status update and does not send again.

Outbound sends use `Idempotency-Key: outbound:<outboundMessageId>`. The mock honors this key and returns the same send result for retries. With real Twilio, this boundary would need to match the chosen Twilio API/idempotency support and status callbacks.

## Ordering And Status

Twilio delivery order is not trusted. Messages are stored with Twilio timestamp when available, otherwise server receive time. Conversation history is ordered by `(occurred_at, id)`.

Only one inbound message per conversation is processed at a time. Before processing, the worker checks whether an earlier inbound in the same conversation is still `received` or `processing`. If so, it delays the job with BullMQ `DelayedError` and retries until that message is terminal. This keeps replies in conversation order while allowing different 
conversations to process concurrently.

Statuses are intentionally simple:

- Inbound: `received -> processing -> sent | failed`
- Outbound: `processing -> sent | failed`

`last_error` and `processing_attempts` are stored on messages so failed work is visible in the admin UI.

## Data Model

`conversations` groups one thread per `(phone_from, phone_to)` pair.

`messages` stores both inbound and outbound rows. A `direction` column distinguishes them, and `in_reply_to_message_id` links an outbound reply to its inbound message. Keeping both directions in one table makes the admin history query straightforward.

`outbox_events` stores durable publish intents. It is not domain state; it is the handoff mechanism from committed database state to queued work.

## Testing Strategy

The test suite is a single integration test in `apps/api/tests/integration/full-workflow.test.ts`. It exercises the full SMS path end to end rather than isolating individual services.

The test wires the API webhook and admin routes against real Postgres and Redis, calls the outbox publisher and worker processor directly, and uses the Twilio mock for outbound sends. All in one run.

## Code Map

Read the pipeline in this order:

| Step | Files to read (in order) |
|------|--------------------------|
| Inbound webhook | `apps/api/src/routes/webhook.ts` → `conversation.service.ts` → `conversation.repository.ts` |
| Outbox → queue | `outbox-publisher.ts` → `outbox.repository.ts` → `packages/shared/src/queue.ts` |
| Worker processing | `apps/worker/src/index.ts` → `job-consumer.ts` → `processor.ts` → `message.repository.ts` |
| Outbound send | `twilio.client.ts` → `apps/twilio-mock/src/routes/send.ts` |
| Admin UI | `apps/frontend/src/App.tsx` → `api/client.ts` |

## Tradeoffs

- **BullMQ + transactional outbox vs Postgres queue.** A Postgres-only queue would be simpler for a small exercise, but the test requirements say to "assume this system will eventually operate in production at scale". So the design uses a real message broker rather than a Postgres-only queue. The tradeoff is the dual-write problem between Postgres and BullMQ; the outbox table and publisher loop are the smallest fix that preserves the "must not lose messages" requirement.

- **API-owned outbox publisher.** The publisher lives in the API because ingestion ends at "committed state → broker work"; workers only consume jobs. The cost is a small background loop in the API container.

- **BullMQ vs SQS.** BullMQ is simpler locally and has good job visibility and retry behavior. SQS would remove Redis ops burden in production. The durable decision is the broker boundary plus outbox, not Redis specifically. Swapping brokers would change adapters, not the data model.

- **Separate worker vs process fork.** A fork would mean one container, but a separate worker service scales processing independently and isolates failures, which matches the assessment's scalability concern.

- **Frontend polling vs WebSocket/SSE.** Three-second polling is enough for a non-real-time admin UI. The tradeoff is constant load at idle; SSE would be the production path for many concurrent admins.

- **Inbound idempotency (Postgres only).** Duplicate webhooks are handled with `UNIQUE(twilio_sid)` and a single atomic insert, no Redis fast-path, which would add a second failure surface with no practical gain at SMS volume.

- **Outbound idempotency boundary.** One outbound row per inbound message; retries reuse the same idempotency key. The mock enforces this exactly. With real Twilio, the remaining question is whether the chosen API supports idempotency keys; otherwise status callbacks and reconciliation are required.

## Production Scale

For production, I would add Twilio signature validation, rate limiting, managed Postgres/Redis or a managed broker, structured logs, metrics, tracing, dead-letter/replay tooling, secrets management, and horizontal worker autoscaling from queue depth. The service boundaries would stay the same.

At high production scale, I would remove the in-process outbox publisher loop from the API and use change data capture (CDC) on the outbox table to publish new events to the queue from the Postgres transaction log. That keeps ingestion focused on webhook handling, scales publish independently of API replicas, and avoids relying on per-instance fallback polling.

**What this assessment codebase deliberately skips** (acceptable here, required in production):

- Twilio webhook signature verification and auth token checks
- Exhaustive response validation on outbound Twilio HTTP calls — the mock returns a known shape
- Runtime guards for outbox event types beyond the one we insert
- Per-route try/catch when a global error handler suffices
- Separate error classes for every non-retryable worker failure — only conversation ordering needs a distinct retry signal
- Validating unused URL params (e.g. Twilio account SID in the mock send path)
- Outbox `markEventFailed` retry accounting beyond logging (could be log-only until replay tooling exists)

The service boundaries, outbox, queue, ordering, and idempotency model would stay the same.