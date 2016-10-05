var
  _ = require('lodash');

/**
 * Matches documents or messages against stored subscriptions
 *
 * @param {Object} store - DSL storage
 * @constructor
 */
function Matcher (store) {
  this.store = store;
  this.matchers = {
    everything: require('./matchEverything'),
    equals: require('./matchEquals'),
    exists: require('./matchExists')
  };

  /**
   * Matches data against stored subscriptions
   *
   * @param {string} index
   * @param {string} collection
   * @param {Object} data
   * @return {Array}
   */
  this.match = function (index, collection, data) {
    var
      lastOperand = null,
      testTables = this.store.testTables[index][collection].conditionsCount.slice(),
      fieldsIterator,
      field,
      matchedFilters = [];

    while ((lastOperand = pickOperand(this.store.foPairs, index, collection, lastOperand)) !== undefined) {
      fieldsIterator = Object.keys(this.store.foPairs[index][collection][lastOperand]).entries();

      while ((field = fieldsIterator.next().value) !== undefined) {
        this.matchers[lastOperand](this.store.foPairs[index][collection][lastOperand][field[1]], field[1], data)
          .forEach(sf => {
            var idx = this.store.testTables[index][collection].subfilters[sf.id];
            testTables[idx]--;

            if (testTables[idx] <= 0) {
              Array.prototype.push.apply(matchedFilters, sf.filters.map(f => f.id));
            }
          });
      }
    }

    return _.uniq(matchedFilters);
  };

  return this;
}

/**
 * Returns the next operand to be tested, depending
 * on operands prioritization
 *
 * Returns undefined if no other operand is to be tested
 *
 * Does not return "regex" nor "notregex". As this keyword cannot
 * be tested using set logic, they are treated separately
 *
 * @param {Object} foPairs
 * @param {String} index
 * @param {String} collection
 * @param {String} [previous] - previous operand picked, if any
 * @return {String|undefined}
 */
function pickOperand(foPairs, index, collection, previous) {
  var
    operands = [
      'everything',
      'equals',
      'exists',
      'notexists',
      /*
       'geoBoundingBox',
       'geoDistance',
       'geoDistanceRange',
       'geoPolygon',
       */
      'range',
      'notrange',
      'notequals',
      /*
       'notgeoBoundingBox',
       'notgeoDistance',
       'notgeoDistanceRange',
       'notgeoPolygon',
       */
    ],
    idx = previous ? operands.indexOf(previous) + 1 : 0;

  while(!foPairs[index][collection][operands[idx]] && idx < operands.length) {
    idx++;
  }

  return idx < operands.length ? operands[idx] : undefined;
}

module.exports = Matcher;