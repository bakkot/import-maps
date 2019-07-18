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
  let map;
  map = parseFromString("{}", mapBaseURL);
  for (const mapLike of mapLikes) {
    let newMap = parseFromString(JSON.stringify(mapLike), mapBaseURL);
    map = appendMap(map, newMap);
  }
  return map;
}

describe('Composition', () => {
  it('should compose with the empty map on the left', () => {
    let map = {
      imports: { 'https://a': 'https://b' },
      scopes: {
        'https://c': { 'https://d': 'https://e' },
      },
    };

    let resultMap = appendMap(
      parseFromString("{}", mapBaseURL),
      parseFromString(JSON.stringify(map), mapBaseURL),
    );
    expect(resultMap).toStrictEqual(map);
    expect(resultMap.imports).not.toBe(map.imports);
    expect(resultMap.scopes).not.toBe(map.scopes);
    Object.entries(resultMap.scopes).forEach(([k, v]) => {
      expect(v).not.toBe(map.scopes[k]);
    });
  });

  it('should compose with the empty map on the right', () => {
    let map = {
      imports: { 'https://a': 'https://b' },
      scopes: {
        'https://c': { 'https://d': 'https://e' },
      },
    };

    let resultMap = appendMap(
      parseFromString(JSON.stringify(map), mapBaseURL),
      parseFromString("{}", mapBaseURL),
    );
    expect(resultMap).toStrictEqual(map);
    expect(resultMap.imports).not.toBe(map.imports);
    expect(resultMap.scopes).not.toBe(map.scopes);
    Object.entries(resultMap.scopes).forEach(([k, v]) => {
      expect(v).not.toBe(map.scopes[k]);
    });
  });

  it('should compose maps that do not interact in any way', () => {
    expect(composeMaps([
      {
        imports: { 'https://a': 'https://b' },
      },
      {
        imports: { 'https://c': 'https://d' },
      },
      {
        imports: { 'https://e': 'https://f' },
      },
    ])).toStrictEqual({
      imports: {
        'https://a': 'https://b',
        'https://c': 'https://d',
        'https://e': 'https://f',
      },
      scopes: {},
    });
  });

  it('should compose maps that interact via cascading', () => {
    expect(composeMaps([
      {
        imports: { 'https://c': 'https://d' },
      },
      {
        imports: { 'https://b': 'https://c' },
      },
      {
        imports: { 'https://a': 'https://b' },
      },
    ])).toStrictEqual({
      imports: {
        'https://a': 'https://d',
        'https://b': 'https://d',
        'https://c': 'https://d',
      },
      scopes: {},
    });
  });

  it('should compose maps that are using the virtualisation patterns we expect to see in the wild', () => {
    expect(composeMaps([
      {
        imports: { 'std:built-in': 'https://built-in-enhancement-1' },
        scopes: {
          'https://built-in-enhancement-1': { 'std:built-in': 'std:built-in' },
        },
      },
      {
        imports: { 'std:built-in': 'https://built-in-enhancement-2' },
        scopes: {
          'https://built-in-enhancement-2': { 'std:built-in': 'std:built-in' },
        },
      },
      {
        imports: { 'std:built-in': 'https://built-in-enhancement-3' },
        scopes: {
          'https://built-in-enhancement-3': { 'std:built-in': 'std:built-in' },
        },
      },
    ])).toStrictEqual({
      imports: { 'std:built-in': 'https://built-in-enhancement-3' },
      scopes: {
        'https://built-in-enhancement-1': { 'std:built-in': 'std:built-in' },
        'https://built-in-enhancement-2': { 'std:built-in': 'https://built-in-enhancement-1' },
        'https://built-in-enhancement-3': { 'std:built-in': 'https://built-in-enhancement-2' },
      },
    });
  });

  it('should compose "nested" scopes', () => {
    expect(composeMaps([
      {
        imports: { 'https://a': 'https://b' },
        scopes: {
          '/x/y': { 'https://c': 'https://d' },
          '/x/y/z': { 'https://e': 'https://f' },
        },
      },
      {
        imports: { 'https://m': 'https://n' },
        scopes: {
          '/x/y/z': {
            'https://g': 'https://a',
            'https://h': 'https://c',
            'https://i': 'https://e',
          },
        },
      },
    ])).toStrictEqual({
      imports: {
        'https://a': 'https://b',
        'https://m': 'https://n',
      },
      scopes: {
        '/x/y': { 'https://c': 'https://d' },
        '/x/y/z': {
          'https://e': 'https://f',
          'https://g': 'https://b',
          'https://h': 'https://d',
          'https://i': 'https://f',
        },
      },
    });
  });
});

