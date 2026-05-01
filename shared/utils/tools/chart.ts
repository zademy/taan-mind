import { tool } from 'ai'
import { z } from 'zod'
import type { UIToolInvocation } from 'ai'

/** Typed tool invocation for the chart tool, used in Vue components. */
export type ChartUIToolInvocation = UIToolInvocation<typeof chartTool>

/**
 * AI tool for creating line chart visualizations.
 *
 * Generates charts with one or multiple data series, suitable for
 * displaying time-series data, trends, or comparisons.
 * Includes a 1.5-second delay to simulate the loading state in the UI.
 */
export const chartTool = tool({
  description: 'Create a line chart visualization with one or multiple data series. Use this tool to display time-series data, trends, or comparisons between different metrics over time.',
  inputSchema: z.object({
    title: z.string().optional().describe('Title of the chart'),
    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).min(1).describe('REQUIRED: Array of data points (minimum 1 point). Each object must contain the xKey property and all series keys'),
    xKey: z.string().describe('The property name in data objects to use for x-axis values (e.g., "month", "date")'),
    series: z.array(z.object({
      key: z.string().describe('The property name in data objects for this series (must exist in all data points)'),
      name: z.string().describe('Display name for this series in the legend'),
      color: z.string().describe('Hex color code for this line (e.g., "#3b82f6" for blue, "#10b981" for green)')
    })).min(1).describe('Array of series configurations (minimum 1 series). Each series represents one line on the chart'),
    xLabel: z.string().optional().describe('Optional label for x-axis'),
    yLabel: z.string().optional().describe('Optional label for y-axis')
  }),
  execute: async ({ title, data, xKey, series, xLabel, yLabel }) => {
    // Simulate a brief delay to show the loading state in the UI
    await new Promise(resolve => setTimeout(resolve, 1500))

    return {
      title,
      data,
      xKey,
      series,
      xLabel,
      yLabel
    }
  }
})
