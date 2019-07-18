'use strict';

exports.appendMap = (baseMap, newMap) => {
  let resultMap = {
    imports: Object.assign({}, baseMap.imports),
    scopes: Object.assign({}, baseMap.scopes),
  };
  return resultMap;
};

