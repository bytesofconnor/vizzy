#!/usr/bin/env node
/* eslint-disable no-console */

import { Command } from 'commander';
import { aggregateRun } from './aggregate';
import { cannedRun } from './canned';
import { EVAL_GRID } from './grid';
import { formatReportText, reportFromRun } from './report';

const program = new Command();

program
  .name('vizzy-eval')
  .description('Vizzy chart eval lab — grid, mechanical scores, admin recs. Offline by default.')
  .version('0.1.0');

program
  .command('grid')
  .description('Print the 24 prompt cells (style × data situation)')
  .action(() => {
    console.log(JSON.stringify(EVAL_GRID, null, 2));
  });

program
  .command('run')
  .description('Score the canned batch (2 models × 2 seeds × 24 prompts). No network.')
  .option('--json', 'Print the full report JSON')
  .action((opts: { json?: boolean }) => {
    const run = cannedRun();
    const report = reportFromRun(run);
    if (opts.json) {
      console.log(JSON.stringify({ report, stats: aggregateRun(run) }, null, 2));
      return;
    }
    console.log(formatReportText(report));
  });

program
  .command('cases')
  .description('List failing canned cases')
  .action(() => {
    const run = cannedRun();
    const fails = run.cases.filter((row) => !row.pass);
    console.log(
      JSON.stringify(
        fails.map((row) => ({
          promptId: row.promptId,
          model: row.model,
          seed: row.seed,
          issues: row.issues.map((issue) => issue.code),
          prompt: row.prompt.prompt,
        })),
        null,
        2
      )
    );
  });

program.parse();
