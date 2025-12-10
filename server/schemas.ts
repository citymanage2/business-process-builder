/**
 * JSON Schemas for structured outputs from Claude API
 * Note: Descriptions are removed as they may cause "Extra inputs are not permitted" errors
 */

/**
 * JSON Schema for Business Process generation
 * This schema ensures Claude returns valid, parseable process data
 */
export const businessProcessSchema = {
  type: "object",
  properties: {
    title: {
      type: "string"
    },
    description: {
      type: "string"
    },
    startEvent: {
      type: "string"
    },
    endEvent: {
      type: "string"
    },
    stages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" }
        },
        required: ["id", "name", "description"]
      }
    },
    roles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" }
        },
        required: ["id", "name"]
      }
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          stageId: { type: "string" },
          name: { type: "string" },
          roleId: { type: "string" },
          type: {
            type: "string",
            enum: ["Start", "Action", "Decision", "Split", "Merge", "Event", "End"]
          },
          input: { type: "string" },
          actions: {
            type: "array",
            items: { type: "string" }
          },
          output: { type: "string" },
          system: { type: "string" },
          sla: { type: "string" },
          previousSteps: {
            type: "array",
            items: { type: "string" }
          },
          nextSteps: {
            type: "array",
            items: { type: "string" }
          },
          documents: {
            type: "array",
            items: { type: "string" }
          },
          duration: { type: "number" }
        },
        required: ["id", "name", "roleId", "type"]
      }
    },
    branches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          stepId: { type: "string" },
          condition: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                nextStepId: { type: "string" }
              },
              required: ["label", "nextStepId"]
            }
          }
        },
        required: ["id", "stepId", "condition", "options"]
      }
    },
    documents: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string" },
          description: { type: "string" }
        },
        required: ["name", "type"]
      }
    },
    itIntegration: {
      type: "array",
      items: {
        type: "object",
        properties: {
          system: { type: "string" },
          purpose: { type: "string" }
        },
        required: ["system", "purpose"]
      }
    },
    stageDetails: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stageId: { type: "string" },
          whatToDo: { type: "string" },
          where: { type: "string" },
          keyActions: {
            type: "array",
            items: { type: "string" }
          },
          expectedResults: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["stageId", "whatToDo"]
      }
    },
    metrics: {
      type: "object",
      properties: {
        totalTimeMinutes: { type: "number" },
        totalCostRub: { type: "number" },
        roleWorkload: {
          type: "array",
          items: {
            type: "object",
            properties: {
              roleId: { type: "string" },
              roleName: { type: "string" },
              timeMinutes: { type: "number" },
              costRub: { type: "number" },
              salary: { type: "number" }
            },
            required: ["roleId", "roleName", "timeMinutes"]
          }
        }
      }
    },
    crmFunnels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          stages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                automation: { type: "string" }
              },
              required: ["name"]
            }
          }
        },
        required: ["name", "stages"]
      }
    },
    missingDocuments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          purpose: { type: "string" },
          template: { type: "string" }
        },
        required: ["name", "purpose"]
      }
    }
  },
  required: ["title", "stages", "roles", "steps"]
};
