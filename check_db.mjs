import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await connection.execute('SELECT id, title, steps FROM processes WHERE id = 2');

if (rows.length > 0) {
  const process = rows[0];
  console.log("=== Process ID 2 ===");
  console.log("Title:", process.title);
  
  const steps = process.steps ? JSON.parse(process.steps) : [];
  console.log("\n=== Steps ===");
  console.log("Total steps:", steps.length);
  if (steps.length > 0) {
    console.log("\nFirst 3 steps:");
    steps.slice(0, 3).forEach((step, i) => {
      console.log(`\nStep ${i + 1}:`);
      console.log("  id:", step.id);
      console.log("  order:", step.order);
      console.log("  title:", step.title);
      console.log("  name:", step.name);
      console.log("  description:", step.description?.substring(0, 100));
      console.log("  shapeType:", step.shapeType);
    });
  }
} else {
  console.log("Process not found");
}

await connection.end();
