export async function sendMessage({ system, messages, max_tokens = 4096, tools }) {
  const body = {
    system,
    messages,
    model: 'claude-sonnet-4-20250514',
    max_tokens,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error?.message || error.error || `API error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Run an agentic loop: call the API, process tool calls, send results back, repeat.
 *
 * @param {Object} opts
 * @param {string} opts.system - System prompt
 * @param {Array} opts.messages - Conversation messages
 * @param {Array} opts.tools - Tool definitions
 * @param {Function} opts.onToolCall - Callback: (toolName, toolInput) => toolResult
 *   Called for each tool use. Should return a string result and may trigger UI updates.
 * @param {Function} opts.onToolLog - Optional callback: (toolCall) => void
 *   Called to log each tool call for display in the reasoning panel.
 * @returns {Promise<{ message: string, toolCalls: Array }>}
 */
export async function runAgentLoop({ system, messages, tools, onToolCall, onToolLog }) {
  let currentMessages = [...messages];
  const allToolCalls = [];
  let lastText = '';
  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await sendMessage({ system, messages: currentMessages, tools });

    // Extract text blocks and tool_use blocks from the response
    const textBlocks = response.content.filter((b) => b.type === 'text');
    const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

    // Capture any text from this response
    const text = textBlocks.map((b) => b.text).join('\n').trim();
    if (text) lastText = text;

    // Process any tool calls
    if (toolBlocks.length > 0) {
      const toolResults = [];
      for (const block of toolBlocks) {
        const result = onToolCall(block.name, block.input);
        const toolCall = {
          name: block.name,
          input: block.input,
          result,
        };
        allToolCalls.push(toolCall);
        if (onToolLog) onToolLog(toolCall);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }

      // Add assistant response and tool results to messages for next iteration
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];
    }

    // Done if: no tool calls, or stop_reason is end_turn (even if there were also tool calls)
    if (toolBlocks.length === 0 || response.stop_reason === 'end_turn') {
      return { message: lastText, toolCalls: allToolCalls };
    }
  }

  // If we hit the max iterations, return whatever text we captured
  return { message: lastText || '[Agent reached maximum tool iterations]', toolCalls: allToolCalls };
}
