import { expect } from 'chai';
import temp from 'temp';
import fixturify from 'fixturify';
import { execa } from 'execa';
import { resolve } from 'import-meta-resolve';
import { dirname } from 'path';
import { readFileSync } from 'fs';
import { pkgUp } from 'pkg-up';

// eslint-disable-next-line import/extensions
import { ignoreAll } from '../index.js';

// this really shouldn't be so hard 🙈
async function getEslintVersion() {
  let eslintPath = await resolve('eslint', import.meta.url);
  eslintPath = eslintPath.replace(/^file:\/\//, '');
  const eslintPackage = await pkgUp({
    cwd: dirname(eslintPath),
  });
  const eslintPackageObj = JSON.parse(readFileSync(eslintPackage));
  return eslintPackageObj.version;
}

const eslintVersion = await getEslintVersion();

describe('ignore function', function () {
  this.timeout(20000);

  it('should not crash with ^ in eslint dependency', async function () {
    const tempDir = await temp.mkdir('super-app');

    fixturify.writeSync(tempDir, {
      '.eslintrc.json': '{"extends": "eslint:recommended"}',
      'test.js': 'debugger',
      'package.json': `{
  "devDependencies": {
    "eslint": "^${eslintVersion}"
  }
}
`,
    });

    let result = await execa('npm', ['i'], { cwd: tempDir });

    await ignoreAll(tempDir);

    result = fixturify.readSync(tempDir);

    expect(result['test.js']).to.equal(`/* eslint-disable no-debugger */
debugger`);
  });

  it(`should work with eslint ${eslintVersion}`, async function () {
    const tempDir = await temp.mkdir('super-app');

    fixturify.writeSync(tempDir, {
      '.eslintrc.json': '{"extends": "eslint:recommended"}',
      'test.js': 'debugger',
      'package.json': `{
  "devDependencies": {
    "eslint": "${eslintVersion}"
  }
}
`,
    });

    let result = await execa('npm', ['i'], { cwd: tempDir });

    await ignoreAll(tempDir);

    result = fixturify.readSync(tempDir);

    expect(result['test.js']).to.equal(`/* eslint-disable no-debugger */
debugger`);
  });

  it('should handle files with invalid `// eslint-disable` comments at the top', async function () {
    this.timeout(20000);
    const tempDir = await temp.mkdir('super-app');

    fixturify.writeSync(tempDir, {
      '.eslintrc.json': '{"extends": "eslint:recommended"}',
      'test.js': `// eslint-disable no-debugger
debugger`,
      'package.json': `{
  "devDependencies": {
    "eslint": "${eslintVersion}"
  }
}
`,
    });

    let result = await execa('npm', ['i'], { cwd: tempDir });

    await ignoreAll(tempDir);

    result = fixturify.readSync(tempDir);

    expect(result['test.js']).to.equal(`/* eslint-disable no-debugger */
// eslint-disable no-debugger
debugger`);
  });

  it('should add to existing `/* eslint-disable` comments', async function () {
    const tempDir = await temp.mkdir('super-app');

    fixturify.writeSync(tempDir, {
      '.eslintrc.json': '{"extends": "eslint:recommended"}',
      'test.js': `/* eslint-disable no-console, no-undef */
debugger
console.log('test')`,
      'package.json': `{
  "devDependencies": {
    "eslint": "${eslintVersion}"
  }
}
`,
    });

    let result = await execa('npm', ['i'], { cwd: tempDir });

    await ignoreAll(tempDir);

    result = fixturify.readSync(tempDir);

    expect(result['test.js']).to
      .equal(`/* eslint-disable no-debugger, no-console, no-undef */
debugger
console.log('test')`);
  });

  it('handles `// eslint-disable-next-line` at the top of the file correctly', async function () {
    const tempDir = await temp.mkdir('super-app');

    fixturify.writeSync(tempDir, {
      '.eslintrc.json': '{"extends": "eslint:recommended"}',
      'test.js': `/* eslint-disable-next-line no-debugger */
debugger
console.log('test')`,
      'package.json': `{
  "devDependencies": {
    "eslint": "${eslintVersion}"
  }
}
`,
    });

    let result = await execa('npm', ['i'], { cwd: tempDir });

    await ignoreAll(tempDir);

    result = fixturify.readSync(tempDir);

    expect(result['test.js']).to.equal(`/* eslint-disable no-undef */
/* eslint-disable-next-line no-debugger */
debugger
console.log('test')`);
  });

  it('handles rules with slashes in the name', async function () {
    const tempDir = await temp.mkdir('super-app');

    fixturify.writeSync(tempDir, {
      '.eslintrc.json': '{"extends": "eslint:recommended"}',
      'test.js': `/* eslint-disable ember/no-observers */
debugger`,
      'package.json': `{
  "devDependencies": {
    "eslint": "${eslintVersion}"
  }
}
`,
    });

    let result = await execa('npm', ['i'], { cwd: tempDir });

    await ignoreAll(tempDir);

    result = fixturify.readSync(tempDir);

    expect(result['test.js']).to
      .equal(`/* eslint-disable ember/no-observers, no-debugger */
debugger`);
  });
});
