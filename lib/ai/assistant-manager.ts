import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AssistantConfig {
  name: string;
  instructions: string;
  model?: string;
  tools?: any[];
}

export class AssistantManager {
  private assistantId: string | null = null;

  async getPersistentAssistantId(): Promise<string> {
    // Use the persistent assistant ID from environment
    const persistentId = process.env.OPENAI_ASSISTANT_ID;
    if (!persistentId) {
      throw new Error("OPENAI_ASSISTANT_ID not found in environment variables. Please run the setup script first.");
    }
    return persistentId;
  }

  async runAssistant(assistantId: string, message: string): Promise<string> {
    try {
      console.log("🔍 Running Assistant with ID:", assistantId);

      // Create a thread
      const thread = await openai.beta.threads.create();
      console.log("✅ Thread created:", thread.id);

      // Add message to thread
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: message
      });
      console.log("✅ Message added to thread");

      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId
      });
      console.log("✅ Run started:", run.id);

      // Wait for completion
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      let attempts = 0;
      const maxAttempts = 30; // 1 minute timeout
      
      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
        console.log(`⏳ Assistant status: ${runStatus.status} (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Assistant run timed out after 1 minute");
      }

      if (runStatus.status === 'failed') {
        console.error("Assistant run failed:", runStatus.last_error);
        throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
      }

      if (runStatus.status !== 'completed') {
        throw new Error(`Unexpected run status: ${runStatus.status}`);
      }

      // Get the response
      const messages = await openai.beta.threads.messages.list(thread.id);
      console.log(`📝 Retrieved ${messages.data.length} messages`);
      
      const assistantMessage = messages.data[0];
      
      if (!assistantMessage || assistantMessage.role !== 'assistant') {
        throw new Error("No response from assistant");
      }

      const response = assistantMessage.content[0];
      if (response.type !== 'text') {
        throw new Error("Unexpected response type from assistant");
      }

      console.log("✅ Assistant completed successfully");
      return response.text.value;

    } catch (error) {
      console.error("Error running assistant:", error);
      console.error("Full error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      throw new Error(`Failed to run assistant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    try {
      await openai.beta.assistants.delete(assistantId);
      console.log(`🗑️ Assistant ${assistantId} deleted`);
    } catch (error) {
      console.error("Error deleting assistant:", error);
    }
  }

  async getOrCreateAssistant(): Promise<string> {
    return await this.getPersistentAssistantId();
  }
}

// Export a singleton instance
export const assistantManager = new AssistantManager();
