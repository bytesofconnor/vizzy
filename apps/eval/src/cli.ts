#!/usr/bin/env node
/* eslint-disable no-console */

import { Command } from 'commander';
import { cannedRun } from './canned';
import { payloadFromRun } from './payload';
import { publishPayload } from './publish';
import { formatReportText, reportFromRun } from './report';

const program = new Command();

program
  .name('vizzy-eval')
  .description('Score the canned chart grid. Publish a summary to Convex with --publish.')
  .version('0.1.0');

program
  .command('run')
  .description('24 prompts × 2 models × 2 seeds. No compose API.')
  .option('--json', 'Print the Convex payload')
  .option('--publish', 'Write the payload to Convex (CONVEX_URL + COMPOSE_SERVER_SECRET)')
  .action(async (opts: { json?: boolean; publish?: boolean }) => {
    const run = cannedRun();
    const payload = payloadFromRun(run);
    if (opts.publish) {
      await publishPayload(payload);
    }
    if (opts.json) {
      console.log(JSON.stringify(payload, null, 2));
      return;
    }
    console.log(formatReportText(reportFromRun(run)));
    if (opts.publish) {
      console.log('\nRecorded in Convex.');
    }
  });

program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
