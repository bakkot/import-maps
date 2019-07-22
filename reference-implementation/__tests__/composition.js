'use strict';
const { URL } = require('url');
const { parseFromString } = require('../lib/parser.js');
const { resolve } = require('../lib/resolver.js');
const { appendMap } = require('../lib/composer.js');

const mapBaseURL = new URL('https://example.com/app/index.html');
const scriptURL = new URL('https://example.com/js/app.mjs');

function composeMaps(mapLikes) {
  if (!Array.isArray(mapLikes) || mapLikes.length < 1) {
    throw new Error('composeMaps must be given a non-empty array of mapLikes');
  }
  let map = parseFromString(JSON.stringify(mapLikes.shift()), mapBaseURL);;
  for (const mapLike of mapLikes) {
    let newMap = parseFromString(JSON.stringify(mapLike), mapBaseURL);
    map = appendMap(map, newMap);
  }
  return JSON.parse(JSON.stringify(map));
}

describe('Composition', () => {
  it('should compose with the empty map on the left', () => {
    let map = parseFromString(JSON.stringify({
      imports: { 'https://a/': ['https://b/'] },
      scopes: {
        'https://c/': { 'https://d/': ['https://e/'] },
      },
    }), mapBaseURL);

    let resultMap = appendMap(parseFromString("{}", mapBaseURL), map);

    expect(resultMap).toStrictEqual(map);
    expect(resultMap.imports).not.toBe(map.imports);
    Object.entries(resultMap.imports).forEach(([k, v]) => {
      expect(v).not.toBe(map.imports[k]);
    });
    expect(resultMap.scopes).not.toBe(map.scopes);
    Object.entries(resultMap.scopes).forEach(([k, v]) => {
      expect(v).not.toBe(map.scopes[k]);
    });
  });

  it('should compose with the empty map on the right', () => {
    let map = parseFromString(JSON.stringify({
      imports: { 'https://a/': ['https://b/'] },
      scopes: {
        'https://c/': { 'https://d/': ['https://e/'] },
      },
    }), mapBaseURL);

    let resultMap = appendMap(map, parseFromString("{}", mapBaseURL));

    expect(resultMap).toStrictEqual(map);
    expect(resultMap.imports).not.toBe(map.imports);
    Object.entries(resultMap.imports).forEach(([k, v]) => {
      expect(v).not.toBe(map.imports[k]);
    });
    expect(resultMap.scopes).not.toBe(map.scopes);
    Object.entries(resultMap.scopes).forEach(([k, v]) => {
      expect(v).not.toBe(map.scopes[k]);
    });
  });

  it('should compose maps that do not interact in any way', () => {
    expect(composeMaps([
      {
        imports: { 'https://a/': 'https://b/' },
      },
      {
        imports: { 'https://c/': 'https://d/' },
      },
      {
        imports: { 'https://e/': 'https://f/' },
      },
    ])).toStrictEqual({
      imports: {
        'https://a/': ['https://b/'],
        'https://c/': ['https://d/'],
        'https://e/': ['https://f/'],
      },
      scopes: {},
    });
  });

  it('should compose maps that interact via cascading', () => {
    expect(composeMaps([
      {
        imports: { 'https://c/': 'https://d/' },
      },
      {
        imports: { 'https://b/': 'https://c/' },
      },
      {
        imports: { 'https://a/': 'https://b/' },
      },
    ])).toStrictEqual({
      imports: {
        'https://a/': ['https://d/'],
        'https://b/': ['https://d/'],
        'https://c/': ['https://d/'],
      },
      scopes: {},
    });
  });

  it('should compose maps with fallbacks that interact via cascading', () => {
    expect(composeMaps([
      {
        imports: { 'https://e/': ['https://g/', 'https://h/'] },
      },
      {
        imports: {
          'https://c/': ['https://f/'],
          'https://b/': ['https://d/', 'https://e/'],
        },
      },
      {
        imports: { 'https://a/': ['https://b/', 'https://c/'] },
      },
    ])).toStrictEqual({
      imports: {
        'https://a/': ['https://d/', 'https://g/', 'https://h/', 'https://f/'],
        'https://b/': ['https://d/', 'https://g/', 'https://h/'],
        'https://c/': ['https://f/'],
        'https://e/': ['https://g/', 'https://h/'],
      },
      scopes: {},
    });
  });

  it('should compose maps that are using the virtualisation patterns we expect to see in the wild', () => {
    expect(composeMaps([
      {
        imports: {
          'std:built-in': 'https://built-in-enhancement-1/',
        },
        scopes: {
          'https://built-in-enhancement-1/': {
            'std:built-in': 'std:built-in',
          },
        },
      },
      {
        imports: {
          'std:built-in': 'https://built-in-enhancement-2/',
        },
        scopes: {
          'https://built-in-enhancement-2/': {
            'std:built-in': 'std:built-in',
          },
        },
      },
      {
       imports: {
         'std:built-in': 'https://built-in-enhancement-3/',
       },
       scopes: {
         'https://built-in-enhancement-3/': {
           'std:built-in': 'std:built-in',
         },
       },
      },
    ])).toStrictEqual({
      imports: { 'std:built-in': ['https://built-in-enhancement-3/'] },
      scopes: {
        'https://built-in-enhancement-1/': { 'std:built-in': ['std:built-in'] },
        'https://built-in-enhancement-2/': { 'std:built-in': ['https://built-in-enhancement-1/'] },
        'https://built-in-enhancement-3/': { 'std:built-in': ['https://built-in-enhancement-2/'] },
      },
    });
  });

  it('should compose "nested" scopes', () => {
    expect(composeMaps([
      {
        imports: { 'https://a/': 'https://b/' },
        scopes: {
          'https://example.com/x/y/': { 'https://c/': 'https://d/' },
          'https://example.com/x/y/z': { 'https://e/': 'https://f/' },
        },
      },
      {
        imports: { 'https://m/': 'https://n/' },
        scopes: {
          'https://example.com/x/y/z': {
            'https://g/': 'https://a/',
            'https://h/': 'https://c/',
            'https://i/': 'https://e/',
          },
        },
      },
    ])).toStrictEqual({
      imports: {
        'https://a/': ['https://b/'],
        'https://m/': ['https://n/'],
      },
      scopes: {
        'https://example.com/x/y/': { 'https://c/': ['https://d/'] },
        'https://example.com/x/y/z': {
          'https://e/': ['https://f/'],
          'https://g/': ['https://b/'],
          'https://h/': ['https://d/'],
          'https://i/': ['https://f/'],
        },
      },
    });
  });

  it('should not clobber earlier more-specific scopes with later less-specific scopes', () => {
    expect(composeMaps([
      {
        imports: {},
        scopes: {
          'https://example.com/x/y/': { 'https://a/': 'https://b/' },
          'https://example.com/x/y/z': { 'https://c/': 'https://d/' },
        },
      },
      {
        imports: {
          'https://a/': 'https://e/'
        },
        scopes: {
          'https://example.com/x/': {
            'https://c/': 'https://f/',
          },
        },
      },
    ])).toStrictEqual({
      imports: {
        'https://a/': ['https://e/'],
      },
      scopes: {
        'https://example.com/x/': { 'https://c/': ['https://f/'] },
        'https://example.com/x/y/': { 'https://a/': ['https://b/'] },
        'https://example.com/x/y/z': { 'https://c/': ['https://d/'] },
      },
    });
  });

  // this test should probably be deleted: its description is now wrong, and it's behavior is covered by the previous test
  it('should resolve unscoped things through all of earlier maps\' scopes', () => {
    expect(composeMaps([
      {
        imports: {},
        scopes: {
          'https://a/': {
            'https://b/': 'https://c/',
            'https://d/': 'https://e/'
          }
        }
      },
      {
        imports: {
          'https://d/': 'https://b/',
        },
        scopes: {},
      },
    ])).toStrictEqual({
      imports: {
        'https://d/': ['https://b/'],
      },
      scopes: {
        'https://a/': {
          'https://b/': ['https://c/'],
          'https://d/': ['https://e/'],
        }
      },
    });
  });
});

