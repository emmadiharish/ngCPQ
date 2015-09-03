;(function() {
	angular.module('aptCPQData')
		.service('LineItemSupport', LineItemSupport); 
		
	LineItemSupport.$inject = [
		'$log',
		'lodash',
		'systemConstants',
		'ConfigurationDataService'
	];

	function LineItemSupport($log, _, systemConstants, ConfigurationDataService) {
		var service = this;

		//Starting txnPLN value. This is the only state-based information the service contains.
		var baseTxnPrimaryLineNumber = 10001;
		//Shorthand and object dereference. Note that this will be assigned on
		//	service construction, so if the nsprefix is changed in the settings
		//	the change will not be seen here.
		var nsPrefix = systemConstants.nsPrefix;

		//Patterns for matching line item object properties which should be
		//	excluded when a line item structure is cloned.
		//	TODO: use things listed in txnOnly because pricesOnly causes errors.
		var exclusionPatterns = {
			"always": /^(\$\$|\@\@)/,
			"pricesOnly": /(PriceLists__r|PriceListItemId__r)$/,
			"txnOnly": /(PriceListItemId__c|ProductId__r|OptionId__r)$/
		};

		//Helpful string constants
		service.LINE_ACTION_NONE = 'none';
		service.LINE_ACTION_ADD = 'add';
		service.LINE_ACTION_UPDATE = 'update';
		service.LINE_ACTION_DELETE = 'delete';

		//Attach public Methods
		service.newLineItemSO = newLineItemSO;
		service.newLineItemForProduct = newLineItemForProduct;
		service.newLineItemsFromClone = newLineItemsFromClone;
		service.newOptionLineItemForComponent = newOptionLineItemForComponent;
		service.newLineItemForAssetActions = newLineItemForAssetActions;
		service.newLineItemSet = newLineItemSet;
		service.getIsPricePending = getIsPricePending;
		service.getIsItemDetailed = getIsItemDetailed;
		service.cloneDeep = cloneDeep;
		service.mergeOptionLines = mergeOptionLines;
		service.setLineAction = setLineAction;
		service.selectLineItem = selectLineItem;
		service.deselectLineItem = deselectLineItem;
		service.getLineItemSO = getLineItemSO;
		service.compareOptionLineToComponent = compareOptionLineToComponent;
		service.markPricingPending = markPricingPending;

		/** Method definitions */

		/** Get next TPLN by incrementing service variable. */
		function getNextTxnPrimaryLineNumber() {
			return baseTxnPrimaryLineNumber += 1;

		}

		/** Expose base TPLN for customization */
		function setBaseTxnPrimaryLineNumber(newTPLN) {
			if (angular.isNumber(newTPLN)) {
				baseTxnPrimaryLineNumber = newTPLN;

			}
			return baseTxnPrimaryLineNumber;

		}


		/** Return the simplest, empty SO. */
		function newLineItemSO() {
			var newSO = {
				"Id": null
			};
			
			newSO[nsPrefix + "PricingStatus__c"] = "Pending";

			return ConfigurationDataService.requestBasePromise.then(function(requestBase){
				newSO[nsPrefix + "ConfigurationId__c"] = requestBase.cartId;
				//Loop to allow defaulting based on display columns.
				//TODO: Determine if this is necessary and what to do with defaults
				return ConfigurationDataService.getDisplayColumns().then(function (result) {
					var displayColumns = result.cartLineItemColumns;
					for (var colIndex = 0, colLength = displayColumns.length; colIndex < colLength; colIndex += 1) {
						nextFieldName = displayColumns[colIndex].FieldName;
						if (displayColumns[colIndex].FieldType !== 'REFERENCE') {
							newSO[nextFieldName] = undefined;

						}

					}
					return newSO;

				});
				
			});

		}

		/**
		 * create new line item structure
		 * @param productSO SObject for product
		 * @param quantity Quantity as entered by user  
		 */
		function newLineItemForAssetActions (lineItems, lineAction, swapProduct) {
			// check if valid list of line items
			if (_.isArray.lineItems) {
				if (_.isObject.lineItems) {
					lineItems = [lineItems];
				} else {
					return [];
				}
			}

			// TODO: Add a check here to see if valid lineAction has been selected

			// Prepare a list of cloned lineItemDO objects
			var lineItemDOList = [];
			var txnPLN;
			lineItems.forEach(function(lineItem) {
				txnPLN = getNextTxnPrimaryLineNumber();
				var lineItemSO = {};
				//lineItemSO[nsPrefix + 'AssetLineItemId__c'] = lineItem[nsPrefix + 'AssetLineItemId__c'];
				lineItemSO[nsPrefix + 'AssetLineItemId__c'] = (lineItem[nsPrefix + 'AssetLineItemId__c']) ? 
					lineItem[nsPrefix + 'AssetLineItemId__c'] : lineItem.Id;
				lineItemSO[nsPrefix + 'LineType__c'] = lineItem[nsPrefix + 'LineType__c'];
				lineItemSO[nsPrefix + 'Quantity__c'] = lineItem[nsPrefix + 'Quantity__c'];
				lineItemSO[nsPrefix + 'EndDate__c'] = lineItem[nsPrefix + 'EndDate__c'];
				lineItemSO[nsPrefix + 'ProductId__c'] = lineItem[nsPrefix + 'ProductId__c'];
				lineItemSO[nsPrefix + 'ProductId__r'] = lineItem[nsPrefix + 'ProductId__r'];
				lineItemSO[nsPrefix + 'HasOptions__c'] = lineItem[nsPrefix + 'HasOptions__c'];
				lineItemSO[nsPrefix + 'HasAttributes__c'] = lineItem[nsPrefix + 'HasAttributes__c'];

				var lineItemDO = {
					"lineItemSO": lineItemSO,
					"txnPrimaryLineNumber": txnPLN,
					"sequence": txnPLN,
					"chargeLines": [
						{
							// "txnPrimaryLineNumber": txnPLN,
							"lineItemSO": lineItemSO
						}
					],
					"lineAction": lineAction,
					"optionLines": []
				};

				// add swap items if available
				if (lineAction.toLowerCase() === "upgrade") {
					lineItemDO.swapLines = [];
					var swapLineItemSO = {};
					swapLineItemSO[nsPrefix + "Quantity__c"] = swapProduct.quantity;
					swapLineItemSO[nsPrefix + "ProductId__c"] = swapProduct.productId;
					if (swapProduct.effectiveDate === undefined) {
						var timeNow = new Date();
						swapProduct.effectiveDate = (timeNow.getTime() + systemConstants.msecPerDay);
					}
					swapLineItemSO[nsPrefix + "StartDate__c"] = swapProduct.effectiveDate;
					swapLineItemSO[nsPrefix + "ProductId__c"] = swapProduct.productId;

					lineItemDO.swapLines.push({ "lineItemSO": swapLineItemSO });
				}

				lineItemDOList.push(lineItemDO);
			});
			return lineItemDOList;
		}

		/** Create a lineItemDO for a product SO w/ optional quantity */
		function newLineItemForProduct(productSO, quantity) {
			quantity = quantity || 1;
			var txnPLN = getNextTxnPrimaryLineNumber();
			return newLineItemSO().then(function (lineItemSO) {
				lineItemSO[nsPrefix + 'LineType__c'] = 'Product/Service';
				lineItemSO[nsPrefix + 'Quantity__c'] = quantity;
				lineItemSO[nsPrefix + 'ProductId__c'] = productSO.Id;
				//TODO: optimization can be done later to reduce pay load
				lineItemSO[nsPrefix + 'ProductId__r'] = productSO;
				
				lineItemSO[nsPrefix + 'Uom__c'] = productSO[nsPrefix + 'Uom__c'];
				lineItemSO[nsPrefix + 'Description__c'] = productSO['Name'];
				
				lineItemSO[nsPrefix + 'Customizable__c'] = productSO[nsPrefix + 'Customizable__c'];
				lineItemSO[nsPrefix + 'HasDefaults__c'] = productSO[nsPrefix + 'HasDefaults__c'];
				lineItemSO[nsPrefix + 'HasOptions__c'] = productSO[nsPrefix + 'HasOptions__c'];

				var hasAttributes = productSO[nsPrefix + 'HasAttributes__c'];
				lineItemSO[nsPrefix + 'HasAttributes__c'] = hasAttributes;
				if (hasAttributes) {
					lineItemSO[nsPrefix + 'AttributeValueId__r'] = {
						"Id": lineItemSO[nsPrefix + 'ConfigurationId__c']
					};
					
				}

				var lineItemDO = {
					"lineItemSO": lineItemSO,
					"txnPrimaryLineNumber": txnPLN,
					//TODO: set sequence according to existing items.
					"sequence": txnPLN,
					"isSelected": true,
					"chargeLines": [
						{
							"txnPrimaryLineNumber": txnPLN,
							"lineItemSO": lineItemSO 
						}
					],
					"optionLines": []
				};
				return lineItemDO;
				
			}); 

		}

		/** Create line item DO for option line using option component */
		function newOptionLineItemForComponent(productOptionComponent) {
			var txnPLN = getNextTxnPrimaryLineNumber();
			var componentProduct = productOptionComponent[nsPrefix + 'ComponentProductId__r'];
			return newLineItemSO().then(function (lineItemSO) {
				lineItemSO[nsPrefix + 'LineType__c'] = 'Option';
				// lineItemSO[nsPrefix + 'PrimaryLineNumber__c'] = txnPLN;
				lineItemSO[nsPrefix + 'ProductOptionId__c'] = productOptionComponent.Id;
				var defaultQuantity = productOptionComponent[nsPrefix + 'DefaultQuantity__c'];
				lineItemSO[nsPrefix + 'Quantity__c'] =  defaultQuantity ? defaultQuantity : 1.0;
				lineItemSO[nsPrefix + 'OptionId__c'] = componentProduct.Id;
				
				//TODO: optimize to reduce pay load
				lineItemSO[nsPrefix + 'OptionId__r'] = componentProduct;
				
				lineItemSO[nsPrefix + 'Description__c'] = componentProduct.Name;
				lineItemSO[nsPrefix + 'Uom__c'] = componentProduct[nsPrefix + 'Uom__c'];
				lineItemSO[nsPrefix + 'IsQuantityModifiable__c'] = componentProduct[nsPrefix + 'Modifiable__c'];
				lineItemSO[nsPrefix + 'Customizable__c'] = componentProduct[nsPrefix + 'Customizable__c'];
				lineItemSO[nsPrefix + 'HasOptions__c'] = componentProduct[nsPrefix + 'HasOptions__c'];
				var hasAttributes = componentProduct[nsPrefix + 'HasAttributes__c'];
				lineItemSO[nsPrefix + 'HasAttributes__c'] = hasAttributes;
				if (hasAttributes) {
					lineItemSO[nsPrefix + 'AttributeValueId__r'] = {
						"Id": lineItemSO[nsPrefix + 'ConfigurationId__c']
					};

				}
				//The code that uses the DO should handle whether to select by default.
				// var isSelected = productOptionComponent[nsPrefix + 'Default__c'] ? true : false;
				var isSelected = false;
				var action = isSelected ? service.LINE_ACTION_ADD : service.LINE_ACTION_NONE;
				var lineItemDO = {
					"isSelected": isSelected,
					"lineAction": action,
					"lineItemSO": lineItemSO,
					"txnPrimaryLineNumber": txnPLN,
					"chargeLines": [
						{
							"txnPrimaryLineNumber": txnPLN,
							"lineItemSO": lineItemSO
						}
					],
					"optionLines": []
				};
				return lineItemDO;
				
			}); 

		}

		/** Check the pricing status for a line item. */
		function getIsPricePending(lineItemDO) {
			var isPending = false;
			if (lineItemDO && lineItemDO.isSelected === true) {
				angular.forEach(lineItemDO.chargeLines, function(chargeLineDO, key){
					if (isPending === false) {
						var sObject = chargeLineDO.lineItemSO;
						var pricingField = nsPrefix + 'PricingStatus__c';
						isPending = sObject && (sObject[pricingField] === 'Pending' || sObject[pricingField] === null);
					}
				});
				if (lineItemDO.optionLines) {
					angular.forEach(lineItemDO.optionLines, function(optionLineDO, key){
						if (isPending === false) {
							isPending = getIsPricePending(optionLineDO);
						}
					});
				}

			}
			return isPending;

		}

		/**
		 *  Mark pricing pending for line items
		 */
		function markPricingPending(lineItems) {
			_.each(lineItems, function(lineItem) {
				_.each(lineItem.chargeLines, function(chargeLine) {
					chargeLine.lineItemSO[nsPrefix + 'PricingStatus__c'] = 'Pending';
					
				});
			});

			return lineItems;
		} 

		/** Deterine whether a line item has its details attached. */
		function getIsItemDetailed(lineItemDO) {
			if (!lineItemDO) {
				return false;

			}
			var hasOptionDetails = angular.isDefined(lineItemDO.optionLines);
			var hasChargeLines = angular.isDefined(lineItemDO.chargeLines);
			if (hasOptionDetails && hasChargeLines) {
				var primaryLine = getLineItemSO(lineItemDO);
				if (angular.isDefined(primaryLine)) {
					var hasAttributes = primaryLine[nsPrefix + 'HasAttributes__c'];
					if (hasAttributes) {
						var attrSO = primaryLine[nsPrefix + 'AttributeValueId__r'];
						return angular.isDefined(attrSO) && attrSO.Id != primaryLine[nsPrefix + 'ConfigurationId__c'];

					}
					
				}
				
			}
			return false;
			
		}

		/**
		 * Use lodash cloneDeep to create a full copy of a line item structure,
		 * 	which may be a single or array lineItemDO
		 * @param  {Object/Array} lineItemStructure
		 * @param  {Regexp} customExcludePattern
		 * @return {Object/Array} cloned structure
		 */
		function cloneDeep(lineItemStructure) {
			return _.cloneDeep(lineItemStructure, exclusionCallback);

			function exclusionCallback(value, key, srcObject) {
				if (_.isPlainObject(value)) {
					//Test for properties which should not be cloned.
					var isAnyPropertyExcluded = false;
					var withoutExcludes = _.omit(value, function (testVal, testKey) {
						var mainExcludeTest = exclusionPatterns.always.test(testKey);
						var pricesOnlyTest = exclusionPatterns.pricesOnly.test(testKey);
						var txnOnlyTest = exclusionPatterns.txnOnly.test(testKey);
						var mainOrTxn = mainExcludeTest || pricesOnlyTest || txnOnlyTest;
						isAnyPropertyExcluded = isAnyPropertyExcluded || mainOrTxn;
						return mainOrTxn;
					});
					if (isAnyPropertyExcluded) {
						return _.cloneDeep(withoutExcludes, exclusionCallback);
						
					}

				} else if (key === 'optionLines') {
					//_.filter will call fixOptionSelection on each option line 
					//	and collect all lines for which it returns true.
					var selectedOptions = _.filter(value, fixOptionSelection);
					return _.cloneDeep(selectedOptions, exclusionCallback);

				}
				return undefined;

			}

		}


		/**
		 * Create deep clone of a collection of line items with all unique 
		 * 	line-item properties fixed. Property modifications should be:
		 * 		- lineItemDO.txnPrimaryLineNumber -> get new from service.
		 * 		- lineItemSO.Id 									-> set null
		 * 		- lineItemSO.LineNumber						-> set null
		 * 		- lineItemSO.PrimaryLineNumber		-> set null
		 * 		- lineItemSO.LineSequence__c			-> increment
		 * 		- lineItemSO.AttributeValueId__c	-> set to config id
		 * 		- AttributeValueId__r.Id					-> set to config id
		 * 		
		 * @param  {[type]} lineItemStructure [description]
		 * @return {[type]}                   [description]
		 */
		function newLineItemsFromClone(lineItemStructure) {
			return _.cloneDeep(lineItemStructure, lineItemDeepCallback);

			/** Main callback for editing line item structures during clone. */
			function lineItemDeepCallback(value, key, srcObject) {
				//Always remove exclude certain properties from objects
				if (_.isObject(value)) {
					//Test for properties which should not be cloned.
					var isAnyPropertyExcluded = false;
					var withoutExcludes = _.omit(value, function (testVal, testKey) {
						var mainExcludeTest = exclusionPatterns.always.test(testKey);
						isAnyPropertyExcluded = isAnyPropertyExcluded || mainExcludeTest;
						return mainExcludeTest;
					});
					if (isAnyPropertyExcluded) {
						if (key === 'lineItemSO') {
							//Special clone for line item so
							return _.cloneDeep(withoutExcludes, lineItemSOCallback);

						}
						return _.cloneDeep(withoutExcludes, lineItemDeepCallback);
						
					}

				}
				//If property exclusion wasn't necessary, continue
				if (key === 'lineItemSO') {
					//Special clone for line item so
					var copiedLine = _.cloneDeep(value, lineItemSOCallback);
					copiedLine[nsPrefix + 'CopySourceNumber__c'] = value[nsPrefix + 'PrimaryLineNumber__c'];
					
					return copiedLine;
					
				} else if (key === 'txnPrimaryLineNumber') {
					return getNextTxnPrimaryLineNumber();

				} else if (key === 'lineAction') {
					return service.LINE_ACTION_ADD;

				} else if (key === 'isSelected') {
					return true;

				}
				return undefined; //Defer to lodash clone.

			}

			/** Callback to clone line item so's while modifying some properties. */
			function lineItemSOCallback(lineItemValue, lineItemProperty, srcLineItemSO) {
				if (lineItemProperty === 'Id') {
					return null; //Null doesn't defer to lodash clone

				} else if (lineItemProperty === nsPrefix + 'LineNumber__c' || lineItemProperty === nsPrefix + 'PrimaryLineNumber__c') {
					return null;
				
				} else if (lineItemProperty === nsPrefix + 'LineSequence__c') {
					return lineItemValue + 0.5;

				} else if (lineItemProperty === nsPrefix + 'AttributeValueId__c') {
					return srcLineItemSO[nsPrefix + 'ConfigurationId__c'];

				} else if (lineItemProperty === nsPrefix + 'AttributeValueId__r') {
					//Defining value object callback anonymously b/c it's relatively simple
					//	and it needs access to the parent SO's config id.
					return _.cloneDeep(lineItemValue, function attrSOCallback(attrValue, attrKey) {
						if (attrKey === 'Id') {
							return srcLineItemSO[nsPrefix + 'ConfigurationId__c'];
						}
					});

				}
				return undefined; //Defer to lodash clone.

			}

		}


		/**
		 * Loops through an array of line items at puts the lineAction string
		 * 	on all all of them. Possible actions: 'add', 'update', 'delete'
		 */
		function setLineAction(lineItems, lineAction) {
			lineItems = [].concat(lineItems);
			var nextItem;
			for (var itemIndex = lineItems.length - 1; itemIndex >= 0; itemIndex--) {
				nextItem = lineItems[itemIndex];
				if (nextItem && nextItem.lineAction != service.LINE_ACTION_ADD) {
					nextItem.lineAction = lineAction;

				}

			}
			return lineItems;

		}		

		function deselectLineItem(lineItemDO) {
			lineItemDO.isSelected = false;
			var liso = getLineItemSO(lineItemDO);
			if (liso) {
				lineItemDO['@@dirty'] = true;
				if (liso.Id) {
					lineItemDO.lineAction = service.LINE_ACTION_DELETE;

				} else {
					lineItemDO.lineAction = service.LINE_ACTION_NONE;

				}

			}

		}

		function selectLineItem(lineItemDO) {
			lineItemDO.isSelected = true;
			var liso = getLineItemSO(lineItemDO);
			if (liso) {
				lineItemDO['@@dirty'] = true;
				if (liso.Id) {
					lineItemDO.lineAction = service.LINE_ACTION_UPDATE;

				} else {
					lineItemDO.lineAction = service.LINE_ACTION_ADD;

				}

			}

		}

		/**
		 * Ensure the correct line action is set for each option line item DO
		 * 	based on whether isSelected is true and whether its primary line 
		 * 	has an id value indicating it is persisted. 
		 * 	
		 * @param  {Object} lineItemDO the DO of the option line
		 * @return {Boolean}           true if the line item needs to be added,
		 *                             updated, or deleted; else false.
		 */
		function fixOptionSelection(lineItemDO) {
			var shouldSubmit = false;
			var lineItemSO = getLineItemSO(lineItemDO);
			if (!lineItemSO) {
				lineItemDO.isSelected = false;
				lineItemDO.lineAction = service.LINE_ACTION_NONE;
				return shouldSubmit;

			}
			var isSelected = lineItemDO.hasOwnProperty('isSelected') && lineItemDO.isSelected === true;
			var isDirty = lineItemDO.hasOwnProperty('@@dirty') && lineItemDO['@@dirty'] === true;
			lineItemDO['@@dirty'] = false;
			if (isSelected) {
				shouldSubmit = true; //TODO: use isDirty
				if (lineItemSO.Id) {
					lineItemDO.lineAction = service.LINE_ACTION_UPDATE;

				} else {
					lineItemDO.lineAction = service.LINE_ACTION_ADD;

				}

			} else {
				if (lineItemSO.Id) {
					shouldSubmit = true;
					lineItemDO.lineAction = service.LINE_ACTION_DELETE;

				} else {
					lineItemDO.lineAction = service.LINE_ACTION_NONE;

				}

			}
			return shouldSubmit;

		}


		function getLineItemSO(lineItemDO) {
			var chargeLines, chargeDO;
			if (lineItemDO && lineItemDO.chargeLines) {
				chargeDO = lineItemDO.chargeLines[0];
				if (chargeDO && chargeDO.lineItemSO) {
					return chargeDO.lineItemSO;
				}
			}
			return undefined;
		}

		function compareOptionLineToComponent(optionDO, optionComponet) {
			var optionSO = getLineItemSO(optionDO);
			return optionSO[nsPrefix + 'ProductOptionId__c'] == optionComponet.Id;
			
		}

		/**
		 * Helper for reseting the ids on an a line item. Used to ensure lines 
		 * 	that have been cleared from the server aren't resubmitted with old Ids.
		 * 	
		 * @param  {[type]} optionLineDO [description]
		 * @return {[type]}              [description]
		 */
		function clearLineItemIds(optionLineDO) {
			var isSelected = (optionLineDO.isSelected === true);
			var isDirty = (optionLineDO['@@dirty'] === true);
			if (isSelected && !isDirty) {
				optionLineDO.isSelected = false;

			}
			var chargeLines = optionLineDO.chargeLines;
			if (!angular.isDefined(chargeLines) || chargeLines.length < 1) {
				return;

			}
			var lineItemSO = chargeLines[0].lineItemSO;
			//Drop invalid charge lines
			chargeLines.length = 1;
			if (!lineItemSO) {
				return optionLineDO;

			}
			clearLineItemSO(lineItemSO);			
			//Set header line to be safe
			optionLineDO.lineItemSO = lineItemSO;
			return optionLineDO;

		}

		function clearLineItemSO(lineItemSO) {
			if (!lineItemSO) {
				return;

			}
			lineItemSO.Id = null;
			lineItemSO[nsPrefix + "PricingStatus__c"] = null;
			//Reset attr value id to configuration id to indicate new value is needed
			if (lineItemSO[nsPrefix + "HasAttributes__c"]) {
				lineItemSO[nsPrefix + 'AttributeValueId__c'] = lineItemSO[nsPrefix + 'ConfigurationId__c'];
				var attrValueObject = lineItemSO[nsPrefix + 'AttributeValueId__r'];
				if (attrValueObject) {
					attrValueObject.Id = lineItemSO[nsPrefix + 'ConfigurationId__c'];
				
				}
				
			}

		}

		/**
		 * Wrapper for merging line items with lodash.merge. Mainly used for mapping
		 * 	option line item DOs to each other by their option component
		 * 	(otherwise, merge would be handled by array index ). If the 
		 * 	callback returned undefined, lodash uses its own merge logic
		 * 	for different object/primitive types.
		 * 	
		 */
		function mergeLineItems(targetLine, sourceLine, clearUnmatched) {
			return _.merge(targetLine, sourceLine, function (destVal, sourceVal, property, destObj, sourceObj) {
				if (sourceVal === null) {
					return destVal;

				}
				//Temporary fix to prevent server from lying and saying line item doesn't have options.
				if (property === nsPrefix + 'HasOptions__c' || property === nsPrefix + 'HasAttributes__c') {
					return destVal || sourceVal;

				}
				if (property === "isSelected") {
					var isDirty = destObj.hasOwnProperty('@@dirty') && destObj['@@dirty'] === true;
					//If the client-side hasn't tried to change the selection of the option, use the server selection.
					if (!isDirty) {
						return sourceVal;

					}
					//Otherwise, make sure client selection is preserved.
					return destVal;

				}
				//destVal and sourceVal should be arrays of option DO's
				if (property === "optionLines") {
					return mergeOptionLines(destVal, sourceVal, clearUnmatched);

				}
				//Strip off trailing charge lines, then lodash will merge the remaining.
				if (property === "chargeLines" && angular.isArray(destVal)) {
					if (!sourceVal || sourceVal.length === 0 && destVal.length > 0) {
						destVal.length = 1;
						clearLineItemSO(destVal[0].lineItemSO);

					} else {
						destVal.length = sourceVal.length;

					}

				}
				//If neither of those cases, defer to lodash merge.
				return undefined;

			});

		}

		/**
		 * Function devoted to merging two arrays of option line item DOs. The 
		 * 	first array is used as the target for the merge (it is mutated).
		 * 	If the target array begins undefined, the source array is returned.
		 * 	
		 * @param  {Array} targetArr       	Target array of options
		 * @param  {Array} sourceArr      	Source array of option
		 * @param  {Boolean} clearUnmatched If truthy, clearLineItemIds will be 
		 *                                  called on each option line in the target
		 *                                  that did not have match in the source.
		 * @return {Array}                	The resulting target arr.
		 */
		function mergeOptionLines(targetArr, sourceArr, clearUnmatched) {
			if (!targetArr) {
				return sourceArr ? sourceArr : [];

			} 
			//Group the existing selected options by their componenet Id
			//TODO: check if that match fails and use TXNPLN.
			var groupedOptions = _.groupBy(targetArr, function (optionDO) {
				var optionSO = getLineItemSO(optionDO);
				return optionSO[nsPrefix + 'ProductOptionId__c'];

			});
			//For each option from the server, merge it with an existing line item
			//	if a match exists, otherwise push it into the local array.
			_.forEach(sourceArr, function (secondOptionDO) {
				var optionSO = getLineItemSO(secondOptionDO);
				var componentId = optionSO[nsPrefix + 'ProductOptionId__c'];
				var matchingOptionsArr = groupedOptions[componentId];
				if (matchingOptionsArr && matchingOptionsArr.length > 0) {
					//Merge DOs that having matching component ids
					var firstOptionDO = matchingOptionsArr[0];
					mergeLineItems(firstOptionDO, secondOptionDO, clearUnmatched);
					//Remove match from map so that only unmatched remain
					delete groupedOptions[componentId];

				} else {
					//No match from second, so this object is new
					targetArr.push(secondOptionDO);
					
				}

			});
			//For each option that did have a corresponding object come back
			// from the server, ensure it does not have old id values.
			if (clearUnmatched) {
				_.forOwn(groupedOptions, function (unmatchedArr, componentId) {
					_.forEach(unmatchedArr, clearLineItemIds);
				});				
			}
			return targetArr;

		}

		/**
		 * Constructor for making a set specifically for line items. This lets
		 * 	us try out different ways of hashing and merging line items to keep
		 * 	the DO's on the client side in sync with the server responses.
		 * 	
		 * @param {array} initItems [items to add to the set immediately.]
		 */
		function newLineItemSet(initItems) {
			var txnPrimaryLineNumberMap = {};
			return new ItemSet(initItems, lineItemHashFunction, lineItemMergeFunction, lineItemComparatorFunction);

			function getPrimaryLineNumber(item) {
				var primaryLine;
				if (item && item.chargeLines) {
					primaryLine = item.chargeLines[0];
					if (primaryLine && primaryLine.lineItemSO) {
						return primaryLine.lineItemSO[nsPrefix + 'PrimaryLineNumber__c'];
					}
				}
				return undefined;

			}
			/**
			 * Maintain a consistent hash that identifies each line item. To do this,
			 * 		a mapping between the line item's primary line number and it's txn
			 * 		primary line number is maintained.
			 * 		
			 * @param  {[type]} lineItemDO item
			 * @return {number}            hash value
			 */
			function lineItemHashFunction(lineItemDO) {
				var txnPLN = lineItemDO.txnPrimaryLineNumber;
				return txnPrimaryLineNumberMap[txnPLN] || txnPLN;

			}

			/**
			 * Used for merging data from the server with the version stored 
			 * 	locally for use by the view. The object firstItem is mutated.
			 * 	Return the primary line number of the item if that value has been
			 * 	updated by the merge. Otherwise returns undefined. This is used
			 * 	by the line item set to determine whether to rehash by a new PLN.
			 * 	
			 * @param  {LineItemDO} firstItem  Item to merge onto (i.e. view copy)
			 * @param  {LineItemDO} secondItem Item to merge from (i.e. sever copy)
			 * @return {Number}								 Primary line number of item, or undefined.
			 */
			function lineItemMergeFunction(firstItem, secondItem) {
				// return angular.extend(firstItem, secondItem);
				mergeLineItems(firstItem, secondItem, true);
				var actualPLN = getPrimaryLineNumber(firstItem);
				if (firstItem.txnPrimaryLineNumber != actualPLN) {
					txnPrimaryLineNumberMap[firstItem.txnPrimaryLineNumber] = actualPLN;
					firstItem.txnPrimaryLineNumber = actualPLN;
					return actualPLN;
					
				}
				return firstItem.txnPrimaryLineNumber;

			}

			function lineItemComparatorFunction(firstItem, secondItem) {
				function getSequence(item) {
					var sequence;
					if (item && item.chargeLines && item.chargeLines[0] && item.chargeLines[0].lineItemSO) {
						sequence = item.chargeLines[0].lineItemSO[nsPrefix + 'LineSequence__c'];

					}
					sequence = Number(sequence || item.txnPrimaryLineNumber || 0);
					return sequence;

				}
				var firstSequence = getSequence(firstItem);
				var secondSequence = getSequence(secondItem);
				return firstSequence - secondSequence;

			}

		}

		/**
		 * Set used for stashing various types of things by a hash value.
		 * Used with lineItemHashFunction to save line items by their Id.
		 * Keeping this general for now so that it can be moved out to 
		 * 	a utility service.
		 * 
		 */
		function ItemSet(initItems, customHash, customMerge, customCompare) {
			var items = new Object(null);
			var itemSet = this;
			var hash = defaultHash;
			var merge = defaultMerge;
			var compare;
			
			itemSet.size = 0;
			itemSet.hasItem = hasItem;
			itemSet.getItem = getItem;
			itemSet.getAllItems = getAllItems;
			itemSet.addItem = addItem;
			itemSet.addAllItems = addAllItems;
			itemSet.mergeItem = mergeItem;
			itemSet.mergeAllItems = mergeAllItems;
			itemSet.deleteItem = deleteItem;

			init();

			function init() {
				if (typeof customHash === 'function') {
					hash = customHash;

				}
				if (typeof customMerge === 'function') {
					merge = customMerge;

				}
				if (typeof customCompare === 'function') {
					compare = customCompare;

				}
				addAllItems(initItems);
				
			}

			function defaultHash(item) {
				var hashVal;
				if (typeof item === 'object') {
					hashVal = JSON.stringify(item);

				} else if (typeof item === 'function') {
					hashVal = item.prototype.constructor.toString();

				} else {
					hashVal = '' + item;

				} 
				return hashVal;

			}

			function isValidKey(potentialKey) {
				var keyType = typeof potentialKey;
				return keyType === 'string' || keyType === 'number';

			}

			function defaultMerge(firstItem, secondItem) {
				angular.extend(firstItem, secondItem);

			}

			function hasItem(item) {
				var itemId  = hash(item);
				return !!(items[itemId]);

			}
			function getItem(item) {
				var itemId  = hash(item);
				return items[itemId];

			}
			function addItem(item) {
				var itemId;
				if (item) {
					itemId = hash(item);

				}
				if (isValidKey(itemId)) {
					if (!items[itemId]) {
						itemSet.size += 1;

					}
					items[itemId] = item;
					
				} 
				return itemSet;

			}
			function addAllItems(allItems) {
				if (allItems) {
					for (var i = 0; i < allItems.length; i += 1) {
						addItem(allItems[i]);

					}

				}
				return itemSet;

			}
			/**
			 * Merge an item into the using the customizable merge function. 
			 * If the item is not hashable using the customizable hash function, 
			 * 	log the error and do nothing.
			 * If the there is not existing match in the set, simply add the item.
			 * If the merge function returns a value, newItemId, that is a valid key, 
			 * 	delete the existing mapping and create a new mapping using newItemId.
			 * 	
			 * @param  {object} item 	hashable and mergable.
			 * @return      	this set.
			 */
			function mergeItem(item) {
				var itemId;
				if (item) {
					itemId = hash(item);

				}
				if (isValidKey(itemId)) {
					var existing = items[itemId];
					if (!existing) {
						items[itemId] = item;
						itemSet.size += 1;

					} else {
						merge(existing, item);
						var newItemId = hash(existing);
						if (isValidKey(newItemId) && newItemId != itemId) {
							$log.debug('Merge rehash: ', newItemId, existing);
							delete items[itemId];
							// What if there is already a value at items[newItemId]?
							items[newItemId] = existing;

						}
						
					}
					
				} else {
					$log.error('Failed to hash', item);

				}
				return itemSet;

			}
			function mergeAllItems(allItems) {
				if (allItems) {
					for (var i = 0; i < allItems.length; i += 1) {
						mergeItem(allItems[i]);

					}

				}
				return itemSet;

			}	
			function deleteItem(item) {
				var itemId;
				if (item) {
					itemId = hash(item);

				}
				if (isValidKey(itemId) && items[itemId] && delete items[itemId]) {
					itemSet.size --;
					return true;
					
				} 
				return false;

			}
			function getAllItems() {
				var nextItem;
				var allItems = [];
				for (var key in items) {
					nextItem = items[key];
					if (items.hasOwnProperty(key) && nextItem) {
						allItems.push(nextItem);
						
					}

				}
				allItems.sort(compare);
				return allItems;

			}

		}

	}

})();