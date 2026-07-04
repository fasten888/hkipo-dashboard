# Provider Runtime

Provider Runtime is the scheduler for the Data Provider Platform.

It does not implement any data provider and does not fetch external data by itself. Its job is to run providers safely and consistently.

## Responsibilities

- discover registered providers
- register / enable / disable providers
- run one provider
- run all providers
- run all providers by domain
- sort by provider priority
- run providers in parallel
- retry failed providers
- enforce provider timeout
- pass incremental sync cursor
- collect metrics
- report health

## Main API

```ts
const runtime = new ProviderRuntime()

runtime.registerProvider(provider)
await runtime.runOne('hkex-ipo')
await runtime.runAll()
await runtime.runByType('ipo')
```

## Cron Ready

Vercel Cron can call the runtime later:

```ts
await runtime.runAll('ipo')
```

The runtime has no UI dependency.

## Incremental Sync

Providers can receive:

```ts
context.lastCursor
```

And return:

```ts
{
  records,
  lastCursor,
  nextCursor,
}
```

When `nextCursor` exists, the runtime stores it through the configured cursor store.

## Retry And Timeout

Default behavior:

- retry attempts: 3
- timeout: 30 seconds
- parallel execution: enabled

All options can be overridden when creating the runtime or running a specific job.

## Health

Runtime health values:

- healthy
- degraded
- offline
- disabled
- unknown

These values can power future Sync or Dashboard health panels without changing providers.
