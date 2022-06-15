import { execa } from 'execa';
import { expect } from 'chai';
import temp from 'temp';
import fixturify from 'fixturify';

// eslint-disable-next-line import/extensions
import { ignoreAll } from '../index.js';

describe('ignore function', function () {
  it('should not crash with ^ in eslint dependency', async function () {
    this.timeout(20000);
    const tempDir = await temp.mkdir('super-app');

    fixturify.writeSync(tempDir, {
      '.eslintrc.json': '{"extends": "eslint:recommended"}',
      'test.js': 'debugger',
      'package.json': `{
  "devDependencies": {
    "eslint": "^7.17.0"
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

  it('should work with eslint 8', async function () {
    this.timeout(20000);
    const tempDir = await temp.mkdir('super-app');

    fixturify.writeSync(tempDir, {
      '.eslintrc.json': '{"extends": "eslint:recommended"}',
      'test.js': 'debugger',
      'package.json': `{
  "devDependencies": {
    "eslint": "^8.0.0"
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
});
