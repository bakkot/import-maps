'use strict';

exports.appendMap = (baseMap, newMap) => {
  let resultMap = {
    imports: Object.fromEntries([
      ...Object.entries(baseMap.imports).map(([moduleSpecifier, fallbacks]) =>
        [moduleSpecifier, [...fallbacks]]
      ),
      ...Object.entries(newMap.imports).map(([moduleSpecifier, fallbacks]) =>
        [moduleSpecifier, fallbacks.flatMap(fallback => applyCascadeWithContexts(fallback, [baseMap.imports]))]
      ),
    ]),
    scopes: Object.assign({}, baseMap.scopes),
  };
  return resultMap;
};


// string -> Array<Map<string, Array<string>>> -> Array<string>
function applyCascadeWithContexts(moduleSpecifier, applicableMapContexts) {
  if (applicableMapContexts.length < 1) {
    return [moduleSpecifier];
  }
  let [head, ...tail] = applicableMapContexts;
  return moduleSpecifier in head ? head[moduleSpecifier] : applyCascadeWithContexts(moduleSpecifier, tail);
}

