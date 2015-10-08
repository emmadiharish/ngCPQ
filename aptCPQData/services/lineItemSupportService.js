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
			"txnOnly": /(PriceListItemId__c|ProductId__r|OptionId__r|LocationId__r)$/
		};

		//Fields that should always be included when submitting a line item SO
		service.lineItemSOFields = [
			"Id",
			nsPrefix + "ConfigurationId__c",
			nsPrefix + "HasAttributes__c",
			nsPrefix + "HasDefaults__c",
			nsPrefix + "HasOptions__c",
			nsPrefix + "ItemSequence__c",
			nsPrefix + "LineType__c",
			nsPrefix + "LineNumber__c",
			nsPrefix + "ParentBundleNumber__c",
			nsPrefix + "PricingStatus__c",
			nsPrefix + "PrimaryLineNumber__c",
			nsPrefix + "ProductId__c",
			nsPrefix + "PriceListId__c",
			nsPrefix + "ClassificationId__c"

		];

		/** Line Item string constants*/
		//Line action
		service.LINE_ACTION_NONE = 'none';
		service.LINE_ACTION_ADD = 'add';
		service.LINE_ACTION_UPDATE = 'update';
		service.LINE_ACTION_DELETE = 'delete';
		service.PRICING_STATUS_PENDING = 'Pending';
		//Config status
		service.CONFIG_STATUS_NA = 'NA';
		service.CONFIG_STATUS_DEFAULT_PENDING = 'Default Pending';
		service.CONFIG_STATUS_PENDING = 'Pending';
		service.CONFIG_STATUS_COMPLETE = 'Complete';
	

		//Attach public Methods
		service.clearLineItemSO = clearLineItemSO;
		service.cloneDeep = cloneDeep;
		service.compareOptionLineToComponent = compareOptionLineToComponent;
		service.deselectLineItem = deselectLineItem;
		service.getIsFieldExcluded = getIsFieldExcluded;
		service.getIsItemDetailed = getIsItemDetailed;
		service.getIsPricePending = getIsPricePending;
		service.getLineItemSO = getLineItemSO;
		service.getFullyQualifiedName = getFullyQualifiedName;
		service.getPrimaryLineNumber = getPrimaryLineNumber;
		service.markPricingPending = markPricingPending;
		service.newLineItemForAssetActions = newLineItemForAssetActions;
		service.newLineItemForProduct = newLineItemForProduct;
		service.newLineItemsFromClone = newLineItemsFromClone;
		service.newLineItemSO = newLineItemSO;
		service.newOptionLineItemForComponent = newOptionLineItemForComponent;
		service.selectLineItem = selectLineItem;
		service.setLineAction = setLineAction;


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
				return newSO;
				//Loop to allow defaulting based on display columns.
				//TODO: Determine if this is necessary and what to do with defaults
				// return ConfigurationDataService.getDisplayColumns().then(function (result) {
				// 	var displayColumns = result.cartLineItemColumns;
				// 	for (var colIndex = 0, colLength = displayColumns.length; colIndex < colLength; colIndex += 1) {
				// 		nextFieldName = displayColumns[colIndex].FieldName;
				// 		if (displayColumns[colIndex].FieldType !== 'REFERENCE') {
				// 			newSO[nextFieldName] = undefined;

				// 		}

				// 	}
				// 	return newSO;

				// });
				
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
					"isSelected": true,
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
						isPending = sObject && (sObject[pricingField] === service.PRICING_STATUS_PENDING || sObject[pricingField] === null);
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
					chargeLine.lineItemSO[nsPrefix + 'PricingStatus__c'] = service.PRICING_STATUS_PENDING;
					
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

		function getIsFieldExcluded(fieldName) {
			var mainExcludeTest = exclusionPatterns.always.test(fieldName);
			var pricesOnlyTest = exclusionPatterns.pricesOnly.test(fieldName);
			var txnOnlyTest = exclusionPatterns.txnOnly.test(fieldName);
			var shouldExclude = mainExcludeTest || pricesOnlyTest || txnOnlyTest;
			return shouldExclude;

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
				if (key === 'chargeLines') {
					//Only clone the the primary line.
					var chargeClones = [];
					var primaryLine = value ? value[0] : undefined;
					if (primaryLine) {
						chargeClones.push(_.cloneDeep(primaryLine, lineItemDeepCallback));

					}
					return chargeClones;

				} else if (key === 'optionLines') {
					//Only include option lines which are selected
					var optionsToClone = _.filter(value, 'isSelected');
					return _.cloneDeep(optionsToClone, lineItemDeepCallback);

				}
				var lisoToClone;
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
							lisoToClone = withoutExcludes;

						} else {
							return _.cloneDeep(withoutExcludes, lineItemDeepCallback);
							
						}
						
					}

				}
				if (key === 'lineItemSO') {
					lisoToClone = lisoToClone ? lisoToClone : value;
					//Special clone for line item SO
					var copiedLine = _.cloneDeep(lisoToClone, lineItemSOCallback);
					//Identify source for the cloned SO
					copiedLine[nsPrefix + 'CopySourceNumber__c'] = value[nsPrefix + 'PrimaryLineNumber__c'];
					copiedLine[nsPrefix + 'CopySourceBundleNumber__c'] = value[nsPrefix + 'ParentBundleNumber__c'];
					copiedLine[nsPrefix + 'CopySourceLineNumber__c'] = value[nsPrefix + 'LineNumber__c'];
					
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

		function getPrimaryLineNumber(lineItemDO) {
			var primarySO = getLineItemSO(lineItemDO);
			return primarySO ? primarySO[nsPrefix + 'PrimaryLineNumber__c'] : undefined;
			
		}

		function getFullyQualifiedName(fieldStr) {
			//Return immediately for standard field(s)
			if (fieldStr === 'Id') {
				return fieldStr;

			}
			return fieldStr.indexOf(nsPrefix) === 0 ? fieldStr : nsPrefix + fieldStr;

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
			lineItemSO[nsPrefix + "PricingStatus__c"] = service.PRICING_STATUS_PENDING;
			//Reset attr value id to configuration id to indicate new value is needed
			if (lineItemSO[nsPrefix + "HasAttributes__c"]) {
				lineItemSO[nsPrefix + 'AttributeValueId__c'] = lineItemSO[nsPrefix + 'ConfigurationId__c'];
				var attrValueObject = lineItemSO[nsPrefix + 'AttributeValueId__r'];
				if (attrValueObject) {
					attrValueObject.Id = lineItemSO[nsPrefix + 'ConfigurationId__c'];
				
				}
				
			}

		}

	}

})();