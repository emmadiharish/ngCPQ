/**
 *  Apttus Config & Pricing
 *  CartEvaluatorService
 *
 *  @2015-2016 Apttus Inc. All rights reserved.
 *
 * This service, CartEvaluatorService, contains methods for accessing
 * various line items within the cart. This service utilizes
 * an extended definition of the FormulaEvaluatorService
 */
;(function() {
	angular.module('aptCPQData')
		.service('CartFormulaEvaluator', CartEvaluator);

	CartEvaluator.$inject = [
		'systemConstants',
		'FormulaEvaluator',
		'FormulaIterator'
	];

	/**
	 * Cart Evaulator serice definition. Initialized as a singleton with the
	 * 	appropriate dependencies injected.
	 */
	function CartEvaluator(systemConstants, FormulaEvaluatorService, IteratorService) {
		var nsPrefix = systemConstants.nsPrefix;
		/** -- Service scope variables -- */
		var service = this;
		//store cart lines for '$' methods
		var cartLines = {};
		//our applied expression info iterator
		var iterator;

		/** -- Attach public methods -- */
		service.calculate = calculate;
		service.calculateExpression = calculateExpression;
		service.setCartLines = setCartLines;

		/** -- Do some init stuff (service is only constructed once) -- */
		init();

		/** -- Method declarations -- */

		function init() {
			//Initialize list of functions that will extend
			//the JSFormula Evaluator's functionality
			var functions = {
				'$ParentBundle' : accessParentLine,
				'$MainBundle' : accessMainLine,
				'$Options' : accessOptionLines,
				'$Config' : accessConfiguration,
				'$CartLines' : accessAllLines,
				'$Rollups' : accessRollups,
				'ABS' : abs,
				'AND': doLogicalAND,
				'BEGINS': begins,
				'BLANKVALUE': blankValue,
				'BR': br,
				'CASE': checkSeries,
				//'CASESAFEID': caseId,
				'CEILING': ceiling,
				'CONTAINS': contains,
				'DATE': date,
				'DATEVALUE': dateValue,
				'DAY': day,
				'EXP': exp,
				'FALSE': function() { return false; },
				'FIND': find,
				'FLOOR': floor,
				'IF': checkCondition,
				'ISBLANK': isBlank,
				'ISNULL': isBlank, //same test in the browser as ISBLANK
				'ISNUMBER': isNumber,
				'LEFT': left,
				'LEN':len,
				'LN': naturalLog,
				'LOG': log,
				'LPAD': leftPad,
				'MAX': max,
				'MID': mid,
				'MIN': min,
				'MOD': mod,
				'MONTH': month,
				'NOT': unaryNot,
				'NOW': function() { return new Date(); },
				'OR': doLogicalOR,
				'RANGE': checkRange,
				'RANGEI': checkRangeI,
				'RIGHT': right,
				'ROUND': round,
				'RPAD': rightPad,
				'SQRT': sqrt,
				'SUBSTITUTE': substitute,
				'TEXT': text,
				'TODAY': function() { return new Date().toLocaleString(); },
				'TRIM': trim,
				'UPPER': upper,
				'VALUE': value,
				'YEAR': year,
				'NULL': function() { return null },
				'RAND': function() { return Math.random(); },
				'TRUE': function() { return true; }
			};
			//extend our JS evaluator definition
			FormulaEvaluatorService.setFunctions(functions);

		}

		/**
		 *	A wrapper method that executes Field Update
			 * and Rollup operations on the provided cart line items
		 *	@param itemsForUpdate The applied expressions map
		 *	@param contextSObjects The line items ordered by primary line item id
			 * @param nsPrefix The namespace prefix for the line items
		 *	@return Operation Results. Line items are updated directly
		 */
		function calculateExpression(expressionInfo, contextSObjects) {
			FormulaEvaluatorService.clearDependencies();
			return FormulaEvaluatorService.calculate(expressionInfo, contextSObjects);

		}

		/**
		 *	A wrapper method that executes Field Update
		 *  and Rollup operations on the provided cart line items
		 *	@param itemsForUpdate The applied expressions map
		 *	@param contextSObjects The line items ordered by primary line item id		 
		 *	@return Operation Results. Line items are updated directly
		 */
		function calculate(itemsForUpdate, contextSObjects, lineItems) {
				iterator = IteratorService.create(itemsForUpdate, contextSObjects, lineItems);
				cartLines = contextSObjects;

				var fieldUpdatesCompleted = false;
				var rollsupsCompleted = false;

				//setup dependencies
				FormulaEvaluatorService.clearDependencies();
				processFieldDependencies(iterator.fieldUpdates, contextSObjects);

				//evaluate expressions and rollups
				while(!fieldUpdatesCompleted
							|| !rollsupsCompleted) {
					var isTotalFailure = true;
					try {
						if(!fieldUpdatesCompleted) {
							setValue(iterator.fieldUpdateContext);
						}

						fieldUpdatesCompleted = true;
						isTotalFailure = false;
					} catch(ex) {
						if(ex instanceof IteratorService.ExpressionDependencyException) {
							isTotalFailure = isTotalFailure && ex.isTotalFailure;
						} else {
							throw ex;
						}
					}

					try {
						if(!rollsupsCompleted) {
							doCreateRollups(iterator.rollupContext);
						}

						rollsupsCompleted = true;
						isTotalFailure = false;
					} catch(ex) {
						if(ex instanceof IteratorService.ExpressionDependencyException) {
							isTotalFailure = isTotalFailure && ex.isTotalFailure;
						} else {
							throw ex;
						}
					}

					if(isTotalFailure) {
						throw 'Cyclical dependency';
					}
				}

				return iterator;
		}

		/**
		 * set the cart lines for context
		 * @param newCartLines the cart lines for context
		 */
		function setCartLines(newCartLines) {
			cartLines = newCartLines;

		}

		/**
		* Increment a dependency counter on fields which
		* require update.
		* @param {Object} fieldUpdates the applied infos which are being updated
		* @param {String} contextSObjects the context objects by reference in fieldUpdates
		*/
		function processFieldDependencies(fieldUpdates, contextSObjects) {
			//setup field dependencies
			for(primaryLineNumber in fieldUpdates) {
				if(fieldUpdates.hasOwnProperty(primaryLineNumber)) {
					var sObject = contextSObjects[primaryLineNumber];
					var updateFields = fieldUpdates[primaryLineNumber];
					for(updateField in updateFields) {
						if(updateFields.hasOwnProperty(updateField)) {
							FormulaEvaluatorService.incrementDependencyCount(sObject, updateField);
						}
					}
				}
			}
		}

		/**
		* Get the object corresponding to field name
		* @param contextSO the "starting" sObject
		* @param fieldAPIName the fully qualified field API name
		* @return the object specified by fieldName
		*/
		function getObjectFromField(contextSO, fieldAPIName) {
			//set new value
			var path = fieldAPIName.split('.');
			var curObject = contextSO;
			for (var i = 0, max = path.length -1; i < max; i++) {
				if(typeof(curObject) !== 'undefined'
							&& curObject != null) {
					curObject = curObject[path[i]];
				}
			}

			return curObject;
		}

		/**
		* Get the value from sourceField
		* @param object the sObject
		* @param sourceField the fully qualified field API name
		* @return the value specified by sourceField
		*/
		function getValue(object, sourceField) {
			var path = sourceField.split('.');
			var curObject = object;
			for (var i = 0; i < path.length; i++) {
				curObject = curObject[path[i]];
			}

			return curObject;
		}

		/**
		* Return context cart configuration
		* @param contextSObject the context sObject
		*/
		function accessConfiguration(contextSObject) {
			if(contextSObject.attributes.type == nsPrefix+'LineItem__c') {
				return contextSObject[nsPrefix+'ConfigurationId__r'];

			}

			//return self (configuration)
			return contextSObject;
		}

		/**
		* Get all the lines for the quote
		* @param args context SObject, and filter arguments
		* @return all lines items with filter criteria applied
		*/
		function accessAllLines(contextObject, filterKey, filterValue) {
			var unfilteredLines = [];
			for(var primaryLineId in cartLines) {
				if(cartLines.hasOwnProperty(primaryLineId)) {
					unfilteredLines.push(cartLines[primaryLineId]);
				}
			}

			var filteredLines = filterSObjectsByValue(contextObject, unfilteredLines, filterKey, filterValue);
			if(filteredLines.length == 0) { //generate matching criteria
				var locatePointers = {};
				locatePointers[nsPrefix+'ConfigurationId__c'] = contextObject[nsPrefix+'ConfigurationId__c'];

				// throw the exception
				throw new IteratorService.SObjectNotFoundException(nsPrefix+'LineItem__c', locatePointers);

			}

			// return filtered cart lines
			return filteredLines;
		}

		/**
		* Get the main line for context bundle
		* @param contextLine context line
		* @return top line in hierarchy from context line
		*/
		function accessMainLine(contextLine) {
			if(contextLine[nsPrefix+'ParentBundleNumber__c'] == null
					|| contextLine[nsPrefix+'LineNumber__c'] == contextLine[nsPrefix+'PrimaryLineNumber__c']) {
				return null; //no parent bundle, return null
			}

			return cartLines[contextLine[nsPrefix+'LineNumber__c']];
		}

		/**
		* Get parent line for bundle
		* @param contextLine context line
		* @return parent line for context line, or null if no parent line
		*/
		function accessParentLine(contextLine) {
			if(contextLine[nsPrefix+'ParentBundleNumber__c'] == null) {
				return null;
			}

			return cartLines[contextLine[nsPrefix+'ParentBundleNumber__c']];
		}

		/**
		* Get options lines for bundle
		* @param args context line and filter options
		* @return options lines for context line with applied filters
		*/
		function accessOptionLines(contextObject, filterKey, filterValue) {
			var optionLineItems = [];
			var optionPrimaryLines = [];
			for(var primaryLineId in cartLines) {
				if(cartLines.hasOwnProperty(primaryLineId)) {
					var lineSO = cartLines[primaryLineId];
					if(lineSO[nsPrefix+'ParentBundleNumber__c'] == contextObject[nsPrefix+'PrimaryLineNumber__c']) {
						optionPrimaryLines.push(lineSO);
					}
				}
			}

			var optionLineItems = filterSObjectsByValue(contextObject, optionPrimaryLines, filterKey, filterValue);
			if(optionLineItems.length == 0) { //generate matching criteria
				var locatePointers = {};
				locatePointers[nsPrefix+'ParentBundleNumber__c'] = contextObject[nsPrefix+'PrimaryLineNumber__c'];

				// throw the exception
				throw new IteratorService.SObjectNotFoundException(nsPrefix+'LineItem__c', locatePointers);

			}

			// return filtered option lines
			return optionLineItems;
		}

		/**
		* Get parent line for bundle
		* @param args context line
		* @return parent line for context line, or null if no parent line
		*/
		function accessRollups(contextObject, filterKey, filterValue) {
			var lineItemRollups = [];
			var filteredResults = [];
			var existingRollups = iterator.rollupContext.getCompletedRollups();
			var rollupsForLine = existingRollups[contextObject.Id];
			if(typeof(rollupsForLine) !== 'undefined') {
				lineItemRollups = lineItemRollups.concat(rollupsForLine);
			}

			filteredResults = filterSObjectsByValue(contextObject, lineItemRollups, filterKey, filterValue);
			if(filteredResults.length == 0) {
				if(iterator.rollupContext.hasRollupPending(contextObject.Id)) {
					// throw dependency exception, until evaluation is complete
					throw new IteratorService.ExpressionDependencyException();
				} else { // no rollups for object existing or pending evaluation...
					var locatePointers = {}
					var rollupParentNumber = 0;
					if(typeof(contextObject[nsPrefix+'PrimaryLineNumber__c']) !== 'undefined') {
						rollupParentNumber = contextObject[nsPrefix+'PrimaryLineNumber__c'];
					}

					// throw the exception
					throw new IteratorService.SObjectNotFoundException(nsPrefix+'LineItemRollup__c', locatePointers);
				}
			}

			//return the context rollups
			return filteredResults;
		}

		/**
		* Return sObjects with applied filter contiions
		* If no filter conditions are specific then the original
		* list is returned.
		*
		* @param contextObjects context SObjects for filter
		* @param filterKey field name to filter by
		* @param filterValue value of filter key to return
		* @return SObjects with applied filter
		*/
		function filterSObjectsByValue(contextSObject, filterSObjects, filterKey, filterValue) {
			// filter result
			var results = [];
			var hasFilter = typeof(filterKey) !== 'undefined' && filterKey != null && filterKey != '';
			if(!hasFilter) {
				return filterSObjects;
			} else {
				for(var i=0; i < filterSObjects.length; i++) {
					var filterSObject = filterSObjects[i];
					if(typeof(filterValue) !== 'undefined') { //old style expression
						var objectValue = getValue(filterSObject, filterKey);
						if(objectValue == filterValue) {
							results.push(filterSObject);

						}
					} else {
						var qualifies = FormulaEvaluatorService.calculate(filterKey, [filterSObject, contextSObject]);
						if(typeof(qualifies) !== 'undefined' &&
								qualifies == true) {
							results.push(filterSObject);
						}
					}
				}
			}

			return results;
		}

		/**
		* Return the absolute value of the input argument
		* @param  input input value
		* @return  absolute value.
		*/
		function abs(input) {
			return Math.abs(blankValue(input, 0));

		}

		/**
		* Performs a logical AND operation on
		* an array of two or more objects
		* @return  true if any arguments evaluates to true.
		*/
		function doLogicalAND() {
			var result = true;
			for(var i=0; i < arguments.length;i++) {
				var o = arguments[i];
				if(o != true) {
					result = false;
					break;
				}
			}

			return result;
		}

		/**
		* Checks if text begins with specified characters.
		* @param  test the test string
		* @param  beginsWith the string test should begin with
		* @return  TRUE if it does. Otherwise returns FALSE
		*/
		function begins(test, beginsWith) {
			if(test == null ||
				beginsWith == null) {
				return false;
			}

			return test.startsWith(beginsWith);
		}

		/**
		* Checks whether expression is blank and
		* return substitute expression if it is blank.
		* @param  input the input string
		* @param  substitute the substitue
		* @return  substitue expression if it is blank.
		*      If expression is not blank, returns the original expression value.
		*/
		function blankValue(input, substitute) {
			return (typeof(input) == 'undefined' || input == null ||
							(typeof(input) === 'string' && input == '')) ?
						 substitute :
						 input;
		}

		/**
		* Inserts an HTML break tag in string formulas
		* @param  input input string
		* @return  TRUE if it does. Otherwise returns FALSE
		*/
		function br(input) {
			return input + '<br />';

		}

		/**
		* Checks an expression against a series of values.
		* CASE(expression, value1, result1, value2, result2,...,else_result)
		* @return  If the expression compares equal to
		*      any value, the corresponding result is returned.
		*      If it is not equal to any of the values, the else-result
		*      is returned
		*/
		function checkSeries() {
			var args = arguments;
			var result = args[args.length-1];

			for(var i=1; i < args.length-1; i+=2) {
				if(args[i] == args[0]) {
					result = args[i+1];
					break;
				}
			}

			return result;
		}

		/**
		* Rounds a number up to the nearest integer
		* @param  number the number to round
		* @return  the rounded number
		*/
		function ceiling(number) {
			return Math.ceil(blankValue(number, 0));

		}

		/**
		* Checks if text contains specified characters
		* @param  text the string to check
		* @param  compareText the substring to match in text
		* @return  TRUE if it does. Otherwise, returns FALSE
		*/
		function contains(text, compareText) {
			if((text == null) || (text == '') || (compareText == null) || (compareText = '')) {
				return false;
			}

			return text.indexOf(compareText) >= 0;
		}

		/**
		* Creates a date from a year, month and day
		* @param  year the year
		* @param  month the month
		* @param  day the day
		* @return  Date object
		*/
		function date(year, month, day) {
			return new Date(year, month, day);

		}

		function dateValue(a) {
			//return new Date(year, month, day);

		}

		/**
		* Returns the day of the month
		* @param  date the dat object
		* @return  the day of the month, a number between 1 and 31
		*/
		function day(date) {
			return date.getDate();
		}

		/**
		* Returns e raised to the power of a given number
		* @param  number the number to raise to power of e
		* @return  Returns e raised to the power of a given number
		*/
		function exp(number) {
			return Math.exp(blankValue(number, 0));

		}

		/**
		* Returns the position of the search_text string in text
		* FIND(search_text, text [, start_num])
		* @return  the position of the search_text string in text
		*/
		function find() {
			var result = 0;
			var args = arguments;
			var searchString  = args[0];
			var contextString = args[1];

			if(typeof(contextString) == 'string'
						&& contextString.trim() != '') {
				if(args.length > 2 && args[2] != null) {
						var startNum   = args[2];

						if(startNum > 0 && startNum < contextString.length) {
							result = contextString.indexOf(searchString, startNum -1) + 1;
						}
				} else {
					result = contextString.indexOf(searchString) + 1;
				}
			}

			return result;
		}

		/**
		* Rounds a number down, towards zero to the nearest integer
		* @param  number the number to round down
		* @return  A number rounded down towards zero
		*/
		function floor(number) {
			return Math.floor(blankValue(number, 0));

		}

		/**
		* Takes three expressions, where the first expression
		* evaluates to a Boolean value. If the first expression
		* evaluates to true, checkCondition returns the second expressionsn.
		* If the first expression evaluates to false, checkCondition
		* evaluates and returns the third expression.
		*/
		function checkCondition(test, ifTrue, ifFalse) {
				var result;
				if(typeof(test) === 'undefined' || test == null) { // NULL is considered a failure
					result = ifFalse;
				} else {
					if(Boolean(test) == true) {
						result = ifTrue;
					} else {
						result = ifFalse;
					}
				}

				return result;
		}

		/**
		* Checks whether an expression is blank
		* @param  input input to check for "blank"
		* @return  true if blank; false otherwise
		*/
		function isBlank(input) {
			return typeof(input) === 'undefined' ||
						 input == null ||
						 input == '';
		}

		/**
		* Checks whether the expression is a number
		* @param  testString string to test if number
		* @return  true if blank; false otherwise
		*/
		function isNumber(testString) {
			if(typeof(testString) === 'string'
					&& testString.trim() == '') {
				return false;
			}

			return !isNaN(testString);
		}

		/**
		* Returns the specified number of characters
		* from the beginning of a text string.
		*
		* @param  input the input string
		* @param  numChar the number of characters to count
		* @return  the specified number of characters
		*      from the beginning of a text string.
		*/
		function left(input, numChar) {
			return numChar < 0 ? '0' : input.substring(0, numChar);

		}

		/**
		* Returns the number of characters in a text string
		* @param  inputString the string to check length
		* @return  the number of characters in a text string
		*/
		function len(inputString) {
			return blankValue(inputString, '').length;
		}

		/**
		* Returns the natural logarithm of a number
		* @param  number the number to take the natural log of
		* @return  the natural logarithm of a number
		*/
		function naturalLog(number) {
			return Math.log(blankValue(number, 0));
		}

		/**
		* Returns the base 10 logarithm of number
		* @param  number the number to take the log of
		* @return  the base 10 logarithm of n
		*/
		function log(number) {
			return Math.log10(blankValue(a, 0));
		}

		/**
		* Pad the left side of the value with spaces or
		* the optional pad string so that the length is padded_length
		* LPAD(text, padded_length [, pad_string])
		* @return  padded string
		*/
		function leftPad() {
			var args = arguments;
			return justify(args[0], arguments.length > 2 ? args[2] : null, args[1], true);
		}

		/**
		* Returns the greatest of all the arguments
		* MAX(number,number,...)
		* @return  the greatest of all the arguments
		*/
		function max() {
			var result = null;
			for(var i=0; i < arguments.length; i++) {
				var testObj = arguments[i];
				if(testObj == null) {
					testObj = 0;
				}

				if(result == null || testObj > result) {
					result = testObj;
				}
			}

			return result;
		}

		/**
		* Returns character from the middle of a text
		* string, given a starting position and length
		* MID(text, start_num, num_chars)
		* @return  Returns character from the middle of a text string
		*/
		function mid() {
			var result = '';
			var args = arguments;
			if(args[0] == null) {
				result = '0';
			} else {
				var startingNum = args[1];
				var numChars  = args[2];
				var startingIdx = startingNum - 1;

				startingIdx = startingNum < 0 ? 0 : startingIdx;

				if(numChars == null || numChars < 0) {
					result = '0';
				} else {
					while(numChars-- > 0 && startingIdx <= (args[0].length - 1)) {
						result+=args[0][startingIdx++];
					}
				}
			}

			return result;
		}

		/**
		* Returns the least of all the arguments
		* MIN(number,number,...)
		* @return  the least of all the arguments
		*/
		function min() {
			var result = null;
			var args = arguments;
			for(var i=0; i < args.length; i++) {
				var testObj = args[i];
				if(testObj == null) {
					testObj = 0;
				}

				if(result == null || testObj < result) {
					result = testObj;
				}
			}
			return result;
		}

		/**
		* Returns the remainder after a number
		* is divided by a divisor
		* MOD(number,divisor)
		* @return  the remainder
		*/
		function mod() {
			var value1 = blankValue(arguments[0], 0);
			var value2 = blankValue(arguments[1], 0);
			var result = value1%value2;
			if(isNaN(result)) {
				results = 0;

			}

			return result;
		}

		/**
		* Returns the MONTH
		* @param  date the date object
		* @return  the month, a number between 1 (January) and
		*      12 (December) in number format of a given date.
		*/
		function month(date) {
			return date.getMonth();
		}

		/**
		* Performs a logical NOT operation
		* @param  input the input boolean
		* @return  the opposite of the input
		*/
		function unaryNot(input) {
			return !input;
		}

		/**
		* Performs a logical OR operation on
		* an array of two or more objects
		* @return  true if any argument
		*          evaluates to true.
		*/
		function doLogicalOR() {
			var result = false;
			for(var i=0; i < arguments.length; i++) {
				var o = arguments[i];
				if(o instanceof Boolean && o == true) {
					result = true;
					break;
				}
			}

			return result;
		}

		/**
		* Check if value is in range
		* @return  true if within any of the given ranges
		*/
		function checkRange() {
			return isRange(arguments, false);
		}

		/**
		* Check if value is in range (inclusive)
		* @return  true if within any of the given ranges, inclusively
		*/
		function checkRangeI() {
			return isRange(arguments, true);
		}

		/**
		* Check if value is in range
		*
		* @param  objects array of arguments
		* @param  checkInclusive whether to perform the range check inclusively
		* @return  true if within any of the given ranges
		*/
		function isRange(objects, checkInclusive) {
			var checkObject = objects[0];
			var isInRange = false;
			if(checkObject != null) {
				var checkValue = checkObject;
				var ranges = objects[1];
				if(ranges != null
							&& ranges.trim() != '') {
					var checkRanges = ranges.split('<');
					for(var i=0; i < checkRanges.length; i++) {
						var range = checkRanges[i];
						if(range == null || range.trim() == '') {
							continue;
						}

						range = range.replace('>', '');
						var rangeKeys = range.split(',', 2);
						if(rangeKeys.length > 0) {
							if(rangeKeys.length > 1) {
								var sortedKeys = [rangeKeys[0], rangeKeys[1]];
								sortedKeys.sort();
								if(checkInclusive) {
									isInRange = (checkValue >= sortedKeys[0]) && (checkValue <= sortedKeys[1]);
								} else {
									isInRange = (checkValue > sortedKeys[0]) && (checkValue < sortedKeys[1]);

								}
							} else {
								isInRange = checkValue == rangeKeys[0];
							}
						}

						if(isInRange) { //if any within range, stop checking.
							break;
						}
					}
				}
			}

			return isInRange;
		}

		/**
		* Returns the specified number of characters
		* from the end of a text string.
		* @param  inputString the input string
		* @param  numChar number of characters to count
		* @return  the specified number of characters from the end of a text string.
		*/
		function right(inputString, numChar) {
			var result = '';
			inputString = inputString || '';

			if(typeof(numChar) === 'undefined' || numChar == null || numChar < 0) {
				result = '0';
			} else {
				var startingNum = inputString.length - numChar + 1;
				result = mid(inputString, startingNum, numChar);
			}

			return result;
		}

		/**
		* Rounds a number to a specified number of digits
		* @param  number the number to round
		* @param  numDigits the number of digits
		* @return  rounded number
		*/
		function round(number, numDigits) {
			return blankValue(number, 0).toFixed(blankValue(numDigits, 0));
		}

		/**
		* Pad the right side of the value with spaces or
		* the optional pad string so that the length is padded_length
		* @param  text text to pad
		* @param  paddedLength length to pad
		* @param  padString optional pad character
		* @return  padded string
		*/
		function rightPad(text, paddedLength, padString) {
			return justify(text, padString, paddedLength, false);
		}

		/**
		* Returns the positive square root of a number
		* @param  number the number to calculate square root
		* @return  the positive square root
		*/
		function sqrt(number) {
			return Math.sqrt(blankValue(number, 0));
		}

		/**
		* Substitutes new_text for old_text in a text string.
		* SUBSTITUTE(text, old_text, new_text)
		* @param  text input text
		* @param  oldText old text
		* @param  newText substitute string
		* @return  a string with new_text in replace of old_text
		*/
		function substitute(text, oldText, newText) {
			return blankValue(text, '').replace(blankValue(oldText, ''), blankValue(newText, ''));
		}

		/**
		* Converts a value to text using standard display format
		* @param  value the value to convert to text
		* @return  the positive square root
		*/
		function text(value) {
			return ''+blankValue(value, '0');
		}

		/**
		* Removes all spaces from a text string except for
		* single spaces between words
		* @param  text the string to trim
		* @return  string with leading and trailing spaces removed.
		*/
		function trim(text) {
			return text.trim();
		}

		/**
		* Converts all letters in the value to uppercase
		* @param  text input text
		* @param  locale optional locale
		* @return  a string with all uppercase letters
		*/
		function upper(text, locale) {
			var result;
			// if(typeof(locale) !== 'undefined' && locale != null) {
			//   text.toUpperCase((String)objects[1]);
			// } else {

				result = text.toUpperCase();
			//}

			return result;
		}

		/**
		* Converts a text string that represents
		* a number to a number
		* @param text string to convert
		* @return  a number representation of the given
		*      text string
		*/
		function value(text) {
			return parseFloat(blankValue(text, '0'));
		}

		/**
		* Returns the year
		* @param  date the date object
		* @return  Returns the four-digit year in
		*      number format of a given date.
		*/
		function year(date) {
			return date.getFullYear();
		}

		/**
		* Justify input
		* @param  inString Input string
		* @param  padCharacter String to pad input with until length is
		*       met
		* @param  length Desired length of output. Length will first
		*       be considered as a maximum length, and then
		*       a minimum length.
		* @param  rightJustify Boolean indicting whether to right justfiy
		*       the input.
		* @return justified string
		*/
		function justify(inString, padCharacter, length, rightJustify) {
			var justifiedString  = inString || '';
			padCharacter = padCharacter || ' ';

			//trim down to size
			justifiedString = justifiedString.subString(0, Math.min(justifiedString.length, length));

			//justify
			while(justifiedString.length < length) {
				justifiedString = (rightJustify?padCharacter:'') + justifiedString + (!rightJustify?padCharacter:'');
			}

			return justifiedString;
		}

		/**
		* Sets the sObject field value
		*
		* @method SET(fieldInfo, contextSO, expressionObjects)
		* @param fieldUpdateContext the field update context info
		* @return the field update context. sObjects are modified directly
		*/
		function setValue(fieldUpdateContext) {
				//console.log('in set method');
			//console.log(fieldUpdateContext);

			// Set of evaluated sObject Ids
			var evaluatedSOIds = {};
			// used to check for cyclical dependencies
			var fieldDepencencyMap = {};//new Map<Id, Map<String, Set<String>>>();
			// nex item to set
			var setValueItem = fieldUpdateContext.next();
			// flag to make sure expressions are convering.
			var isTotalFailure = true;
			// evaluate each item
			while(setValueItem != null) {
				// only skip processing this item one time
				var skippingItem = true;
				// get context sObject
				var contextSO = setValueItem.getContextSObject();
				// get field api to update expression map
				var fieldExpressions = setValueItem.getCriteria();

				for(fieldName in fieldExpressions) {
					if(fieldExpressions.hasOwnProperty(fieldName)) {
						// mark as field is in evaluation.
						FormulaEvaluatorService.disableDependencyCheck(contextSO, fieldName);
						try {
							// get field expression
							var fieldExpression = fieldExpressions[fieldName];
							// evaluate it.
							var evalResults = FormulaEvaluatorService.calculate(fieldExpression, [contextSO]);

							//set new value
							var path = fieldName.split('.');
							var curObject = contextSO;
							for (var i = 0; i < path.length -1; i++) {
								curObject = curObject[path[i]];
							}

							curObject[path[i]] = evalResults.result;

							// record source fields
							setValueItem.setSourceFields(evalResults.sourceFields, fieldName);
							// record unresolved pointers in expressions
							setValueItem.setUndefinedFields(evalResults.undefinedFields, fieldName);
							//decrement dependency count
							FormulaEvaluatorService.decrementDependencyCount(contextSO, fieldName);
							// flag to make sure expressions are convering.
							isTotalFailure = false;
						} catch (ex) {
							if(ex instanceof IteratorService.ExpressionDependencyException) {
								// check if cyclical reference
								if(ex.dependentSOId != null
										&& ex.dependentField != null) {
									fieldUpdateContext.doCyclicalDependencyCheck(contextSO.Id, fieldName, ex.dependentSOId, ex.dependentField, fieldDepencencyMap);
								}
								//console.log('Found dependent expression...will skip for now: sObject Id:' + contextSO.Id);
								// mark as has dependency
								fieldUpdateContext.setIsDependentItem(setValueItem, fieldName, ex.dependentSOId, ex.dependentField, skippingItem);
								skippingItem = false; // only mark as skipping item once
							} else {
								// mark as done evaluating
								FormulaEvaluatorService.enableDependencyCheck(contextSO, fieldName);
								// delegate exception
								throw ex;
							}
						} finally { //continue for non-fatal exception
							// remove from list
							//delete fieldExpressions[fieldName];
							// mark as done evaluating
							FormulaEvaluatorService.enableDependencyCheck(contextSO, fieldName);
						}
					}
				}

				setValueItem = fieldUpdateContext.next();
			}

			// bubble up depencies based on rollups
			if(fieldUpdateContext.hasOutsideDependencies()) {
				var dependencyException = new IteratorService.ExpressionDependencyException();
				dependencyException.isTotalFailure = isTotalFailure;

				throw dependencyException;
			}

			return fieldUpdateContext;
		}

		/**
		* Performs the rollup operation.
		* Returns list of rollup summary sObjects.
		*
		*  ROLLUP(operation, callback, scopeField, scopeFieldId, summaryField [,filter][,groupByField])
		*  Supported operations:
		*  SUM
		*  MIN
		*  MAX
		*  AVG
		*  AND
		*  OR
		*
		* @param  rollupContext Rollup context containing context items to rollup
		* @return  list of Rollup Summary sObjects
		private Map<Id, List<LineItemRollup__c>>*/
		function doCreateRollups(rollupContext) {
			// start rollups
			rollupContext.start();

			// STEP I - accumulate values
			if(rollupContext.hasPendingRollups()) {
				var rollupInfos = rollupContext.getPendingRollups();
				var rollupObjects = rollupContext.getRollupSObjects();
				for(var i=0; i < rollupObjects.length; i++) {
					var rollupSObject = rollupObjects[i];
					//check if sObject matches rollup context
					for(var j=0; j < rollupInfos.length; j++) {
						var rollupInfo = rollupInfos[j];
						if(!rollupContext.getHasDependency(rollupInfo)) {
							//check for qualification
							var qualifies = meetsRollupCriteria(rollupInfo, rollupSObject);
							if(qualifies) {
								// accumulate value (fail on accumulate)
								try {
									//store values
									accumulate(rollupInfo, rollupSObject);
								}  catch(ex) {
									if(ex instanceof IteratorService.ExpressionDependencyException) {
										//mark as has dependency
										rollupContext.setHasDependency(rollupInfo);
										//clear accumulators for next round
										rollupInfo.clearAccumulators();
									} else {
										throw ex;
									}
								}
							}
						}
					}
				}

				// STEP III - create rollup summary records
				var pendingRollups = rollupContext.getPendingRollups();
				for(var i=0; i < pendingRollups.length; i++) {
					var rollupInfo  = pendingRollups[i];
					// create summary records...
					if(!rollupContext.getHasDependency(rollupInfo)) {
						rollupInfo.createRollupRecords();

					}
				}
			}

			// start will call expression dependency exception
			// if there are any dependencies
			rollupContext.stop();

			return rollupContext.getNewRollups();
		}

		/**
		* Check if item meets rollup criteria
		* @param  contextItem condition/scope object
		* @param  checkSO check object
		* @return  true if any argument evaluates to true.
		*/
		function meetsRollupCriteria(contextItem, checkSO) {
			var filterCriteria = contextItem.getFilter();
			var hasFilter = filterCriteria == null || filterCriteria == '';

			return !hasFilter || FormulaEvaluatorService.calculate(filterCriteria, [checkSO, contextItem.getConditionSO()]);
		}

		/**
		* Accumulate new rollup value
		* @param  contextItem context rollup item
		* @param  accumulateSO SObject to include in total
		* @return  true if any argument evaluates to true.
		*/
		function accumulate(contextItem, accumulateSO) {
			// newly evaluated result
			var result = null;
			//get group by field
			var groupByField = contextItem.getGroupByField();
			// get callback expression
			var callback = contextItem.getCallbackExpression();
			//get rollup operation
			var operation = contextItem.getRollupOperation();
			// get accumulation details
			var accumulationMap = contextItem.getAccumulatorDetails();
			// get roll up key value from sObject
			var rollUpKeyValue = (groupByField == null || groupByField.trim() == '') ? null : getValue(accumulateSO, groupByField);
			// get context SO
			var contextSO = contextItem.getConditionSO();

			// Special handling for first entry for this RollUp Key value
			if(typeof(accumulationMap[rollUpKeyValue]) === 'undefined') { //Check special boolean conditions
				// always evaluate first condition
				result = FormulaEvaluatorService.calculate(callback, [accumulateSO, contextSO]).result;
				//store initial value. if null, default fail condition's for AND
				result = (result == null ? (operation == 'AND' ? false : (operation == 'OR' ? true : result)) : result);
				// add value to rollup grouping map
				contextItem.accumulate(result, rollUpKeyValue);
			} else {
				// grab accumulated value
				var accumulator = accumulationMap[rollUpKeyValue];
				// special check for boolean
				if((operation == 'AND' && accumulator == false)
					|| (operation == 'OR' && accumulator == true)) {
					//return; // short-circuit

				} else {
					// evaluate
					result = FormulaEvaluatorService.calculate(callback, [accumulateSO, contextSO]).result;
					// Accumulate returned result according to operation
					if(operation == 'SUM' || operation == 'AVG') {
						if(accumulator == null) {
							accumulator = 0;

						}

						if(result == null) {
							result = 0;

						}

						accumulator = accumulator + result;

					} else if(operation == 'MIN' || operation == 'MAX') {
						accumulator = getMinMax(accumulator, result, operation == 'MIN');

					} else if(operation == 'AND') {
						accumulator = (accumulator == null || result == null) ? false : (accumulator && result);

					} else if(operation == 'OR') {
						accumulator = (accumulator == null || result == null) ? true : (accumulator || result);

					} else {
						// invalid operation, throw exception

					}

					// add value to rollup grouping map
					contextItem.accumulate(accumulator, rollUpKeyValue);
				}
			}
		}

		/**
		* Get min/max. Assume different data types
		* @param  rollup objects Array of objects
		* @return  true if any argument evaluates to true.
		*/
		function getMinMax(ctx, compareTo, getMin) {
			var result;
			if(ctx == null) {
				result = compareTo;

			} else if(compareTo == null) {
				result = ctx;

			} else {
				result = (
							getMin ? (
										ctxDecimal < compareToDecimal ?
											ctxDecimal :
											compareToDecimal
									 )
									 :
									(
										ctxDecimal > compareToDecimal ?
											ctxDecimal :
											compareToDecimal
									)
				);
			}

			return result;

		};

	}
})();