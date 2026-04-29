# Service DB

A lightweight, promise-based database client for Node.js with first-class TypeScript support. Service DB abstracts connection pooling, query building, and migrations behind a clean, intuitive API — so you can focus on your application logic instead of boilerplate.

## Features

- Zero-config connection pooling
- Fluent query builder with full TypeScript inference
- Schema migrations with rollback support
- Built-in soft deletes and timestamps
- Works with PostgreSQL, MySQL, and SQLite

## Installation

Install via npm or your preferred package manager:

```bash
npm install service-db
```

```bash
pnpm add service-db
```

Service DB requires **Node.js 18+**. For TypeScript projects, types are bundled — no need for a separate `@types` package.

## Configuration

Create a `prism.config.js` at the root of your project:

```js
export default {
  client: 'postgresql',
  connection: {
    host:     process.env.DB_HOST,
    port:     5432,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
  },
  pool: {
    min: 2,
    max: 10,
  },
}
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DB_HOST` | yes | Database host |
| `DB_NAME` | yes | Database name |
| `DB_USER` | yes | Database user |
| `DB_PASS` | yes | Database password |
| `DB_PORT` | no | Port (default: `5432`) |

### Connection pooling

Service DB maintains a pool of reusable connections to avoid the overhead of opening a new connection on every query. The `min` and `max` values control the pool size. For serverless environments, set `min: 0` so idle connections are released between invocations.

## Query Builder

The query builder provides a fluent, chainable API for constructing SQL queries programmatically.

### Selecting records

```js
import { db } from 'service-db'

const users = await db('users')
  .select('id', 'name', 'email')
  .where('active', true)
  .orderBy('created_at', 'desc')
  .limit(20)
```

### Filtering

Chain multiple `.where()` calls to AND conditions together:

```js
const results = await db('orders')
  .where('status', 'pending')
  .where('total', '>', 100)
  .whereBetween('created_at', [startDate, endDate])
```

For OR conditions, use `.orWhere()`:

```js
const results = await db('products')
  .where('stock', 0)
  .orWhere('archived', true)
```

### Inserting records

```js
const [id] = await db('users').insert({
  name:  'Ada Lovelace',
  email: 'ada@example.com',
})
```

### Updating records

```js
await db('users')
  .where('id', userId)
  .update({ last_login: new Date() })
```

### Deleting records

```js
await db('users').where('id', userId).delete()
```

For models with soft deletes enabled, `.delete()` sets `deleted_at` instead of removing the row. Use `.forceDelete()` to permanently remove a record.

## Migrations

Migrations live in the `./migrations` directory by default. Each migration file exports an `up` and a `down` function.

### Creating a migration

```bash
npx service-db make:migration create_users_table
```

This generates `./migrations/20240501_create_users_table.js`:

```js
export async function up(db) {
  await db.schema.createTable('users', (table) => {
    table.increments('id')
    table.string('name').notNullable()
    table.string('email').unique().notNullable()
    table.timestamps(true, true)
  })
}

export async function down(db) {
  await db.schema.dropTable('users')
}
```

### Running migrations

```bash
npx service-db migrate:latest   # run all pending migrations
npx service-db migrate:rollback  # roll back the last batch
npx service-db migrate:status    # list applied and pending migrations
```

### Migration batches

Migrations are grouped into batches. Rolling back undoes the most recent batch as a unit — useful when a deployment includes multiple related schema changes that should be applied or reverted together.

## API Reference

### `db(table)`

Returns a query builder scoped to the given table.

```js
db('users').select('*')
```

### `db.raw(sql, bindings?)`

Executes raw SQL. Use `?` placeholders for parameterized values:

```js
const result = await db.raw('SELECT * FROM users WHERE id = ?', [userId])
```

### `db.transaction(callback)`

Wraps a set of queries in a transaction. Automatically commits on success and rolls back on error:

```js
await db.transaction(async (trx) => {
  await trx('accounts').where('id', from).decrement('balance', amount)
  await trx('accounts').where('id', to).increment('balance', amount)
})
```

### `db.schema`

Access the schema builder to create, alter, or drop tables:

```js
await db.schema.alterTable('users', (table) => {
  table.string('avatar_url').nullable()
})
```

### `db.destroy()`

Closes all connections in the pool. Call this during graceful shutdown:

```js
process.on('SIGTERM', async () => {
  await db.destroy()
  process.exit(0)
})
```

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for anything beyond a small bug fix, so the approach can be discussed first.

### Running tests

```bash
npm test
```

Tests require a local PostgreSQL instance. Copy `.env.example` to `.env` and fill in your connection details before running the suite.

### Code style

This project uses ESLint and Prettier. Run the linter before committing:

```bash
npm run lint
```
