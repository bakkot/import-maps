'use strict';

exports.appendMap = (baseMap, newMap) => {
  let expandedBaseScopes = expandScopes(baseMap.imports, Object.assign(neuter(newMap.scopes), baseMap.scopes));
  let expandedNewScopes = expandScopes(newMap.imports, Object.assign(neuter(baseMap.scopes), newMap.scopes));

  console.log("expandedBaseScopes", JSON.parse(JSON.stringify(expandedBaseScopes)));
  console.log("expandedNewScopes", JSON.parse(JSON.stringify(expandedNewScopes)));

  let resultMap = {
    imports: joinHelper([baseMap.imports], newMap.imports),
    scopes: Object.fromEntries([
      ...Object.entries(expandedNewScopes).map(([scopePrefix, scopeMapping]) => {
        console.log("--");
        console.log("scopePrefix", scopePrefix);
        console.log("expandedBaseScopes[scopePrefix]", JSON.parse(JSON.stringify(expandedBaseScopes[scopePrefix])));
        console.log("joinHelper result", JSON.parse(JSON.stringify(joinHelper([expandedBaseScopes[scopePrefix]], scopeMapping))));
        return [scopePrefix, joinHelper([expandedBaseScopes[scopePrefix]], scopeMapping)]
      }),
    ]),
  };
  return resultMap;
};

function neuter(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k]) => [k, {}]));
}

function joinHelper(applicableContexts, newMapping) {
  return Object.fromEntries([
    ...applicableContexts.flatMap(x => Object.entries(x)).map(([moduleSpecifier, fallbacks]) => [moduleSpecifier, [...fallbacks]]),
    ...Object.entries(newMapping).map(([moduleSpecifier, fallbacks]) =>
      [moduleSpecifier, fallbacks.flatMap(fallback => applyCascadeWithContexts(fallback, applicableContexts))]
    ),
  ]);
}

// string -> Array<Map<string, Array<string>>> -> Array<string>
function applyCascadeWithContexts(moduleSpecifier, applicableMapContexts) {
  if (applicableMapContexts.length < 1) {
    return [moduleSpecifier];
  }
  let [head, ...tail] = applicableMapContexts;
  return moduleSpecifier in head ? head[moduleSpecifier] : applyCascadeWithContexts(moduleSpecifier, tail);
}

function scopesMatchingPrefix(prefix, scopesObject) {
  return Object.keys(scopesObject).filter(scopePrefix =>
    scopePrefix === prefix || (scopePrefix.endsWith('/') && prefix.startsWith(scopePrefix))
  ).sort(shorterLengthThenCodeUnitOrder).map(s => scopesObject[s]);
}

function expandScopes(globalMapping, scopes) {
  return Object.fromEntries(Object.entries(scopes).map(([scopePrefix]) =>
    [scopePrefix, Object.assign({}, globalMapping, ...scopesMatchingPrefix(scopePrefix, scopes))]
  ));
}

function shorterLengthThenCodeUnitOrder(a, b) {
  return compare(a.length, b.length) || compare(a, b);
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
