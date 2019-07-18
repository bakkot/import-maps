'use strict';

exports.appendMap = (baseMap, newMap) => {
  let resultMap = {
    imports: joinHelper(baseMap.imports, newMap.imports, [baseMap.imports]),
    scopes: Object.fromEntries([
      ...Object.entries(baseMap.scopes).map(([scopePrefix, scopeMapping]) =>
        [scopePrefix, Object.fromEntries(simpleMappingCopy(scopeMapping))]
      ),
      ...Object.entries(newMap.scopes).map(([scopePrefix, scopeMapping]) =>
        [scopePrefix, joinHelper(scopePrefix in baseMap.scopes ? baseMap.scopes[scopePrefix] : {}, scopeMapping, findApplicableMapContexts(scopePrefix, baseMap))]
      ),
    ]),
  };
  return resultMap;
};

function simpleMappingCopy(mapping) {
  return Object.entries(mapping).map(([moduleSpecifier, fallbacks]) => [moduleSpecifier, [...fallbacks]]);
}

function joinHelper(baseMapping, newMapping, applicableContexts) {
  return Object.fromEntries([
    // NOTE: we leave duplicate entries in here and rely on Object.fromEntries using a last-wins approach
    ...simpleMappingCopy(baseMapping),
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
    ...applicableScopes.map(scope => map.scopes[scope])
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

