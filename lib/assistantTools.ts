// lib/assistantTools.ts
// Tool interface payloads for OpenAI tool calling.
// You will register these with the OpenAI Responses/Assistants API.

export const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for athlete awards/achievements; return top result URLs.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          max_results: { type: "integer", default: 6, minimum: 1, maximum: 10 }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description: "Fetch and return the cleaned text of a web page.",
      parameters: {
        type: "object",
        properties: { url: { type: "string", format: "uri" } },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "emit_awards",
      description: "Return extracted awards in the PlayerAward schema.",
      parameters: {
        type: "object",
        properties: {
          awards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                player_id: { type: "string" },
                player_name: { type: "string" },
                award_name: { type: "string" },
                award_short_desc: { type: "string" },
                year: { anyOf: [{ type: "integer" }, { type: "string" }] },
                level: { enum: ["HS","College","Pro"] },
                team_or_school: { type: "string" },
                league: { type: "string" },
                source: {
                  type: "object",
                  properties: {
                    site: { type: "string" },
                    url: { type: "string", format: "uri" },
                    accessed_at: { type: "string" }
                  },
                  required: ["site","url"]
                },
                evidence_quote: { type: "string" },
                extractor_confidence: { type: "number" },
                extractor_version: { type: "string" }
              },
              required: ["player_id","player_name","award_name","award_short_desc","year","source"]
            }
          }
        },
        required: ["awards"]
      }
    }
  }
];
