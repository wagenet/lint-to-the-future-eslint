import { expect } from 'chai';

// eslint-disable-next-line import/extensions
import { list } from '../index.js';

describe('list function', function () {
  it('should output object with rules and files', function () {
    const result = list('./test/fixtures/list');
    expect(result).to.deep.equal({
      'no-unused-vars': [
        'test/fixtures/list/index.js',
        'test/fixtures/list/next-line-ignore.js',
      ],
      'prefer-const': [
        'test/fixtures/list/index.js',
      ],
      quotes: [
        'test/fixtures/list/index.js',
        'test/fixtures/list/next-line-ignore.js',
      ],
      semi: [
        'test/fixtures/list/index.js',
        'test/fixtures/list/next-line-ignore.js',
      ],
    });
  });
});
