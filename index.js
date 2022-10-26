const { readFileSync, writeFileSync, lstatSync } = require('fs');
const { join } = require('path');
const importCwd = require('import-cwd');
const walkSync = require('walk-sync');
const semver = require('semver');

function ignoreError(error) {
  const ruleIds = error.messages.map((message) => message.ruleId);
  let uniqueIds = [...new Set(ruleIds)];

  const file = readFileSync(error.filePath, 'utf8');

  const firstLine = file.split('\n')[0];

  // The whitespace after `eslint-disable` is important so `eslint-disable-next-line` and variants
  // aren't picked up.
  const matched = firstLine.match(/eslint-disable (.*)\*\//);

  if (matched) {
    const existing = matched[1].split(',').map((item) => item.trim());
    uniqueIds = [...new Set([...ruleIds, ...existing])];
    uniqueIds.sort((a, b) => a.localeCompare(b));

    const replacement = uniqueIds.length ? `/* eslint-disable ${uniqueIds.join(', ')} */\n` : '';
    writeFileSync(error.filePath, file.replace(/^.*\n/, replacement));
  } else if (uniqueIds.length) {
    uniqueIds.sort((a, b) => a.localeCompare(b));
    writeFileSync(error.filePath, `/* eslint-disable ${uniqueIds.join(', ')} */\n${file}`);
  }
}

async function ignoreAll(cwd = process.cwd()) {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const currentPackageJSON = require(join(cwd, 'package.json'));

  const eslintVersion = currentPackageJSON.devDependencies.eslint;

  let cli;
  let report;
  let results;

  const eslint = importCwd('eslint');

  if (semver.intersects(eslintVersion, '8')) {
    // this won't use the version in the repo but it will still use v8 because
    // that is installed in this repo
    const { ESLint } = eslint;
    cli = new ESLint();
    results = await cli.lintFiles([cwd]);

    // remove warnings
    results = ESLint.getErrorResults(results);
  } else {
    const { CLIEngine, ESLint } = eslint;
    cli = new CLIEngine();
    report = cli.executeOnFiles([cwd]);
    results = report.results;

    // remove warnings
    results = ESLint.getErrorResults(results);
  }

  const errors = results.filter((result) => result.errorCount > 0);

  errors.forEach(ignoreError);
}

function list(cwd = process.cwd()) {
  let ignoreFile;

  try {
    ignoreFile = readFileSync(join(cwd, '.gitignore'), 'utf8')
      .split('\n')
      .filter((line) => line.length)
      .filter((line) => !line.startsWith('#'))
      .map((line) => line.replace(/^\//, ''))
      .map((line) => line.replace(/\/$/, '/*'));
  } catch (e) {
    // noop
  }

  const files = walkSync(cwd, {
    globs: ['**/*.js', '**/*.ts'],
    ignore: ignoreFile || ['node_modules/*'],
  });

  const output = {};

  files.forEach((relativeFilePath) => {
    const filePath = join(cwd, relativeFilePath);
    // prevent odd times when directories might end with `.js` or `.ts`;
    if (!lstatSync(filePath).isFile()) {
      return;
    }

    const file = readFileSync(filePath, 'utf8');
    const firstLine = file.split('\n')[0];
    if (!firstLine.includes('eslint-disable ')) {
      return;
    }

    const matched = firstLine.match(/eslint-disable (.*)\*\//);
    const ignoreRules = matched[1].split(',').map((item) => item.trim());

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

module.exports = {
  ignoreAll,
  list,
};
