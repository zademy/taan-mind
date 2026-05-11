/**
 * @file Chat activity panel utilities.
 *
 * Provides types and helper functions for rendering the chat activity sidebar.
 * Extracts tool invocations, token usage summaries, streaming progress
 * indicators, and witty status messages to keep the user informed while
 * the AI processes their request.
 */

import { getToolName, isToolUIPart } from 'ai'
import type { UIMessage } from 'ai'
import { isToolStreaming } from '@nuxt/ui/utils/ai'

/** Current lifecycle state of a chat conversation. */
export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

/** Token usage metrics reported by the AI provider after a generation completes. */
export type ChatUsage = {
  /** Number of input (prompt) tokens consumed, or `null` if not reported. */
  inputTokens: number | null
  /** Number of output (completion) tokens generated, or `null` if not reported. */
  outputTokens: number | null
  /** Total tokens (input + output), or `null` if not reported. */
  totalTokens: number | null
  /** Breakdown of input token categories (cached, non-cached, cache writes). */
  inputTokenDetails?: {
    noCacheTokens: number | null
    cacheReadTokens: number | null
    cacheWriteTokens: number | null
  }
  /** Breakdown of output token categories (text, reasoning). */
  outputTokenDetails?: {
    textTokens: number | null
    reasoningTokens: number | null
  }
}

/** Represents a single tool invocation displayed in the activity panel. */
export type ToolActivity = {
  /** Internal tool name (e.g. `'chart'`, `'weather'`). */
  name: string
  /** Human-readable label for display. */
  label: string
  /** Lucide icon class for the tool. */
  icon: string
  /** Whether the tool is still streaming its result. */
  streaming: boolean
  /** Optional detail text (search query, location, chart title). */
  detail?: string
}

/** Aggregated token counts for a conversation, with an estimation flag. */
export type TokenSummary = {
  /** Input (prompt) tokens. */
  inputTokens: number
  /** Output (completion) tokens. */
  outputTokens: number
  /** Total tokens (input + output). */
  totalTokens: number
  /** `true` when values are approximated because the provider did not report usage. */
  estimated: boolean
}

/**
 * Rotating status messages shown while the AI is processing.
 * Selected deterministically based on conversation state to avoid flicker.
 */
const WITTY_MESSAGES = [
  'Negotiating with tokens. They brought snacks.',
  'Reading context like a detective with better lighting.',
  'Asking the model nicely. Bribery not required.',
  'Sorting thoughts into tiny responsible drawers.',
  'Checking the receipts before sounding confident.',
  'Warming up the answer engine. Tiny hamsters engaged.',
  'Making sure the useful bits survive the sparkle filter.'
]

/**
 * Extracts tool invocation activities from a list of UI messages.
 *
 * Each tool part is mapped to a {@link ToolActivity} with a display label,
 * icon, streaming state, and an optional detail string derived from the
 * tool's input (e.g. the search query or location).
 *
 * @param messages - All messages in the current conversation.
 * @returns An array of tool activity descriptors.
 */
export function getToolActivities(messages: UIMessage[]): ToolActivity[] {
  return messages
    .flatMap(message => message.parts)
    .filter(isToolUIPart)
    .map(part => {
      const input = part.input as { query?: string; location?: string; title?: string } | undefined
      const name = getToolName(part)

      return {
        name,
        label: getToolLabel(name),
        icon: getToolIcon(name),
        streaming: isToolStreaming(part),
        detail: input?.query || input?.location || input?.title
      }
    })
}

/**
 * Computes a token usage summary for the conversation.
 *
 * When the AI provider reports actual usage metrics those are used directly.
 * Otherwise, a rough estimate is calculated based on character count
 * (≈4 characters per token) and the `estimated` flag is set to `true`.
 *
 * @param messages - All messages in the current conversation.
 * @param usage - Usage metrics from the AI provider, or `null`.
 * @returns A token summary with an estimation flag.
 */
export function getTokenSummary(messages: UIMessage[], usage: ChatUsage | null): TokenSummary {
  if (usage?.inputTokens != null || usage?.outputTokens != null || usage?.totalTokens != null) {
    const inputTokens = usage.inputTokens ?? 0
    const outputTokens = usage.outputTokens ?? 0
    return {
      inputTokens,
      outputTokens,
      totalTokens: usage.totalTokens ?? inputTokens + outputTokens,
      estimated: false
    }
  }

  const lastAssistantMessage = [...messages].reverse().find(message => message.role === 'assistant')
  const inputText = messages
    .filter(message => message.id !== lastAssistantMessage?.id)
    .map(getMessageText)
    .join('\n')
  const outputText = lastAssistantMessage ? getMessageText(lastAssistantMessage) : ''
  const inputTokens = estimateTokens(inputText)
  const outputTokens = estimateTokens(outputText)

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimated: true
  }
}

/**
 * Builds the step-by-step progress indicators for the activity panel.
 *
 * Each item represents a phase of the AI pipeline (analyze, gather context,
 * run tools / plan response, draft response) with `done` and `active` flags
 * that drive the visual progress bar.
 *
 * @param status - Current chat lifecycle state.
 * @param messages - All messages in the current conversation.
 * @param tools - Currently active tool invocations.
 * @returns An ordered array of progress step descriptors.
 */
export function getProgressItems(status: ChatStatus, messages: UIMessage[], tools: ToolActivity[]) {
  const hasUserMessage = messages.some(message => message.role === 'user')
  const hasAssistantMessage = messages.some(
    message => message.role === 'assistant' && getMessageText(message).trim().length > 0
  )
  const hasTool = tools.length > 0
  const hasStreamingTool = tools.some(tool => tool.streaming)

  return [
    {
      label: 'Analyze request',
      done: hasUserMessage,
      active: status === 'submitted'
    },
    {
      label: 'Gather context',
      done: hasUserMessage,
      active: status === 'submitted'
    },
    {
      label: hasTool ? 'Run tools' : 'Plan response',
      done: hasTool ? !hasStreamingTool : hasUserMessage,
      active: hasStreamingTool
    },
    {
      label: 'Draft response',
      done: hasAssistantMessage && status === 'ready',
      active: status === 'streaming'
    }
  ]
}

/**
 * Returns a witty status message for the current processing state.
 *
 * Messages are selected deterministically from {@link WITTY_MESSAGES}
 * using the conversation state as a seed so the text stays stable
 * across re-renders.
 *
 * @param status - Current chat lifecycle state.
 * @param messages - All messages in the current conversation.
 * @param tools - Currently active tool invocations.
 * @returns A human-readable status string.
 */
export function getProgressMessage(
  status: ChatStatus,
  messages: UIMessage[],
  tools: ToolActivity[]
) {
  if (status === 'error') return 'Something tripped. The robots are blaming gravity.'
  if (status === 'ready' && messages.some(message => message.role === 'assistant')) {
    return 'Done. Tokens filed their paperwork.'
  }

  const seed = messages.length * 7 + tools.length * 13 + status.length
  return WITTY_MESSAGES[seed % WITTY_MESSAGES.length]!
}

/**
 * Extracts the plain text content from a UI message by concatenating
 * all text parts and ignoring non-text parts (tool calls, sources, etc.).
 *
 * @param message - The UI message to extract text from.
 * @returns The concatenated text content.
 */
export function getMessageText(message: UIMessage): string {
  return message.parts
    .map(part => (part.type === 'text' && 'text' in part ? part.text : ''))
    .filter(Boolean)
    .join(' ')
}

/**
 * Estimates token count from text using a rough 4-char-per-token heuristic.
 *
 * @param text - The text to estimate tokens for.
 * @returns Estimated token count (0 for empty/whitespace-only text).
 */
function estimateTokens(text: string): number {
  if (!text.trim()) return 0
  return Math.ceil(text.trim().length / 4)
}

/** Maps internal tool names to human-readable display labels. */
function getToolLabel(name: string) {
  return (
    {
      chart: 'Chart',
      weather: 'Weather',
      web_search: 'Web search',
      google_search: 'Google search'
    }[name] || name.replaceAll('_', ' ')
  )
}

/** Maps internal tool names to Lucide icon classes. */
function getToolIcon(name: string) {
  return (
    {
      chart: 'i-lucide-chart-line',
      weather: 'i-lucide-cloud-sun',
      web_search: 'i-lucide-search',
      google_search: 'i-lucide-search'
    }[name] || 'i-lucide-wrench'
  )
}
