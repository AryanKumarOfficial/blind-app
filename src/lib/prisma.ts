/**
 * @fileoverview Prisma Client singleton instance.
 * Ensures a single Prisma Client instance is used throughout the application
 * to prevent connection pool exhaustion in development.
 * @module lib/prisma
 */

import {PrismaClient} from "../../generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg"
import {Pool} from "pg"
/**
 * Global object augmentation for Prisma Client.
 * Stores the Prisma instance in the global scope to persist across hot reloads.
 * @type {Object}
 */
const globalForPrisma = global as unknown as {
    prisma: PrismaClient | undefined;
};

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

/**
 * Singleton Prisma Client instance.
 * In development, reuses the global instance to prevent creating multiple connections.
 * In production, creates a new instance for each deployment.
 *
 * @constant {PrismaClient}
 *
 * @example
 * import { prisma } from "@/lib/prisma";
 *
 * const users = await prisma.user.findMany();
 *
 * @description
 * This pattern prevents the "too many connections" error during Next.js development
 * where hot reloading would otherwise create a new Prisma Client on each reload.
 *
 * @see {@link https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices}
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({adapter});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
