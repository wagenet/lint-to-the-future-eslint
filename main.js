const { readFileSync, writeFileSync, lstatSync } = require('fs');
const { join } = require('path');
const importCwd = require('import-cwd');
const walkSync = require('walk-sync');

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
  let ignoreFile;

  try {
    ignoreFile = readFileSync(join(process.cwd(), '.gitignore'), 'utf8')
      .split('\n')
      .filter(line => line.length)
      .filter(line => !line.startsWith('#'))
      .map(line => line.replace(/^\//, ''))
      .map(line => line.replace(/\/$/, '/*'));
  } catch (e) {
    // noop
  }

  const files = walkSync(process.cwd(), {
    globs: ['**/*.js'],
    ignore: ignoreFile || ['node_modules/*'],
  });

  const output = {};

  files.forEach((filePath) => {
    // prevent odd times when directories might end with `.js`;
    if (!lstatSync(filePath).isFile()) {
      return;
    }

    const file = readFileSync(filePath, 'utf8');
    const firstLine = file.split('\n')[0];
    if (!firstLine.includes('eslint-disable ')) {
      return;
    }

    const matched = firstLine.match(/eslint-disable (.*)\*\//);
    const ignoreRules = matched[1].split(',').map(item => item.trim());

    ignoreRules.forEach((rule) => {
      if (output[rule]) {
        output[rule].push(filePath);
      } else {
        output[rule] = [filePath];
      }
    });
  });

  return output;
}
