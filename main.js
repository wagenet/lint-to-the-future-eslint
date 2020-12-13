const { readFileSync, writeFileSync } = require('fs');
const importCwd = require('import-cwd');

function ignoreError(error) {
  const ruleIds = error.messages.map(message => message.ruleId);
  let uniqueIds = [...new Set(ruleIds)];

  const file = readFileSync(error.filePath, 'utf8');

  const firstLine = file.split('\n')[0];

  if (firstLine.includes('eslint-disable')) {
    const matched = firstLine.match(/eslint-disable(.*)\*\//);
    const existing = matched[1].split(',').map(item => item.trim());
    uniqueIds = [...new Set([...ruleIds, ...existing])];

    writeFileSync(error.filePath, file.replace(/^.*\n/, `/* eslint-disable ${uniqueIds.join(', ')} */\n`));
  } else {
    writeFileSync(error.filePath, `/* eslint-disable ${uniqueIds.join(', ')} */\n${file}`);
  }
}

export function ignoreAll() {
  const eslint = importCwd('eslint');

  const { CLIEngine } = eslint;

  const cli = new CLIEngine();

  const report = cli.executeOnFiles(['.']);

  const errors = report.results.filter(result => result.errorCount > 0);

  errors.forEach(ignoreError);
}

export function list() {
  throw new Error('listing not supported yet in this plugin');
}
