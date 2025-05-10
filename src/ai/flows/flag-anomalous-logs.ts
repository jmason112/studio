'use server';
/**
 * @fileOverview An anomaly detection AI agent for cybersecurity logs.
 *
 * - flagAnomalousLogs - A function that handles the anomaly detection process.
 * - FlagAnomalousLogsInput - The input type for the flagAnomalousLogs function.
 * - FlagAnomalousLogsOutput - The return type for the flagAnomalousLogs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FlagAnomalousLogsInputSchema = z.object({
  logData: z
    .string()
    .describe('Cybersecurity log data in JSON format.'),
});
export type FlagAnomalousLogsInput = z.infer<typeof FlagAnomalousLogsInputSchema>;

const FlagAnomalousLogsOutputSchema = z.object({
  anomalousEvents: z.array(
    z.object({
      timestamp: z.string().describe('Timestamp of the event.'),
      source: z.string().describe('Source of the log event.'),
      severity: z.string().describe('Severity level of the event.'),
      message: z.string().describe('Log message.'),
      isAnomalous: z.boolean().describe('Whether the event is anomalous.'),
      explanation: z.string().describe('Explanation of why the event is flagged as anomalous.'),
    })
  ).describe('Array of anomalous events flagged in the log data.'),
});
export type FlagAnomalousLogsOutput = z.infer<typeof FlagAnomalousLogsOutputSchema>;

export async function flagAnomalousLogs(input: FlagAnomalousLogsInput): Promise<FlagAnomalousLogsOutput> {
  return flagAnomalousLogsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'flagAnomalousLogsPrompt',
  input: {schema: FlagAnomalousLogsInputSchema},
  output: {schema: FlagAnomalousLogsOutputSchema},
  prompt: `You are a cybersecurity expert analyzing log data to identify anomalous events.

  Analyze the following log data and flag any events that are potentially malicious or indicative of a security threat. Explain why each event is considered anomalous.

  Log Data:
  {{logData}}

  Return a JSON array of anomalous events, including the timestamp, source, severity, message, isAnomalous flag, and an explanation for each.
  `,
});

const flagAnomalousLogsFlow = ai.defineFlow(
  {
    name: 'flagAnomalousLogsFlow',
    inputSchema: FlagAnomalousLogsInputSchema,
    outputSchema: FlagAnomalousLogsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
