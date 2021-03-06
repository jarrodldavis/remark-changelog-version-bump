const { AssertionError } = require('assert');

const unified = require('unified');

const fixtures = require('./index.fixtures');

describe('unified plugin', function() {
  const plugin = require('..');

  it('should update an mdast document tree for the bumped version', function() {
    const transformer = plugin({ version: '0.1.0' });
    const input = fixtures.input();
    transformer(input);
    expect(input).toEqualNode(fixtures.output());
  });

  describe('attacher', function() {
    it('should attach to a pipeline', function() {
      const pipeline = unified();

      pipeline.use(plugin, { version: '0.1.0' });

      expect(pipeline.attachers.length).withContext('pipeline attachers should contain an element')
                                       .toBe(1);
      expect(pipeline.attachers[0][0]).withContext('the plugin should be a valid attacher')
                                      .toBe(plugin);
    });

    it('should throw if no argument is provided', function() {
      expect(() => plugin()).toThrowError(TypeError, /Cannot destructure property/);
    });

    it('should throw if the `version` property is not provided in the argument', function() {
      expect(() => plugin({})).toThrowError(AssertionError, /`version` property should be a string/);
    });

    it('should throw if the `version` property in the argument is not a string', function() {
      expect(() => plugin({ version: 4 })).toThrowError(AssertionError, /`version` property should be a string/);
    });

    it('should return a transformer', function() {
      const transformer = plugin({ version: '0.1.0' });
      
      expect(transformer).toEqual(jasmine.any(Function));
      expect(transformer.length).withContext('transformer function should have at least one argument for the tree')
                                .toBeGreaterThanOrEqual(1);
    });
  });

  describe('transformer', function() {
    let transformer;

    beforeEach(function() {
      transformer = plugin({ version: '0.1.0' });
    });

    describe('argument validation', function() {
      it('should throw if no tree argument is provided', function() {
        expect(() => transformer()).toThrowError(AssertionError, /node should be an object/);
      });

      it('should throw if a non-object tree argument is provided', function() {
        expect(() => transformer('0.1.0')).toThrowError(AssertionError, /node should be an object/);
      });

      it('should throw if an invalid tree object is provided', function() {
        expect(() => transformer({})).toThrowError(AssertionError, /node should have a type/);
      });
    });

    describe('transformation', function() {
      let tree;

      beforeEach(function() {
        tree = fixtures.input();
        transformer(tree);
      });

      it('should preserve the primary heading', function() {
        expect(tree.children.length).withContext('the primary heading should be present')
                                    .toBeGreaterThan(1);

        const heading = tree.children[0];
        expect(heading).toMatchNode({ type: 'heading', depth: 1 });
        expect(heading).toContainNode({ type: 'text', value: 'Changelog' });
      });

      it('should keep the existing unreleased heading', function() {
        expect(tree).toContainNode({ type: 'heading', depth: 2 });
        expect(tree).toContainNode({ type: 'linkReference', identifier: 'unreleased', label: 'Unreleased' });
      });

      it('should add a heading with the bump version', function() {
        expect(tree).toContainNode({ type: 'heading', depth: 2 });
        expect(tree).toContainNode({ type: 'linkReference', identifier: '0.1.0', label: '0.1.0' });
      });

      it('should keep the existing unreleased link definition', function() {
        expect(tree).toContainNode({ type: 'definition', identifier: 'unreleased', label: 'Unreleased' });
      });

      it('should add a link definition with the bump version', function() {
        expect(tree).toContainNode({ type: 'definition', identifier: '0.1.0', label: '0.1.0' });
      });

      it('should put the bump version heading after the unreleased heading', function() {
        const children = tree.children;
        expect(children.length).withContext('the primary heading and both second-level headings should be present')
                               .toBeGreaterThanOrEqual(3);

        const unreleased = tree.children[1];
        expect(unreleased).withContext('the unreleased heading should be the first second-level heading')
                          .toMatchNode({ type: 'heading', depth: 2 });
        expect(unreleased).withContext('the unreleased heading should be the first second-level heading')
                          .toContainNode({ type: 'linkReference', identifier: 'unreleased', label: 'Unreleased' });

        const bumped = tree.children[2];
        expect(bumped).withContext('the bump version heading should be the second second-level heading')
                      .toMatchNode({ type: 'heading', depth: 2 });
        expect(bumped).withContext('the bump version heading should be the second second-level heading')
                      .toContainNode({ type: 'linkReference', identifier: '0.1.0', label: '0.1.0' })
      });

      it('should put the bump version link definition after the unreleased link definition', function() {
        const children = tree.children;
        expect(children.length).withContext('all headings and both link definitions should be present')
                               .toBeGreaterThanOrEqual(5);

        const unreleased = tree.children[3];
        expect(unreleased).toMatchNode({ type: 'definition', identifier: 'unreleased', label: 'Unreleased' });

        const bumped = tree.children[4];
        expect(bumped).toMatchNode({ type: 'definition', identifier: '0.1.0', label: '0.1.0' });
      });

      it('should update the unreleased link definition comparison URL to start from the bump vesion', function() {
        const unreleased = tree.children[3];
        const comparison = unreleased.url.split('/').pop();
        const [start] = comparison.split('...');
        expect(start).toBe('v0.1.0');
      });

      it('should update the unreleased link definition comparison URL to end at `HEAD`', function() {
        const unreleased = tree.children[3];
        const comparison = unreleased.url.split('/').pop();
        const [_, end] = comparison.split('...');
        expect(end).toBe('HEAD');
      });

      it('should set the bump version link definition comparison URL to start from the previous version', function() {
        const bumped = tree.children[4];
        const comparison = bumped.url.split('/').pop();
        const [start] = comparison.split('...');
        expect(start).toBe('v0.0.1');
      });

      it('should set the bump version link definition comparison URL to end at the bump version', function() {
        const bumped = tree.children[4];
        const comparison = bumped.url.split('/').pop();
        const [_, end] = comparison.split('...');
        expect(end).toBe('v0.1.0');
      });
    });
  });
});
