import mongoose from "mongoose";
import { env } from "./env";

/** Mongoose connection, cached across hot reloads.
 *
 *  Next.js re-evaluates modules on every edit in development; without this
 *  cache each reload opens another pool and MongoDB eventually refuses
 *  connections. The promise is cached too, so concurrent requests during a cold
 *  start share one dial-up instead of racing.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as unknown as { _mongoose?: Cache };
const cache: Cache = (globalForMongoose._mongoose ??= { conn: null, promise: null });

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    // strictQuery keeps stray filter keys from silently matching everything.
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
      // Indexes are declared on the schemas and built by `npm run seed`, not on
      // every boot — autoIndex in production stalls the first request.
      autoIndex: env.NODE_ENV !== "production",
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null; // let the next request retry rather than caching a failure
    throw error;
  }

  return cache.conn;
}

export async function disconnectDb(): Promise<void> {
  if (cache.conn) await cache.conn.disconnect();
  cache.conn = null;
  cache.promise = null;
}
