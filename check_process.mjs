import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { processes } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const process = await db.select().from(processes).where(eq(processes.id, 2)).limit(1);

if (process.length > 0) {
  const p = process[0];
  console.log("=== Process ID 2 ===");
  console.log("Title:", p.title);
  
  const steps = p.steps ? JSON.parse(p.steps) : [];
  console.log("\n=== Steps ===");
  console.log("Total steps:", steps.length);
  if (steps.length > 0) {
    console.log("\nFirst step:");
    console.log(JSON.stringify(steps[0], null, 2));
  }
} else {
  console.log("Process not found");
}
