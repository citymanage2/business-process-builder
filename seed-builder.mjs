/**
 * Seed script for Process Builder - adds default categories and templates
 * Run with: node seed-builder.mjs
 */

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const categories = [
  { name: "HR & Personnel", description: "Human resources and personnel management processes", color: "#06b6d4", icon: "Users" },
  { name: "Sales & Marketing", description: "Sales operations and marketing processes", color: "#22c55e", icon: "TrendingUp" },
  { name: "Finance & Accounting", description: "Financial and accounting processes", color: "#f59e0b", icon: "DollarSign" },
  { name: "Production & Logistics", description: "Manufacturing and logistics processes", color: "#8b5cf6", icon: "Package" },
  { name: "IT & Technical Support", description: "IT operations and support processes", color: "#3b82f6", icon: "Monitor" },
  { name: "Project Management", description: "Project management and coordination processes", color: "#ec4899", icon: "Calendar" },
  { name: "Customer Service", description: "Customer support and service processes", color: "#14b8a6", icon: "Headphones" }
];

const templates = [
  {
    name: "Employee Hiring Process",
    description: "Standard process for hiring new employees including job posting, interviews, and onboarding",
    categoryIndex: 0, // HR
    processData: {
      blocks: [
        { id: "b1", type: "start", name: "Start Hiring", position: { x: 100, y: 100 } },
        { id: "b2", type: "task", name: "Create Job Posting", description: "Define job requirements and create posting", position: { x: 100, y: 200 } },
        { id: "b3", type: "task", name: "Review Applications", description: "Screen and shortlist candidates", position: { x: 100, y: 300 } },
        { id: "b4", type: "condition", name: "Suitable Candidates?", position: { x: 100, y: 400 } },
        { id: "b5", type: "task", name: "Conduct Interviews", description: "Interview shortlisted candidates", position: { x: 100, y: 500 } },
        { id: "b6", type: "condition", name: "Select Candidate?", position: { x: 100, y: 600 } },
        { id: "b7", type: "task", name: "Make Offer", description: "Prepare and send job offer", position: { x: 100, y: 700 } },
        { id: "b8", type: "task", name: "Onboarding", description: "Complete onboarding process", position: { x: 100, y: 800 } },
        { id: "b9", type: "end", name: "End", position: { x: 100, y: 900 } }
      ],
      connections: [
        { id: "c1", source: "b1", target: "b2", type: "sequence_flow" },
        { id: "c2", source: "b2", target: "b3", type: "sequence_flow" },
        { id: "c3", source: "b3", target: "b4", type: "sequence_flow" },
        { id: "c4", source: "b4", target: "b5", type: "conditional_flow", label: "Yes" },
        { id: "c5", source: "b4", target: "b2", type: "conditional_flow", label: "No" },
        { id: "c6", source: "b5", target: "b6", type: "sequence_flow" },
        { id: "c7", source: "b6", target: "b7", type: "conditional_flow", label: "Yes" },
        { id: "c8", source: "b6", target: "b3", type: "conditional_flow", label: "No" },
        { id: "c9", source: "b7", target: "b8", type: "sequence_flow" },
        { id: "c10", source: "b8", target: "b9", type: "sequence_flow" }
      ]
    },
    tags: ["hiring", "recruitment", "onboarding"]
  },
  {
    name: "Order Processing",
    description: "Standard e-commerce order processing workflow from order receipt to delivery",
    categoryIndex: 1, // Sales
    processData: {
      blocks: [
        { id: "b1", type: "start", name: "Order Received", position: { x: 100, y: 100 } },
        { id: "b2", type: "task", name: "Verify Payment", description: "Check payment status", position: { x: 100, y: 200 } },
        { id: "b3", type: "condition", name: "Payment OK?", position: { x: 100, y: 300 } },
        { id: "b4", type: "task", name: "Check Inventory", description: "Verify product availability", position: { x: 100, y: 400 } },
        { id: "b5", type: "condition", name: "In Stock?", position: { x: 100, y: 500 } },
        { id: "b6", type: "task", name: "Pack Order", description: "Prepare order for shipping", position: { x: 100, y: 600 } },
        { id: "b7", type: "task", name: "Ship Order", description: "Send order to customer", position: { x: 100, y: 700 } },
        { id: "b8", type: "send_notification", name: "Send Tracking", description: "Email tracking info to customer", position: { x: 100, y: 800 } },
        { id: "b9", type: "end", name: "Complete", position: { x: 100, y: 900 } },
        { id: "b10", type: "error_event", name: "Payment Failed", position: { x: 300, y: 300 } },
        { id: "b11", type: "timer_event", name: "Backorder", position: { x: 300, y: 500 } }
      ],
      connections: [
        { id: "c1", source: "b1", target: "b2", type: "sequence_flow" },
        { id: "c2", source: "b2", target: "b3", type: "sequence_flow" },
        { id: "c3", source: "b3", target: "b4", type: "conditional_flow", label: "Yes" },
        { id: "c4", source: "b3", target: "b10", type: "conditional_flow", label: "No" },
        { id: "c5", source: "b4", target: "b5", type: "sequence_flow" },
        { id: "c6", source: "b5", target: "b6", type: "conditional_flow", label: "Yes" },
        { id: "c7", source: "b5", target: "b11", type: "conditional_flow", label: "No" },
        { id: "c8", source: "b6", target: "b7", type: "sequence_flow" },
        { id: "c9", source: "b7", target: "b8", type: "sequence_flow" },
        { id: "c10", source: "b8", target: "b9", type: "sequence_flow" },
        { id: "c11", source: "b11", target: "b4", type: "sequence_flow" }
      ]
    },
    tags: ["orders", "ecommerce", "fulfillment"]
  },
  {
    name: "Document Approval",
    description: "Document review and approval workflow with multiple levels",
    categoryIndex: 5, // Project Management
    processData: {
      blocks: [
        { id: "b1", type: "start", name: "Submit Document", position: { x: 100, y: 100 } },
        { id: "b2", type: "task", name: "Initial Review", description: "Review document for completeness", position: { x: 100, y: 200 } },
        { id: "b3", type: "condition", name: "Complete?", position: { x: 100, y: 300 } },
        { id: "b4", type: "task", name: "Manager Review", description: "Manager reviews document", position: { x: 100, y: 400 } },
        { id: "b5", type: "condition", name: "Approved?", position: { x: 100, y: 500 } },
        { id: "b6", type: "task", name: "Final Approval", description: "Director final approval", position: { x: 100, y: 600 } },
        { id: "b7", type: "condition", name: "Approved?", position: { x: 100, y: 700 } },
        { id: "b8", type: "document", name: "Archive Document", position: { x: 100, y: 800 } },
        { id: "b9", type: "end", name: "Complete", position: { x: 100, y: 900 } },
        { id: "b10", type: "task", name: "Request Changes", description: "Send back for modifications", position: { x: 300, y: 350 } }
      ],
      connections: [
        { id: "c1", source: "b1", target: "b2", type: "sequence_flow" },
        { id: "c2", source: "b2", target: "b3", type: "sequence_flow" },
        { id: "c3", source: "b3", target: "b4", type: "conditional_flow", label: "Yes" },
        { id: "c4", source: "b3", target: "b10", type: "conditional_flow", label: "No" },
        { id: "c5", source: "b4", target: "b5", type: "sequence_flow" },
        { id: "c6", source: "b5", target: "b6", type: "conditional_flow", label: "Yes" },
        { id: "c7", source: "b5", target: "b10", type: "conditional_flow", label: "No" },
        { id: "c8", source: "b6", target: "b7", type: "sequence_flow" },
        { id: "c9", source: "b7", target: "b8", type: "conditional_flow", label: "Yes" },
        { id: "c10", source: "b7", target: "b10", type: "conditional_flow", label: "No" },
        { id: "c11", source: "b8", target: "b9", type: "sequence_flow" },
        { id: "c12", source: "b10", target: "b2", type: "sequence_flow" }
      ]
    },
    tags: ["approval", "documents", "workflow"]
  },
  {
    name: "Customer Support Ticket",
    description: "Customer support ticket handling process from creation to resolution",
    categoryIndex: 6, // Customer Service
    processData: {
      blocks: [
        { id: "b1", type: "start", name: "Ticket Created", position: { x: 100, y: 100 } },
        { id: "b2", type: "task", name: "Categorize Ticket", description: "Classify ticket by type and priority", position: { x: 100, y: 200 } },
        { id: "b3", type: "condition", name: "Priority Level?", position: { x: 100, y: 300 } },
        { id: "b4", type: "task", name: "Assign to Agent", description: "Route to appropriate support agent", position: { x: 100, y: 400 } },
        { id: "b5", type: "task", name: "Investigate Issue", description: "Research and diagnose the problem", position: { x: 100, y: 500 } },
        { id: "b6", type: "task", name: "Provide Solution", description: "Resolve or provide workaround", position: { x: 100, y: 600 } },
        { id: "b7", type: "condition", name: "Resolved?", position: { x: 100, y: 700 } },
        { id: "b8", type: "send_notification", name: "Close Ticket", description: "Send resolution to customer", position: { x: 100, y: 800 } },
        { id: "b9", type: "end", name: "Complete", position: { x: 100, y: 900 } },
        { id: "b10", type: "escalation_event", name: "Escalate", description: "Escalate to senior support", position: { x: 300, y: 350 } }
      ],
      connections: [
        { id: "c1", source: "b1", target: "b2", type: "sequence_flow" },
        { id: "c2", source: "b2", target: "b3", type: "sequence_flow" },
        { id: "c3", source: "b3", target: "b4", type: "conditional_flow", label: "Normal" },
        { id: "c4", source: "b3", target: "b10", type: "conditional_flow", label: "High" },
        { id: "c5", source: "b4", target: "b5", type: "sequence_flow" },
        { id: "c6", source: "b5", target: "b6", type: "sequence_flow" },
        { id: "c7", source: "b6", target: "b7", type: "sequence_flow" },
        { id: "c8", source: "b7", target: "b8", type: "conditional_flow", label: "Yes" },
        { id: "c9", source: "b7", target: "b5", type: "conditional_flow", label: "No" },
        { id: "c10", source: "b8", target: "b9", type: "sequence_flow" },
        { id: "c11", source: "b10", target: "b4", type: "sequence_flow" }
      ]
    },
    tags: ["support", "tickets", "customer service"]
  },
  {
    name: "Purchase Request",
    description: "Internal purchase request and procurement workflow",
    categoryIndex: 2, // Finance
    processData: {
      blocks: [
        { id: "b1", type: "start", name: "Request Created", position: { x: 100, y: 100 } },
        { id: "b2", type: "data_input", name: "Enter Details", description: "Item, quantity, budget", position: { x: 100, y: 200 } },
        { id: "b3", type: "condition", name: "Budget Check", position: { x: 100, y: 300 } },
        { id: "b4", type: "task", name: "Manager Approval", description: "Department manager review", position: { x: 100, y: 400 } },
        { id: "b5", type: "condition", name: "Approved?", position: { x: 100, y: 500 } },
        { id: "b6", type: "task", name: "Get Quotes", description: "Request vendor quotes", position: { x: 100, y: 600 } },
        { id: "b7", type: "task", name: "Select Vendor", description: "Choose best offer", position: { x: 100, y: 700 } },
        { id: "b8", type: "task", name: "Create PO", description: "Generate purchase order", position: { x: 100, y: 800 } },
        { id: "b9", type: "end", name: "Complete", position: { x: 100, y: 900 } }
      ],
      connections: [
        { id: "c1", source: "b1", target: "b2", type: "sequence_flow" },
        { id: "c2", source: "b2", target: "b3", type: "sequence_flow" },
        { id: "c3", source: "b3", target: "b4", type: "conditional_flow", label: "Within" },
        { id: "c4", source: "b4", target: "b5", type: "sequence_flow" },
        { id: "c5", source: "b5", target: "b6", type: "conditional_flow", label: "Yes" },
        { id: "c6", source: "b5", target: "b2", type: "conditional_flow", label: "No" },
        { id: "c7", source: "b6", target: "b7", type: "sequence_flow" },
        { id: "c8", source: "b7", target: "b8", type: "sequence_flow" },
        { id: "c9", source: "b8", target: "b9", type: "sequence_flow" }
      ]
    },
    tags: ["purchasing", "procurement", "finance"]
  }
];

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log("Seeding Process Builder data...");

    // Insert categories
    console.log("Adding categories...");
    const categoryIds = [];
    for (const cat of categories) {
      const result = await client.query(
        `INSERT INTO builder_categories (name, description, color, icon, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [cat.name, cat.description, cat.color, cat.icon]
      );
      if (result.rows[0]) {
        categoryIds.push(result.rows[0].id);
        console.log(`  Added category: ${cat.name}`);
      }
    }

    // Insert templates
    console.log("Adding templates...");
    for (const template of templates) {
      const categoryId = categoryIds[template.categoryIndex] || null;
      await client.query(
        `INSERT INTO builder_templates (name, description, category_id, is_system, is_published, process_data, tags, created_at, updated_at)
         VALUES ($1, $2, $3, 1, 1, $4, $5, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [
          template.name,
          template.description,
          categoryId,
          JSON.stringify(template.processData),
          JSON.stringify(template.tags)
        ]
      );
      console.log(`  Added template: ${template.name}`);
    }

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
