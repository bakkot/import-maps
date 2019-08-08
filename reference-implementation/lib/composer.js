'use strict';
const { getFallbacks } = require('./resolver.js');
const { sortObjectKeysByLongestFirst } = require('./utils.js');

exports.appendMap = (baseMap, newMap) => {
  return {
    imports: joinHelper(baseMap, baseMap.imports, newMap.imports, null),
    scopes: sortObjectKeysByLongestFirst(Object.assign(
      clone(baseMap.scopes),
      mapValues(newMap.scopes, (scopePrefix, scopeMapping) => joinHelper(
        baseMap,
        baseMap.scopes[scopePrefix] || {},
        scopeMapping,
        scopePrefix
      ))
    ))
  };
};

function joinHelper(baseMap, oldSpecifierMap, newSpecifierMap, resolutionContext) {
  const resolvedNewSpecifierMap = mapValues(
    newSpecifierMap,
    (moduleSpecifier, fallbacks) => fallbacks.flatMap(fallback => getFallbacks(fallback, baseMap, resolutionContext))
  );
  return Object.assign(clone(oldSpecifierMap), resolvedNewSpecifierMap);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function mapValues(obj, fn) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(k, v)]));
}
