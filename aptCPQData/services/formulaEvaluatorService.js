/**
 *  Apttus Config & Pricing
 *  FormulaEvaluatorService
 *
 *  @2015-2016 Apttus Inc. All rights reserved.
 *
 * This service, FormulaEvaluatorService, contains methods for performing basic
 * numeric operations such as the elementary exponential, logarithm,
 * square root, and trigonometric functions. Additionally this class contains
 * some basic "functions" that can be evaluated to derive pricing
 * rules anc criteria.
 *
 * <p>This class can be extended using the setFunctions method
 *
 */
;(function() {
	angular.module('aptCPQData')
		.service('FormulaEvaluator', FormulaEvaluator);

	//inject the formulae iterator
	FormulaEvaluator.$inject = [
		'FormulaIterator'
	];

	function FormulaEvaluator(IteratorService) {
		var service = this;
		/** -- Attach public methods -- */
		service.calculate = calculate;
		service.setFunctions = setFunctions;
		service.setCacheEnabled = setCacheEnabled;
		service.disableDependencyCheck = disableDependencyCheck;
		service.enableDependencyCheck = enableDependencyCheck;
		service.incrementDependencyCount  = incrementDependencyCount;
		service.decrementDependencyCount = decrementDependencyCount;
		service.clearDependencies = clearDependencies;
		service.getFunction = buildFunction;

		/** -- Service scope variables -- */
		var functions = {},
			cache = {},
			FUNC = 1,
			VAR = 2,
			LIT = 3,
			OPP = 4,
			cacheEnabled = true,
			varDependencies = {},
			isBypassCheck = {},
			undefinedFields = {},
			sourceFields = {},
			precedence = {
				'||' : {
					precedence : 1,
					func: function (a, b) {
						return a || b;
					},
					arguments: 2,
					type: OPP
				},
				'&&' : {
					precedence : 3,
					func: function (a, b) {
						return a && b;
					},
					arguments: 2,
					type: OPP
				},
				'!=' : {
					precedence : 5,
					func: function (a, b) {
						return a != b;
					},
					arguments: 2,
					type: OPP
				},
				'==' : {
					precedence : 6,
					func: function (a, b) {
						return a == b;
					},
					arguments: 2,
					type: OPP
				},
				'<' : {
					precedence : 6,
					func: function (a, b) {
						return parseFloat(getBlankValue(a, 0)) < parseFloat(getBlankValue(b, 0));
					},
					arguments: 2,
					type: OPP
				},
				'>' : {
					precedence : 10,
					func: function (a, b) {
						return parseFloat(getBlankValue(a, 0)) > parseFloat(getBlankValue(b, 0));
					},
					arguments: 2,
					type: OPP
				},
				'<=' : {
					precedence : 11,
					func: function (a, b) {
						return parseFloat(getBlankValue(a, 0)) <= parseFloat(getBlankValue(b, 0));
					},
					arguments: 2,
					type: OPP
				},
				'>=' : {
					precedence : 12,
					func: function (a, b) {
						return parseFloat(getBlankValue(a, 0)) >= parseFloat(getBlankValue(b, 0));
					},
					arguments: 2,
					type: OPP
				},
				'+' : {
					precedence : 17,
					func: function (a, b) {
						return parseFloat(getBlankValue(a, 0)) + parseFloat(getBlankValue(b, 0));
					},
					arguments: 2,
					type: OPP
				},
				'-' : {
					precedence : 17,
					func: function (a, b) {
						return parseFloat(getBlankValue(a, 0)) - parseFloat(getBlankValue(b, 0));
					},
					arguments: 2,
					type: OPP
				},
				'*' : {
					precedence : 23,
					func: function (a, b) {
						return parseFloat(getBlankValue(a, 0)) * parseFloat(getBlankValue(b, 0));
					},
					arguments: 2,
					type: OPP
				},
				'/' : {
					precedence : 23,
					func: function (a, b) {
						return parseFloat(getBlankValue(a, 0)) / parseFloat(getBlankValue(b, 1));
					},
					arguments: 2,
					type: OPP
				},
				'^' : {
					precedence : 28,
					func: function (a, b) {
						return Math.pow(parseFloat(getBlankValue(a, 0)), parseFloat(getBlankValue(b, 0)));
					},
					arguments: 2,
					type: OPP
				},
			},
			variableOpen = '{',
			variableEnd = '}',
			variableRegex = new RegExp('^' + variableOpen + '.*?' + variableEnd),
			functionRegex = null,
			opporatorRegex = /^(==|!=|>=|<=|&&|\|\||[-+*\/()@^<>!&])/,
			numberRegex = /\d+(\.\d*)?|\d+|\.\d+/


		/** -- Method declarations -- */

		/**
		*	Takes a formula and parses it into a token array
		*
		*	@method tokenize
		*	@param {String} input The formula
		*	@return {Array} An array of tokens
		*/
		function tokenize(input) {
			var curIndex = 0,
				tokens = [],
				token,
				regexMatch,
				curRemainingString,
				inputLen = input.length,
				firstChar,
				nextMatPosition,
				funcName,
				paramsUnparsed,
				params,
				stripFirstParam,
				opperator,
				stripedRegex,
				closingParan;

			while (curIndex < inputLen) {
				curRemainingString = input.substring(curIndex).trim();
				//This part of the code check for strings
				firstChar = input.substring(curIndex, curIndex + 1);

				//Handle cases were token is a whitespace
				if(firstChar == null || firstChar == ' '	|| firstChar == '') {
					curIndex+=1;
				//Handle cases were token is going to be a string
				} else if (firstChar === '"' || firstChar === "'") {
					nextMatPosition = input.indexOf(firstChar,curIndex + 1);
					if (nextMatPosition == -1) {
						throw "Quote miss match";
					}
					tokens.push({
						type: LIT,
						val : input.substring(curIndex+1, nextMatPosition)
					});
					curIndex = nextMatPosition + 1;
				//Handles cases were formula is wrapped in parenthis to override precedence
				} else if (firstChar === '(') {
					nextMatPosition = findClosingParan(curRemainingString);
					token = buildTreeFromFormula(curRemainingString.substring(1,nextMatPosition));
					tokens.push(token);
					curIndex = curIndex + nextMatPosition + 1;
				//Handles cases were token is a variable
				} else if (regexMatch = getFirstRegex(variableRegex, curRemainingString)) {
					stripedRegex = regexMatch.replace(variableOpen,'').replace(variableEnd,'');
					tokens.push({
						type: VAR,
						val: stripedRegex
					});
					curIndex = curIndex + regexMatch.length;
				//Handles cases were token is a function
				} else if (regexMatch = getFirstRegex(functionRegex,curRemainingString)) {
					nextMatPosition = regexMatch.indexOf('(');
					funcName = regexMatch.substring(0,nextMatPosition);
					stripFirstParam = regexMatch.substring(nextMatPosition);
					closingParan = findClosingParan(curRemainingString);
					//paramsUnparsed = findParameters(stripFirstParam.substring(1, stripFirstParam.length - 1));
					paramsUnparsed = findParameters(curRemainingString.substring(nextMatPosition + 1,closingParan + 1));
					params = [];
					if(paramsUnparsed) {
						for (var i = 0, max = paramsUnparsed.length; i < max; i++) {
							var newParam =
							params.push(buildTreeFromFormula(paramsUnparsed[i]));
						}
					}

					tokens.push({
						type: FUNC,
						func: functions[funcName],
						params: params
					});

					curIndex = curIndex + 1 + closingParan;
				//Handles cases were token is an opperator
				} else if (regexMatch = getFirstRegex(opporatorRegex, curRemainingString)) {
					opperator = precedence[regexMatch];
					tokens.push(opperator);
					curIndex = curIndex + regexMatch.length;
				//Handles cases were the token is a number litteral
				} else {
					token = getFirstRegex(numberRegex, curRemainingString);
					if (isNaN(token)) {
						throw "This is not an acceptable token: " + token;
					}

					tokens.push({
						type: LIT,
						val: Number(token)
					});
					curIndex = curIndex + token.length;

				}
			}
			return tokens;
		}

		function getBlankValue(checkVar, alternateVal) {
			if(typeof(checkVar) === 'undefined'
					|| checkVar == null) {
				return alternateVal;
			}
			return checkVar;
		}

		/**
		*	Returns the first Regex match or null if none is found
		*
		*	@method getFirstRegex
		*	@param {RegExp} regex Regular expression to compare against the string
		*	@param {String} string The string to find a match in
		*	@return {String} The first regex match or null if none is found
		*/
		function getFirstRegex(regex,string) {
			if (regex) {
				var results = regex.exec(string);
				if(results) {
					return results[0];
				} else {
					return results;
				}
			} else {
				return null;
			}

		}
		/**
		*	Returns an array of formulas inside a comma delimited parentheses
		*
		*	@method findParameters
		*	@param {String} input Contents inside of parentheses including wrapping parentheses
		*	@return {Array} Array of formulas
		*/
		function findParameters(input) {
			var curPos = 0,
				params = [],
				unclosedParams = 0,
				curChar,
				len = input.length,
				inQuote = false,
				quoteChar = [];
			while(curPos < len) {
				curChar = input[curPos];
				if (curChar === '(' 
						|| curChar === '{'
						|| curChar === '['
						|| (inQuote === false && (curChar === '"' || curChar === "'") )) {
					unclosedParams++;
					curPos++;
					//push quote character to stack
					if(curChar === '"' || curChar === "'") {
						quoteChar.push(curChar);
						inQuote = true;

					}
				} else if(curChar === ')' 
						|| curChar === '}'
						|| curChar === ']'
						|| (inQuote === true && quoteChar.length && curChar === quoteChar[quoteChar.length -1])) {
					unclosedParams--;
					if (unclosedParams == -1) {
						input = input.substring(0, curPos);
						break;
					}
					curPos++;					
					if(inQuote === true && quoteChar.length && curChar === quoteChar[quoteChar.length -1]) {
						quoteChar = quoteChar.slice(0, -1);
						inQuote = quoteChar.length > 0;
					}
				} else if (curChar === ',' && unclosedParams == 0) {
					params.push(input.substring(0,curPos));
					input = input.substring(curPos + 1);
					len = input.length;
					curPos = 0;
				} else {
					curPos++;
				}
			}
			
			if(input) {
				params.push(input);
			}

			return params;
		}
		/**
		*	Returns the index of the closing parentheses in a string
		*
		*	@method findClosingParan
		*	@param {String} input Contents inside of parentheses including wrapping parentheses
		*	@return {Integer} Index of the closing parenthesis
		*/
		function findClosingParan(input) {
			var numberOfUnclosed = 0,
				currentChar;
			for (var i = 0, max = input.length; i < max; i++) {
				currentChar = input[i];
				if (currentChar === '(') {
					numberOfUnclosed++;
				} else if (currentChar === ')') {
					numberOfUnclosed--;
					if (numberOfUnclosed === 0) {
						return i;
					}
				}
			}
			throw "No Closing Parentheses found";
		}
		/**
		*	Reorders the tokens into postfix based on the precedence of the operators
		*
		*	@method infixToPostFix
		*	@param {Array} tokens An array of tokens
		*	@return {Array} The tokens reorder based on the precedence of the operators
		*/
		function infixToPostFix(tokens) {
			var stack =[],
				postFix = [],
				curToken,
				topOpperator,
				curStackLength;
			for (var i = 0, max = tokens.length; i < max; i++) {
				curToken = tokens[i];
				if (curToken.type !== OPP) {
					postFix.push(curToken);
				} else {
					if (stack.length === 0) {
						stack.push(curToken);
					} else {
						topOpperator = stack[stack.length -1];
						while (topOpperator && topOpperator.precedence >= curToken.precedence) {
							postFix.push(stack.pop());
							curStackLength = stack.length;
							if (curStackLength > 0) {
								topOpperator = stack[stack.length -1];
							} else {
								topOpperator = null;
							}
						}
						stack.push(curToken);
					}
				}
			}
			while(curToken = stack.pop()) {
				postFix.push(curToken);
			}
			return postFix;
		}
		/**
		*	Builds a tree with the tokens.
		*
		*	@method buildTree
		*	@param {Array} postFix An array of tokens
		*	@return {Object} A tree that can be evaluated by the evalTree method
		*/
		function buildTree(postFix) {
			var i = 0,
				max = postFix.length,
				postFix = postFix.slice(0), //Copy it as to not modify the original array
				currentToken,
				numArgs,
				params;
			while (i < max
					&& (i >=0)) {
				currentToken = postFix[i];
				if (currentToken.type !== OPP) {
					i++;
				} else {
					params = [];
					numArgs = currentToken.arguments;
					while (numArgs > 0) {
						try {
							params.push(postFix[i - numArgs]);
							numArgs--;
						} catch (err) {
							throw 'Malformed Expression';
						}
					}

					postFix.splice(i - currentToken.arguments, currentToken.arguments + 1, {
						type: FUNC,
						params: params,
						func: currentToken.func
					});
					i = i - 1;
					max = postFix.length;
				}
			}
			if (postFix.length !== 1) {
				throw 'Malformed Expression';
			}
			return postFix[0];
		}
		/**
		*	Evaluates a tree with a given object
		*
		*	@method evalTree
		*	@param {Object} tree The tree to be evaluated
		*	@param {Object} object The object that will be used to populate the variables
		*	@return {Object} The result of the tree evaluation with the given object
		*/
		function evalTree(tree, object) {
			if (tree.type === FUNC) {
				var paramResults = [];
				for (var i = 0, max = tree.params.length; i < max; i++) {
					paramResults.push(evalTree(tree.params[i],object));
				}
				return tree.func.apply(this, paramResults);
			} else if (tree.type === VAR) {
				return evalVar(tree.val, object);
			} else if (tree.type === LIT) {
				return tree.val;
			}
		}
		/**
		*	Determines the value of a variable for the given object
		*
		*	@method evalVar
		*	@param {String} variable A string representing a variable Ex: x.y or x.$y[param, param, ...]
		*	@param {Object} object The object that the variable will be evaluated against
		*	@return {Object} Value of the variable in the provided object
		*/
		evalVar = function (variable, object) {
			var path = variable.split(/\.(?=([^\']*\'[^\']*\')*[^\']*$)/g);
			var curObject = object;
			var foundObjectId;
			var fieldStartIdx;
			for (var i = 0, max = path.length -1; i < max; i++) {
				if(i != 0 && (i%2 != 0)) { continue; } //skip the capturing group

				var curPath = path[i];
				if(angular.isUndefined(curObject) || curObject === null) {
					return null;
				}

				if(curPath[0] == '$') {
					var afterStartKey = curPath.substring(1, curPath.length);
					if(!isNaN(afterStartKey)) {
						var index;
						if(afterStartKey === '') {
							index = 0;
						} else { //determine index in array
							index = parseInt(afterStartKey);

						}

						if(index > 0) {
							curObject = curObject[index];
						} else if(Array.isArray(curObject)) {
							curObject = curObject[0];
						}

						foundObjectId = curObject.Id;
						fieldStartIdx = i + 2;
					} else { //special handler
						curPath = curPath.replace('[', '(').replace(']', ')');
						var beginArgs = curPath.indexOf('(');
						var funcName;
						var paramsUnparsed = '';
						if(beginArgs == -1) {
							 funcName = curPath.substring(0);
						} else {
							funcName = curPath.substring(0, beginArgs);
							var stripFirstParam = curPath.substring(beginArgs);
							var closingParan = findClosingParan(curPath);
							paramsUnparsed = findParameters(curPath.substring(beginArgs + 1, closingParan + 1));
						}

						var params = [curObject];
						if(paramsUnparsed != '') {
							for (var j = 0; j < paramsUnparsed.length; j++) {
								var paramTree = buildTreeFromFormula(paramsUnparsed[j]);
								params.push(evalTree(paramTree, object));
							}
						}

						//get value
						try {
							curObject = functions[funcName].apply(this, params);
							if(Array.isArray(curObject)) {
								if(curObject.length  == 1) {
									curObject = curObject[0];
								}
							}

							foundObjectId = curObject.Id;
							fieldStartIdx = i + 2;
						} catch(ex) {
							if(ex instanceof IteratorService.SObjectNotFoundException) {
								var undefinedForType = undefinedFields[ex.sObjectType];
								if(angular.isUndefined(undefinedForType)) {
									undefinedForType = {};
									undefinedFields[ex.sObjectType] = undefinedForType;
								}

								for(locatePointer in ex.locatePointers) {
									if(ex.locatePointers.hasOwnProperty(locatePointer)) {
										undefinedForType[locatePointer] = ex.locatePointers[locatePointer];
									}
								}

								// end variable path search
								return null;
							} else {
								throw ex;
							}
						}
					}
				} else {
					curObject = curObject[curPath];
				}
			}

			//check for dependency
			if(angular.isDefined(curObject) && curObject != null
					&& angular.isDefined(foundObjectId)) {
				var fieldPath = path[i];
				var dependentField = path.splice(fieldStartIdx).join('.').replace('..', '.');
				if(hasDependency(foundObjectId, dependentField)) {
					throw new IteratorService.ExpressionDependencyException(foundObjectId, dependentField);
				}

				// mark fields as accessed during evaluation
				var accessedFields = sourceFields[curObject.Id];
				if(angular.isUndefined(accessedFields)) {
					accessedFields = {};
					sourceFields[curObject.Id] = accessedFields;
				}

				accessedFields[fieldPath] = fieldPath;
			}

			return curObject ? curObject[fieldPath] : null;
		}

		/**
		*	A wrapper method that handles tokenizing the input, rearranging the tokens into postfix,
		*	and building the tree. It also handles caching trees based on the input if the caching feature is enabled (the default)
		*
		*	@method buildTreeFromFormula
		*	@param {String} input The formula used to build the tree
		*	@return {Object} A tree that can be evaluated by the evalTree method
		*/
		function buildTreeFromFormula(input) {
			var tree,
				tokens,
				postFix;

			if (cacheEnabled) {
				if(tree = cache[input]) {
					return tree;
				}
			}

			if (!tree) {
				tokens = tokenize(input);
				postFix = infixToPostFix(tokens);
				tree = buildTree(postFix);
				if (cacheEnabled) {
					cache[input] = tree;
				}
				return tree;
			}
		}
		/**
		*	A wrapper method that retreves a tree for a given formula and evaluates it against
		*	the given object. This is the functions that gets called by _eval
		*
		*	@method calculate
		*	@param {String} input The formula used to retrieve the tree
		*	@param {string} object The object that will be used to populate the variables
		*	@return {Object} The result of the formula with the object used to populate variable values
		*/
		function calculate(input, object) {
			sourceFields = {};
			undefinedFields = {};

			var tree = buildTreeFromFormula(input);
			var evalResult = evalTree(tree, object);
			return {'result': evalResult,
					'sourceFields':sourceFields,
					'undefinedFields':undefinedFields};
		}
		/**
		*	Sets the functions that can be used in the formulas
		*
		*	@method setFunctions
		*	@param {Object} newFunctions A map of function names to functions
		*/
		function setFunctions(newFunctions) {
			var functionRegexs = [],
				regexString;
			functions = newFunctions;
			for (var prop in functions) {
				if (functions.hasOwnProperty(prop)) {
					functionRegexs.push('^' + prop + '\\(');
				}
			}
			if (!functionRegexs) {
				functionRegex = null;
			} else {
				regexString = functionRegexs.join('|');
				functionRegex = new RegExp(regexString);
			}
		}
		/**
		*	Sets the strings that will be used to wrap a variable for parsing
		*
		*	@method setVarDelimiter
		*	@param {String} open The string that signifies the start of a variable
		*	@param {String} close The string that signifies the end of a variable
		*/
		function setVarDelimiter(open, close) {
			if (open && close) {
				variableOpen = open;
				variableEnd = close;
				variableRegex = new RegExp('^' + variableOpen + '.*?' + variableEnd);
			} else {
				variableRegex = null;
			}
		}
		/**
		*	Sets whether caching is enabled (default) or disabled
		*
		*	@method setCacheEnabled
		*	@param {Boolean} ce Caching enabled
		*/
		function setCacheEnabled(ce) {
			cacheEnabled = ce;
		}

		function hasDependency(contextId, fieldName) {
			//check if bypass depency check is flagged
			var skipCheckFields = isBypassCheck[contextId];
			if(typeof(skipCheckFields) !== 'undefined') {
				var skipCheck = skipCheckFields[fieldName];
				if(typeof(skipCheck) !== 'undefined'
						&& skipCheck === true) {
					return false;

				}
			}

			//check depency count
			var dependenciesForObject = varDependencies[contextId];
			if(typeof(dependenciesForObject) !== 'undefined') {
				var dependencyCount = dependenciesForObject[fieldName];
				return typeof(dependencyCount) !== 'undefined' && dependencyCount > 0;

			}

			return false;
		}

		/**
		*	Sets whether caching is enabled (default) or disabled
		*
		*	@method setCacheEnabled
		*	@param {Boolean} ce Caching enabled
		*/
		function enableDependencyCheck(contextSO, fieldName) {
			var bypassFields = isBypassCheck[contextSO.Id];
			if(typeof(bypassFields) !== 'undefined') {
				bypassFields[fieldName] = false;

			}
		}

		function disableDependencyCheck(contextSO, fieldName) {
			//<Id, <String, Integer>>
			var bypassFields = isBypassCheck[contextSO.Id];
			if(typeof(bypassFields) === 'undefined') {
				bypassFields = {};
				bypassFields[''+fieldName] = true;
				isBypassCheck[contextSO.Id] = bypassFields;

			} else {
				bypassFields[''+fieldName] = true;
			}
		}

		/**
		*	Disables the depency check on specified field
		*	@param contextSO context SObject
		*	@param fieldName field on sObject which we are evaluating
		*/
		function decrementDependencyCount(contextSO, fieldName) {
			var dependenciesForObject = varDependencies[contextSO.Id];
			if(angular.isDefined(dependenciesForObject)) {
				var dependencyCount = dependenciesForObject[fieldName];
				if(angular.isDefined(dependencyCount)
						&& dependencyCount > 0) {
					dependenciesForObject[fieldName]-=1;
				}
			}
		}

		/**
		*	Enables the depency check on specified field
		*	@param contextSO context SObject
		*	@param fieldName field on sObject which we are evaluating
		*/
		function incrementDependencyCount(contextSO, fieldName) {
			var dependenciesForObject = varDependencies[contextSO.Id];
			if(angular.isUndefined(dependenciesForObject)) {
				dependenciesForObject = {};
				varDependencies[contextSO.Id] = dependenciesForObject;
			}

			var dependencyCount = dependenciesForObject[fieldName];
			if(angular.isUndefined(dependencyCount)) {
				dependencyCount = 0;
			}

			//increment dependency count
			dependenciesForObject[fieldName] = ++dependencyCount;

		}

		function clearDependencies() {
			varDependencies = {};
		}

		/**
		*	Builds an executable function which accepts an object as a parameter
		*
		*	@method buildFunction
		*	@param {String} formula The formula that will be evaluated
		*	@return {Function} an executable function which accepts an object as a parameter
		*/
		function buildFunction(formula) {
			var tree = buildTreeFromFormula(formula);
			var newFunction = function(object) {
				return evalTree(tree, object);
			};
			return newFunction;
		}

	}

})();