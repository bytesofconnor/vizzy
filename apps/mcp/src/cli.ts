#!/usr/bin/env node

import { Command } from 'commander';
import { VizzyMCPServer } from './server';

const program = new Command();

program
  .name('vizzy-mcp')
  .description('Vizzy MCP server — chart compiler for agents')
  .version('0.1.0');

program
  .command('start')
  .description('Start the MCP server on stdio')
  .action(async () => {
    const server = new VizzyMCPServer();
    await server.run();
  });

program
  .command('info')
  .description('Show tools and usage')
  .action(() => {
    console.error('Vizzy MCP — chart compiler');
    console.error('Tools: get_schema, validate_config, suggest_chart, compile_chart');
    console.error('Start: vizzy-mcp start');
  });

if (process.argv.length <= 2) {
  const server = new VizzyMCPServer();
  void server.run();
} else {
  program.parse();
}
