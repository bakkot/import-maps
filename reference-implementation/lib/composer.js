'use strict';

exports.appendMap = (baseMap, newMap) => {
  let resultMap = {
    imports: joinHelper([baseMap.imports], newMap.imports),
    scopes: Object.fromEntries([
      ...Object.entries(baseMap.scopes).map(([scopePrefix, scopeMapping]) =>
        [scopePrefix, Object.fromEntries(simpleMappingCopy(scopeMapping))]
      ),
      ...Object.entries(newMap.scopes).map(([scopePrefix, scopeMapping]) =>
        [scopePrefix, joinHelper(findApplicableMapContexts(scopePrefix, baseMap), scopeMapping)]
      ),
    ]),
  };
  return resultMap;
};

function simpleMappingCopy(mapping) {
  return Object.entries(mapping).map(([moduleSpecifier, fallbacks]) => [moduleSpecifier, [...fallbacks]]);
}

function joinHelper(applicableContexts, newMapping) {
  return Object.fromEntries([
    // NOTE: we leave duplicate entries in here and rely on Object.fromEntries using a last-wins approach
    ...applicableContexts.flatMap(x => Object.entries(x)).map(([moduleSpecifier, fallbacks]) => [moduleSpecifier, [...fallbacks]]),
    ...Object.entries(newMapping).map(([moduleSpecifier, fallbacks]) =>
      [moduleSpecifier, fallbacks.flatMap(fallback => applyCascadeWithContexts(fallback, applicableContexts))]
    ),
  ]);
}

function findApplicableMapContexts(urlOrPrefix, map) {
  let applicableScopes = Object.keys(map.scopes).filter(scopePrefix =>
    scopePrefix === urlOrPrefix || (scopePrefix.endsWith('/') && urlOrPrefix.startsWith(scopePrefix))
  );
  return [
    map.imports,
    ...applicableScopes.sort(longerLengthThenCodeUnitOrder).map(scope => map.scopes[scope]),
  ];
}


// string -> Array<Map<string, Array<string>>> -> Array<string>
function applyCascadeWithContexts(moduleSpecifier, applicableMapContexts) {
  if (applicableMapContexts.length < 1) {
    return [moduleSpecifier];
  }
  let [head, ...tail] = applicableMapContexts;
  return moduleSpecifier in head ? head[moduleSpecifier] : applyCascadeWithContexts(moduleSpecifier, tail);
}

function longerLengthThenCodeUnitOrder(a, b) {
  return compare(b.length, a.length) || compare(a, b);
}

function compare(a, b) {
  if (a > b) {
    return 1;
  }
  if (b > a) {
    return -1;
  }
  return 0;
}
