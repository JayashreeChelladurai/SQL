import { PrismaClient } from "./generated/prisma/index.js";

export const prisma = new PrismaClient();

// Configure SQLite for high concurrency (100+ concurrent students)
export async function initDatabaseOptimizations() {
  try {
    await prisma.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`);
    await prisma.$queryRawUnsafe(`PRAGMA busy_timeout = 10000;`);
    await prisma.$queryRawUnsafe(`PRAGMA synchronous = NORMAL;`);
    await prisma.$queryRawUnsafe(`PRAGMA cache_size = -64000;`); // 64MB cache
    await prisma.$queryRawUnsafe(`PRAGMA temp_store = MEMORY;`);
    console.log("⚡ SQLite WAL mode & concurrency optimizations active (100+ students ready)");
  } catch (err) {
    console.warn("Could not apply SQLite WAL pragmas:", err);
  }
}
