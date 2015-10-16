(function() {
	angular.module('aptCPQUI')
		.service('LineItemModelService', LineItemModelService);

	LineItemModelService.$inject = [
		'$q',
		'$log',
		'lodash',
		'systemConstants',
		'OptionGroupModelService',
		'ChargeLineModelService',
		'AttributeDataService',
		'AttributesCache',
		'OptionDataService',
		'FieldExpressionDataService',
		'FieldExpressionCache',
		'LineItemSupport',
		'AttributeRules',
		'AttributeMatrix'
	];

	function LineItemModelService($q, 
								 $log, 
								 _, 
								 systemConstants, 
								 OptionGroupModel, 
								 ChargeLineModel, 
								 AttributeDataService,
								 AttributesCache, 
								 OptionDataService, 
								 ExpressionsDataService,
								 FieldExpressionCache, 
								 LineItemSupport,
								 AttributeRules,
								 AttributeMatrix) {
		var nsPrefix = systemConstants.nsPrefix;
		var showTabView = !!systemConstants.customSettings.optionsPageSettings.TabViewInConfigureBundle;
		var intializedProperties = false;

		/**
		 * Object used for wrapping line item data to provide getter/setters and
		 *   organize option lines by group. This function is the return result of
		 *   initializing the LineItemModelService.
		 * @param {[type]} data       [description]
		 * @param {[type]} parentItem [description]
		 */
		function LineItemModel(sourceDO, parentItem) {
			//Actual JSON data
			this.lineItemDO = sourceDO;
			this.txnPrimaryLineNumber = sourceDO.txnPrimaryLineNumber;
			if (!angular.isDefined(parentItem)) {
				this.isRoot = true;
				this.parentItem = false;
				this.rootItem = this;
				this.grandchildrenByTxnPLN = {};
				this.grandchildrenByPLN = {};

			} else {
				this.isRoot = false;
				this.parentItem =  parentItem;
				this.rootItem = parentItem.rootItem; 
				
			}
			this.metadataPromise = $q.when(true);
			//Attribute metadata			
			this.rulesForLine; //keep a copy of rules for context line
			this.attributeDisplayInfos = undefined;

			//Change tracking & charge lines
			this.isSelectedDirty = false;
			this.chargeLines = [];
			//Option wrapping & sorting
			this.optionGroups = [];
			this.optionLines = [];
			this.optionPromisesByComponentId = {};
			this.optionLinesByPLN = {};
			this.optionLinesByTxnPLN = {};
			//expression execution
			this.expressionInfosForLine = {};

			//intialize properties
			if(!intializedProperties) {
				this.initProperty('attrRules', this.getAttrRules);
				this.initProperty('attrFields', this.getAttributeFields);
				this.initProperty('attrMatrices', this.getAttributeMatrices);
				this.initProperty('attrGroups', this.getAttributeGroups);
				this.initProperty('appliedExpressionInfos', this.getAppliedExpressionInfos);				
				intializedProperties = true;
			}
		}
		
		/**
		 * Constructs and initializes a new line item model. Returns a promise
		 *   that resolves with the new object
		 * @param  {[type]} data       [description]
		 * @param  {[type]} optionData [description]
		 * @param  {[type]} parentItem [description]
		 * @return {[type]}            [description]
		 */
		LineItemModel.create = function(sourceDO, parentItem) {
			var newItem = new this(sourceDO, parentItem);
			return newItem.init();

		};


		LineItemModel.prototype.init = function() {
			var thisItem = this;
			thisItem._buildChargeLines();
			thisItem._buildSubItems();

			var promises = {};
			if (thisItem.hasAttrs()) { //a-synchronously fetch the data
				promises.attrGroups = AttributeDataService.getAttributeGroups(thisItem.productId());				
				promises.attrFields = AttributeDataService.getAttributeFields();
				promises.attrMatrices = AttributeDataService.getAttributeMatricesForProduct(thisItem.productId());
			}

			if (thisItem.hasOptions() || (showTabView && thisItem.hasAttrs())) {
				promises.optionGroups = OptionDataService.getOptionGroups(thisItem.productId());

			}

			if(systemConstants.customSettings.systemProperties.IsEnableFieldExpressions) { //a-synchronously fetch the data
				promises.appliedInfos = ExpressionsDataService.getExpressionsForTarget(thisItem.primaryLineNumber());

			}

			thisItem.metadataPromise = $q.all(promises).then(function (results) {								
				//Build sub-group structures
				if (results.optionGroups) {
					return thisItem._buildSubGroups(results.optionGroups).then(function() {
						return thisItem;

					});

				}

				return thisItem;

			});
			return thisItem;
		
		};

		/**
		 * Get the applied expression infos for the line item
		 * @return the applied expression infoes for item
		 */
		LineItemModel.prototype.getAppliedExpressionInfos = function() {
			var expressionsByTarget = FieldExpressionCache.getExpressionsByTarget();
			var expressionsForTarget;
			if(expressionsByTarget) {
				expressionsForTarget = expressionsByTarget[this.primaryLineNumber()];

			}

			return expressionsForTarget || {};
		}

		/**
		 * Get the attribute groups for the line item
		 * @return the attribute groups for this line item
		 */
		LineItemModel.prototype.getAttributeGroups = function() {
			var groupsForProduct = AttributesCache.getAttributeGroupsForProduct(this.productId());
			return groupsForProduct || [];
		}

		/**
		 * Get the attribute rules for the line item
		 * @return the attribute rules for this line item
		 */
		LineItemModel.prototype.getAttrRules = function() {
			if(angular.isUndefined(this.rulesForLine)) {				
				var productId = this.productId();
				var attributeRules = AttributesCache.getAttributeRulesForProduct(productId);
				if(attributeRules && attributeRules.length) {
					this.rulesForLine = [];
					this.mergeAttrRules(angular.copy(attributeRules));
				}
			}

			return this.rulesForLine || [];
		}

		/**
		 * Get the attribute fields 
		 * @return the attribute field schema info
		 */
		LineItemModel.prototype.getAttributeFields = function() {
			return AttributesCache.getAttributeFields();

		}

		/**
		 * Get the attribute rules for the line item
		 * @return the attribute rules for this line item
		 */
		LineItemModel.prototype.getAttributeMatrices = function() {
			var matricesForProduct = AttributesCache.getAttributeMatricesForProduct(this.productId());
			return matricesForProduct || [];
		}

		/**
		 * Initialize the property		 
		 */
		LineItemModel.prototype.initProperty = function(propertyName, getFN, setFN) {
			var getProperty = function() {
				var result;
				if(angular.isDefined(propertyName)) {
					result = this[propertyName];
				} 
				return result;
			};

			var setProperty = function(val) {
				this[propertyName] = val;
			};

			//setup the property
			Object.defineProperty(LineItemModel.prototype, propertyName, 
								 { get: (getFN||getProperty), set: (setFN||setProperty) });
		}

		/** Construct charge lines that come with original data structure*/
		LineItemModel.prototype._buildChargeLines = function() {
			this.mergeChargeLines(this.lineItemDO.chargeLines);

		};

		/** Construct option lines for items that come with original data structure*/
		LineItemModel.prototype._buildSubItems = function() {
			var thisLine = this;
			_.forEach(thisLine.lineItemDO.optionLines, function (optionDO) {
				var optionLine = LineItemModel.create(optionDO, thisLine);
				thisLine.optionPromisesByComponentId[optionLine.optionComponentId()] = $q.when(optionLine);
				thisLine.putOptionLine(optionLine);
			});

		};

		/** Initialize group structure from metadata */
		LineItemModel.prototype._buildSubGroups = function(optionGroupMetadata) {
			var thisItem = this;
			var optionPromises = []; 
			_.forEach(optionGroupMetadata, function (groupMetadata) {
				var groupWrapper = new OptionGroupModel(groupMetadata, thisItem);
				thisItem.optionGroups.push(groupWrapper);
				optionPromises.push(groupWrapper.buildOptions());

			});
			return $q.all(optionPromises);

		};

		/**
		 * Find or construct mapping between option component and bundle item.
		 * 
		 */
		LineItemModel.prototype.findOptionLineForComponent = function(optionComponent) {
			var thisLine = this;
			var componentId = optionComponent.Id;
			//Check to see if a find is already processing
			if (thisLine.optionPromisesByComponentId[componentId]) {
				// $log.debug('Option found immediately:' + componentId);
				return $q.when(thisLine.optionPromisesByComponentId[componentId]);

			}
			var optionList = thisLine.lineItemDO.optionLines;
			var matchingDO = _.find(optionList, function(optionDO) {
				return LineItemSupport.compareOptionLineToComponent(optionDO, optionComponent);
			});
			var newItemPromise;
			if (matchingDO) {
				// $log.debug('Option DO found:' + componentId);
				newItemPromise = $q.when(LineItemModel.create(matchingDO, thisLine));

			} else {
				// $log.debug('New DO created:' + componentId);
				newItemPromise = LineItemSupport.newOptionLineItemForComponent(optionComponent).then(function (newOptionLineDO) {
					thisLine.lineItemDO.optionLines.push(newOptionLineDO);
					return LineItemModel.create(newOptionLineDO, thisLine);

				});

			}
			var postProcessPromise = newItemPromise.then(function (newOptionLine) {
				return thisLine.putOptionLine(newOptionLine);
			});
			thisLine.optionPromisesByComponentId[componentId] = postProcessPromise;
			return newItemPromise;
			
		};

		/**
		 * Get the option line items for a collection
		 * @param  {[type]} products [description]
		 * @return {[type]}          [description]
		 */
		LineItemModel.prototype.findOptionLinesForProducts = function(products) {
			var foundOptionLines = [];
			var productArray = angular.isArray(products) ? products : [products];
			//Handling single produt or collection of products. Probably overkill
			var productIdSet = _.groupBy(products, function (nextProduct) {
				if (angular.isString(nextProduct)) {
					return nextProduct;

				} else if (angular.isObject(nextProduct)) {
					return nextProduct.productSO ? nextProduct.productSO.Id : nextProduct.Id;

				} 

			});
			_.forEach(this.optionLines, function (nextOptionLine) {
				var productMatch = productIdSet[nextOptionLine.productId()];
				if (productMatch) {
					foundOptionLines.push(nextOptionLine);

				}

			});
			return foundOptionLines;

		};

		LineItemModel.prototype.putOptionLine = function(optionLine) {
			var txnPLN = optionLine.txnPrimaryLineNumber;
			var isNew = !angular.isDefined(this.optionLinesByTxnPLN[txnPLN]);
			this.optionLinesByTxnPLN[txnPLN] = optionLine;
			var actualPLN = optionLine.primaryLineNumber();
			if (actualPLN) {
				isNew = isNew && !angular.isDefined(this.optionLinesByPLN[actualPLN]);
				this.optionLinesByPLN[actualPLN] = optionLine;

			}
			if (isNew) {
				this.optionLines.push(optionLine);

			}
			//Check to make sure this isn't the root
			if (angular.isDefined(this.rootItem)) {
				//Give root item reference to all children by pln.
				this.rootItem.putGrandchild(optionLine);

			}
			return optionLine;

		};

		//Written assuming there will be a use for scanning all children from root
		LineItemModel.prototype.putGrandchild = function(optionLine) {
			if (!this.isRoot) {
				return false;
			}
			var txnPLN = optionLine.txnPrimaryLineNumber;
			var isNew = !angular.isDefined(this.grandchildrenByTxnPLN[txnPLN]);
			this.grandchildrenByTxnPLN[txnPLN] = optionLine;
			var actualPLN = optionLine.primaryLineNumber();
			if (actualPLN) {
				isNew = isNew && !angular.isDefined(this.grandchildrenByPLN[actualPLN]);
				this.grandchildrenByPLN[actualPLN] = optionLine;

			}
			return isNew;

		};

		/**
		 * Get an option line within this bundle. May be child or grandchild of 
		 * 	this line item.
		 * @param  {String|Number} optionPLN PLN or txnPLN of requested option
		 * @return {LineItemModle}           Matching option, or undefined if no match.
		 */
		LineItemModel.prototype.getOptionLine = function(optionPLN) {
			// TODO: retreive txnPLN or PLN if param isn't a number.
			var optionLine;
			if (this.isRoot) {
				if (angular.isDefined(this.grandchildrenByTxnPLN[optionPLN])) {
					optionLine = this.grandchildrenByTxnPLN[optionPLN];

				} else if (angular.isDefined(this.grandchildrenByPLN[optionPLN])) {
					optionLine = this.grandchildrenByPLN[optionPLN];

				}

			} else {
				if (angular.isDefined(this.optionLinesByTxnPLN(optionPLN))) {
					optionLine = this.optionLinesByTxnPLN(optionPLN);

				} else if (angular.isDefined(this.optionLinesByPLN(optionPLN))) {
					optionLine = this.optionLinesByPLN(optionPLN);

				}

			}
			return optionLine;

		};

		LineItemModel.prototype.mergeLineItemDO = function(newLineItemDO) {
			var thisLine = this;
			var outstandingPromises = [];
			_.forOwn(newLineItemDO, function (newValue, property) {
				//Attach any properties which are simply absent from existing object 
				if (property === 'isSelected') {
					//Only force selection change if user didn't make a change to it.
					if (!thisLine.isSelectedDirty) {
						thisLine.lineItemDO.isSelected = !!newValue;

					}

				} else if (property === 'chargeLines') {
					thisLine.mergeChargeLines(newValue);

				} else if (property === 'optionLines') {
					var optionMergePromise = thisLine.mergeOptionLines(newValue);
					outstandingPromises.push(optionMergePromise);

				} else if (property === 'attrRules') {
					thisLine.updateAttributeDefaults(newValue);

				} else if (angular.isObject(newValue)) {
					_.merge(thisLine.lineItemDO[property], newValue);

				} else {
					thisLine.lineItemDO[property] = newValue;

				}
				//TODO: asset-related merging 

			});
			return $q.all(outstandingPromises).then(function () {
				return thisLine;
			});

		};
		
		/**
		 * Merge the attribute rules with the line item model
		 * This function will mainly handle setting the "defaultedTo" flags		
		 * @param {Object} newValue the new values to merge
		 */
		LineItemModel.prototype.mergeAttrRules = function(newValue) {
			var thisLine = this;
			var attrSO = thisLine.attrSO();
			if(attrSO) {
				var defaultToValues = [];
				for(var i = 0, len = newValue.length; i < len; i++) {
					if(newValue[i].defaultValueActions) {
						for(var j = 0, defaultRuleLen = newValue[i].defaultValueActions.length; j < defaultRuleLen; j++) {
							var ruleInfo = newValue[i].defaultValueActions[j];																
							var attributeValue = attrSO[ruleInfo.fieldAPI];
							//mark as defaulted by expression
							if(angular.isUndefined(ruleInfo.defaultedTo)
									&& angular.isDefined(attributeValue)
									&& attributeValue !== null
									&& attributeValue !== '') {
								ruleInfo.defaultedTo = attributeValue;
								defaultToValues[ruleInfo.Id] = attributeValue;
							}													
						}
					}
				}
											
				_.merge(thisLine.rulesForLine, newValue);
				if(thisLine.rulesForLine) {
					for(var i = 0, len = thisLine.rulesForLine.length; i < len; i++) {
				 		if(thisLine.rulesForLine[i].defaultValueActions) {
				 			var defaultActions = thisLine.rulesForLine[i].defaultValueActions;
				 			for(var j = 0, defaultRuleLen = defaultActions.length; j < defaultRuleLen; j++) {
				 				var ruleInfo = defaultActions[j];
				 				if(defaultToValues[ruleInfo.Id]) {
				 					ruleInfo.defaultedTo = defaultToValues[ruleInfo.Id];

				 				}
				 			}
						}
				 	}
				 }
				
			}

			return thisLine;
		}

		/**
		 * Function dedicated to merging an array of charge DOs with this line
		 * 	item's charge lines. Handles deleting excess charge lines and calls
		 * 	chargeLine.mergeChargeDO() with the appropriate lines.
		 * 	
		 * @param  {Array} newChargeDOs		Array of charge DOs
		 * @return {LineItemModel}        The current line item
		 */
		LineItemModel.prototype.mergeChargeLines = function(newChargeDOs) {
			var thisLine = this;
			if (!angular.isArray(newChargeDOs)) {
				$log.error('Merge with no source charge lines.');
				return thisLine.clearChargeLines();

			}
			var chargeDOs = thisLine.lineItemDO.chargeLines;
			var chargeLength = newChargeDOs.length;
			//Ensure excess charges are dropped. Setting length works for dropping as well as extending.
			chargeDOs.length = chargeLength;
			thisLine.chargeLines.length = chargeLength;
			//Merge or create charge line models for each DO
			var sourceDO, existingChargeLine, existingDO;
			for (var chargeIndex = 0; chargeIndex < chargeLength; chargeIndex += 1) {
				sourceDO = newChargeDOs[chargeIndex];
				existingChargeLine = thisLine.chargeLines[chargeIndex];
				if (angular.isDefined(existingChargeLine)) {
					existingChargeLine.mergeChargeDO(sourceDO);

				} else {
					chargeDOs[chargeIndex] = sourceDO;
					var isPrimaryLine = (chargeIndex === 0);
					thisLine.chargeLines[chargeIndex] = new ChargeLineModel(sourceDO, thisLine, isPrimaryLine);

				}

			}
			return thisLine;

		};
		
		/**
		 * Function dedicated to merging an array of option lineDOs with this line's
		 * 	option line models. Needs to do some special checks to make sure option
		 * 	lines are matched by component id correctly.
		 * 	
		 * @param  {Array} newOptionDOs		Array of option DOs
		 * @return {LineItemModel}        The current line item
		 */
		LineItemModel.prototype.mergeOptionLines = function(newOptionDOs) {
			var thisLine = this;
			var foundComponentsIds = [];
			_.forEach(newOptionDOs, function (optionDO) {
				var optionSO = LineItemSupport.getLineItemSO(optionDO);
				var componentId = optionSO[nsPrefix + 'ProductOptionId__c'];
				foundComponentsIds.push(componentId);

				var matchingOptionPromise = thisLine.optionPromisesByComponentId[componentId];
				if (angular.isDefined(matchingOptionPromise)) {
					var mergePromise = matchingOptionPromise.then(function (matchingOptionLine) {
						return matchingOptionLine.mergeLineItemDO(optionDO);
						
					}).then(function (mergedOptionLine) {
						thisLine.putOptionLine(mergedOptionLine);
						return mergedOptionLine;

					});
					thisLine.optionPromisesByComponentId[componentId] = mergePromise;
				
				} else {
					$log.error('Merge error: ', this, ' - attempt to merge option line with no matching component:', optionDO);

				}

			});
			//Clear options which weren't included in sever request.
			var unmachedOptions = _.omit(thisLine.optionPromisesByComponentId, foundComponentsIds);
			_.forOwn(unmachedOptions, function (nextOptionPromise, componentId) {
				var clearPromise = nextOptionPromise.then(function (optionLine) {
					optionLine.clearChargeLines();
					thisLine.putOptionLine(optionLine);
					return optionLine;

				});
				thisLine.optionPromisesByComponentId[componentId] = clearPromise;

			});
			return $q.all(thisLine.optionPromisesByComponentId);

		};

		LineItemModel.prototype.clearChargeLines = function() {
			var thisLine = this;
			//Drop charge lines beyond the first
			thisLine.lineItemDO.chargeLines.length = 1;
			thisLine.chargeLines.length = 1;
			//Assume primary line is defined
			thisLine.chargeLines[0].clearChargeDO();
			//Loop over child options so child lines are cleared as well
			_.forEach(thisLine.optionLines, function (nextOptionLine) {
				nextOptionLine.clearChargeLines();

			});
			return thisLine;

		};

		/**
		 * Get the attribute display information. This will include attribute rule
		 * criterion from the last run execution.
		 * @param attributeId the ProductAttribute__c record Id
		 * @return {Object} the display properties object used with dynamic field component
		 */
		LineItemModel.prototype.getAttributeDisplayInfo = function(attributeId) {			
			if(this.attrFields
					&& angular.isUndefined(this.attributeDisplayInfos)) {				
				this.processAttributeRules();
			}

			return this.attributeDisplayInfos ? this.attributeDisplayInfos[attributeId] : undefined;
		};

		/**
		 * Crate a deep clone of line item DO structure with all pending changes
		 *   attached. The goal is to clone the minimum amount of data without
		 *   omitting anything necessary.
		 *   
		 * @return {Object} lineItemDO object structure
		 */
		LineItemModel.prototype.getLineItemDOChanges = function() {
			var thisLine = this;
			var lineAction = LineItemSupport.LINE_ACTION_UPDATE;
			var wasDirty = thisLine.isSelectedDirty;
			thisLine.isSelectedDirty = false;
			if (thisLine.isSelected()) {
				lineAction = thisLine.isPersisted() ? LineItemSupport.LINE_ACTION_UPDATE : LineItemSupport.LINE_ACTION_ADD;

			} else if (thisLine.isPersisted()) {
				lineAction = LineItemSupport.LINE_ACTION_DELETE;

			} else {
				// No changes should be applied, caller should ignore undefined.
				return undefined;

			}
			var lineItemDOClone = {
				"lineAction": lineAction,
				"txnPrimaryLineNumber": thisLine.lineItemDO.txnPrimaryLineNumber
			};
			lineItemDOClone.chargeLines = thisLine.getChargeLineChanges(lineAction);
			lineItemDOClone.optionLines = thisLine.getOptionLineChanges(lineAction);
			return lineItemDOClone;

		};

		/**
		 * Dedicated function for getting the pending changes from charge lines. 
		 * @param  {String} lineAction 		What kind of line action is being done for the clone.
		 * @return {Array}            		The array of DO clones w/ changes
		 */
		LineItemModel.prototype.getChargeLineChanges = function(lineAction) {
			var thisLine = this;
			var newChargeDOs = [];
			_.forEach(thisLine.chargeLines, function (nextChargeLine) {
				var newChargeDO = nextChargeLine.getLineItemDOChanges(lineAction);
				if (newChargeDO) {
					newChargeDOs.push(newChargeDO);
					
				}

			});
			return newChargeDOs;

		};

		/**
		 * Dedicated function for getting the pending changes from option lines. 
		 * @param  {String} lineAction 		What kind of line action is being done for the clone.
		 * @return {Array}            		The array of DO clones w/ changes
		 */
		LineItemModel.prototype.getOptionLineChanges = function(lineAction) {
			var thisLine = this;
			var newOptionLineDOs = [];
			_.forEach(thisLine.optionLines, function (nextOptionLine) {
				var nextOptionDO = nextOptionLine.getLineItemDOChanges();
				if (nextOptionDO) {
					newOptionLineDOs.push(nextOptionDO);
				
				}

			});
			return newOptionLineDOs;

		};

		LineItemModel.prototype.getLineItemDOClone = function() {
			return LineItemSupport.newLineItemsFromClone(this.lineItemDO);
			
		};

		/**
		 * Check whether this line item or its options have unsaved changes.
		 * @return {Boolean}
		 */
		LineItemModel.prototype.checkForPendingChanges = function() {
			var thisLine = this;
			if (!thisLine.isSelected()) {
				return false;

			}
			var isThisPending = _.some(thisLine.chargeLines, function (chargeLine) {
				return angular.isDefined(chargeLine.isDirty) && chargeLine.isDirty;

			});
			if (isThisPending) {
				return true;

			}
			return _.some(thisLine.optionLines, function (optionLine) {
				return optionLine.checkForPendingChanges;
				
			});

		};

		LineItemModel.prototype.checkOptionConfiguration = function() {
			var configMessages = [];
			var setStatus = this.primaryLine().fieldGetterSetter(nsPrefix + 'ConfigStatus__c');
			if (!this.isSelected()) {
				setStatus(LineItemSupport.CONFIG_STATUS_NA);
				return configMessages;

			}
			_.forEach(this.optionGroups, function (nextGroup) {
				var groupMessages = nextGroup.getConfigurationMessages();
				if (groupMessages && groupMessages.length) {
					configMessages = configMessages.concat(groupMessages);
				}
			});
			//TODO: check sub-bundle item configuration
			if (configMessages.length === 0) {
				setStatus(LineItemSupport.CONFIG_STATUS_COMPLETE);

			} else {
				setStatus(LineItemSupport.CONFIG_STATUS_PENDING);

			}
			return configMessages;

		};

		/**
		 * Deselect this line and return whether it was selected. If parameter
		 * 	is true, deselect all option lines.
		 */
		LineItemModel.prototype.deselect = function(cascade) {
			if (this.lineItemDO.isSelected) {
				this.lineItemDO.isSelected = false;
				this.isSelectedDirty = true;
				if (cascade) {
					_.forEach(this.optionGroups, function (nextGroup) {
						nextGroup.selectNone();
					});
					
				}
				return true;
				
			}
			return false;

		};

		/**
		 * Select this option group and initialize the default options.
		 * @return {Boolean} 	whether the line was already selected
		 */
		LineItemModel.prototype.select = function() {
			if (!this.lineItemDO.isSelected) {
				this.lineItemDO.isSelected = true;
				this.isSelectedDirty = true;
				if(this.parentItem !== false) {					
					if(this.parentItem.hasAttrs()) {						
						var thisLineSO = this.lineItemSO();
						var parentLineSO = this.parentItem.lineItemSO();
						var parentAttrSO = this.parentItem.attrSO();
						var configId = thisLineSO[nsPrefix+'ConfigurationId__c'];

						if(this.hasAttrs()) {
							//create new attribute
							var newAttrSO = angular.copy(parentAttrSO);
							newAttrSO.Id = configId;
							thisLineSO[nsPrefix+'AttributeValueId__c'] = configId;
							thisLineSO[nsPrefix+'AttributeValueId__r'] = newAttrSO;
						} else { //match parents
							thisLineSO[nsPrefix+'AttributeValueId__c'] = parentAttrSO.Id;
							thisLineSO[nsPrefix+'AttributeValueId__r'] = {'Id': parentAttrSO.Id}; //minimual fields needed by server
						}
					}
				}

				_.forEach(this.optionGroups, function (nextGroup) {
					nextGroup.selectDefaults();
				});
				return true;

			}
			return false;

		};

		LineItemModel.prototype.processAttributeRules = function(useLastResults) {
	        if(!this.attrFields) { //missing the attribute schema info
	        	return undefined;

	        }

	        //get attribute so
	        var attrSO = this.attrSO();
	        //process the attribute rules	        
	        var ruleResults;
	        if(this.attrRules.length) {
	        	ruleResults = AttributeRules.processAttributeRules(this.lineItemSO(), this.attrRules);	        	
	        }

	        //process the Attribute Matrices
	        var matrixResults = {};
	        if(this.attrMatrices.length) {
	        	matrixResults = AttributeMatrix.processAttributeMatrices(attrSO, this.attrMatrices, this.attrFields);	        	
		    }

		    var allowedAttrValues = {}; //allowable values	        
	        var allDisplayInfos = this.attributeDisplayInfos;
	        var readyForDisplay = true;
	        for(var i = 0, attrGroupLen = this.attrGroups.length; i < attrGroupLen; i++) {
	        	var attributeGroup = this.attrGroups[i];
	        	if(attributeGroup) {
		        	var attributes = attributeGroup[nsPrefix+'Attributes__r'];
		        	if(attributes) {		        		
		        		if (angular.isUndefined(allDisplayInfos)) {
		        			allDisplayInfos = {};
		        		}

			        	for(var j = 0, attrLen = attributes.length; j < attrLen; j++) {
			        		var attribute = attributes[j];
			        		var attributeName = attribute[nsPrefix+'Field__c'];
			        		
			        		var fieldMetadata = this.attrFields[attributeName];
							var attributeDisplayInfo = allDisplayInfos[attribute.Id];
							if(!angular.isDefined(attributeDisplayInfo)) {
								if(!!!fieldMetadata) { //field schema not available yet
									readyForDisplay = false;
									continue;

								}
								attributeDisplayInfo = angular.copy(fieldMetadata);
								allDisplayInfos[attribute.Id] = attributeDisplayInfo;
							}

							//ABC rule can override editable property
							var rulesAllowEdit = angular.isUndefined(ruleResults) || angular.isUndefined(ruleResults.readOnly[attributeName]);
							var rulesAllowVisbility = angular.isUndefined(ruleResults) || angular.isUndefined(ruleResults.hidden[attributeName]);							
							var ruleRequiresValue = angular.isDefined(ruleResults) && angular.isDefined(ruleResults.required[attributeName]);
							var hasRuleConstraint = angular.isDefined(ruleResults) && (angular.isDefined(ruleResults.constraints[attributeName]) || 
																					   attributeDisplayInfo.wasConstrainedByRule === true);
							var hasMatrixConstraint = angular.isDefined(matrixResults) && angular.isDefined(matrixResults[attributeName]);

							attributeDisplayInfo.IsEditable = fieldMetadata.IsEditable &&
															  !attribute[nsPrefix + 'IsReadOnly__c'];
							//Set disabled flag
							attributeDisplayInfo.IsDisabled = !rulesAllowEdit;
							//ABC rule can override visible property
							attributeDisplayInfo.IsVisible = !attribute[nsPrefix + 'IsHidden__c'] &&
															  rulesAllowVisbility;
							//Set required flag
							attributeDisplayInfo.IsRequired = ruleRequiresValue;

							//ABC rule can constrain the picklist values
							var fieldType = fieldMetadata.FieldType.toLowerCase();														
							if(fieldType === 'picklist' || fieldType === 'multipicklist') {
								var allowedValues;
								var ruleAllows = ruleResults ? (ruleResults.constraints[attributeName] || []) : [];
								var matrixAllows = matrixResults ? (matrixResults[attributeName] || []) : [];
								if(hasRuleConstraint && hasMatrixConstraint) {
									//intersection of the two
									allowedValues  = _.intersection(ruleAllows, matrixAllows);
								} else if(hasRuleConstraint) {									
									if(ruleAllows.length === 0) {
										if(attributeDisplayInfo.wasConstrainedByRule !== false) {
											allowedValues = true;											
										} else {
											allowedValues = ruleAllows;											
										}
									} else {
										allowedValues = ruleAllows;
									}

									//mark as constraint by rule
									attributeDisplayInfo.wasConstrainedByRule = allowedValues !== true;									
								} else if(hasMatrixConstraint) {
									allowedValues = matrixAllows;

								} else {
									allowedValues = true; //indicates allow all values

								}

								var currentAttrValue = attrSO[attributeName];
								if(fieldType === 'picklist') {
									if(allowedValues === true && (attributeDisplayInfo.previouslyContrained === true || 
																  angular.isUndefined(attributeDisplayInfo.previouslyContrained))) { //reset list									
										attributeDisplayInfo.pickListEntries = angular.copy(fieldMetadata.pickListEntries);										
									} else {
										var allEntries = fieldMetadata.pickListEntries;									
										attributeDisplayInfo.pickListEntries = [];
										for(var ii = 0, max = allEntries.length; ii < max; ii++) {
											var entry = allEntries[ii];
											if(allowedValues === true || allowedValues.indexOf(entry.value) >= 0) {
												attributeDisplayInfo.pickListEntries.push(entry);
											}
										}

										//update the selection
										if(allowedValues !== true) {
											var attrValue = attrSO[attributeName];
											if(angular.isDefined(attrValue) && attrValue !== null 
													&& String(attrValue) !== '') {
												if(allowedValues.indexOf(attrValue) < 0) {
													attrSO[attributeName] = null;
												}
											}
										}
									}
								} else if(fieldType === 'multipicklist') {
									if(angular.isUndefined(attributeDisplayInfo.pickListEntries)) { //create initial entries
										attributeDisplayInfo.pickListEntries = angular.copy(fieldMetadata.pickListEntries);
									}

									angular.forEach(attributeDisplayInfo.pickListEntries, function(entryProperty, index) {    
									    var entryMetadata = fieldMetadata.pickListEntries[index];								    
									    entryProperty.disable = !entryMetadata.active || 
									    							((allowedValues !== true) &&
									    							!angular.isDefined(allowedValues[entryProperty.value]));
									});

									//update the selection
									if(allowedValues !== true) {
										var attrValue = attrSO[attributeName];
										if(angular.isDefined(attrValue) && attrValue !== null
												&& String(attrValue) !== '') {
											var selectedValues = attrValue.split(';');
											var updatedValues = [];
											for(var idx = 0, max = selectedValues.length; idx < max; idx++) {
												var selectedValue = selectedValues[idx];
												if(allowedValues.indexOf(selectedValue) >= 0) {
													updatedValues.push(selectedValue);													
												}
											}
											attrSO[attributeName] = updatedValues.length 
																  ? updatedValues.join(';')
																  : null;
										}
									}
								}

								//only one value available, choose it								
								if(allowedValues !== true && allowedValues.length === 1) {
									currentAttrValue
									var newAttrValue = attrSO[attributeName];
									var prevChoiceCount = attributeDisplayInfo.prevChoiceCount;
									if(angular.isUndefined(currentAttrValue) || currentAttrValue === null
											&& (angular.isUndefined(newAttrValue) || newAttrValue === null)
											&& prevChoiceCount !== 1) {
										attrSO[attributeName] = allowedValues[0];
									}
								}
								//save the previous choice count
								attributeDisplayInfo.prevChoiceCount = allowedValues == true ? allowedValues : allowedValues.length;
								//set previously constrained flag
								attributeDisplayInfo.previouslyContrained = allowedValues !== true;
								//set previous value
								attributeDisplayInfo.previousValue = attrSO[attributeName];
							}
						}
					}
				}
			}

			if(readyForDisplay) {
				this.attributeDisplayInfos = allDisplayInfos;

			} else {
				this.attributeDisplayInfos = undefined;
			}
		};

	    LineItemModel.prototype.attrGroup = function(groupId) {			
			return AttributesCache.getAttributeGroup(groupId);

		};
	    
	    LineItemModel.prototype.attrSO = function() {
			return this.primaryLine().attrSO();

		};

		LineItemModel.prototype.attrGetterSetter = function(fieldName) {
			return this.primaryLine().attrGetterSetter(fieldName);
			
		};

		/**
		 * Behaves as a getter-setter for any field on any charge line. Can set
		 * 	a null value, but will not set the value to undefined. Marks the field 
		 *  as dirty iff the new value is different from existing value using
		 *  strict !== comparison.
		 * @param  {Integer} chargeIndex
		 * @param  {String} fieldName
		 * @param  {Primitive} newValue   optional
	 * @return {Primitive}            existing value
		 */
		LineItemModel.prototype.chargeField = function(chargeIndex, fieldName, newValue) {
			var chargeLine = this.chargeLines[chargeIndex];
			if (chargeLine) {
				return chargeLine.fieldGetterSetter(fieldName)(newValue);

			}


		};

		//Shorthand for chargeField(0, fieldName, newValue)
		LineItemModel.prototype.field = function(fieldName, newValue) {
			return this.chargeField(0, fieldName, newValue);

		};

		LineItemModel.prototype.quantity = function() {
			return this.primaryLine().quantity();

		};

		//Should just refer to primary charge line instead.
		LineItemModel.prototype.quantityGetterSetter = function() {
			return this.primaryLine().fieldGetterSetter(nsPrefix + 'Quantity__c');

		};

		LineItemModel.prototype.topLineTotal = function() {
			return _.reduce(this.chargeLines, function (total, nextChargeLine) {
				var nextPrice = nextChargeLine.netPrice();
				return total + angular.isNumber(nextPrice) ? nextPrice : 0;
			}, 0);
		};


		LineItemModel.prototype.isTopLevel = function() {
			return this.lineItemDO.chargeLines[0].lineItemSO[nsPrefix + 'LineType__c'] !== 'Option';
		};

		LineItemModel.prototype.isRampEnabled = function() {
			var priceListItem = this.lineItemSO()[nsPrefix+ 'PriceListItemId__r'];
			return angular.isDefined(priceListItem) && priceListItem[nsPrefix + 'EnablePriceRamp__c'];			
		};

		LineItemModel.prototype.hasAttrs = function() {
			return this.lineItemSO()[nsPrefix + 'HasAttributes__c'];
		};

		LineItemModel.prototype.hasOptions = function() {
			return this.lineItemSO()[nsPrefix + 'HasOptions__c'];
		};

		LineItemModel.prototype.lineType = function() {
			return this.lineItemSO()[nsPrefix + 'LineType__c'];
		};

		LineItemModel.prototype.productId = function() {
			var idField = nsPrefix + (this.lineType() === 'Option' ? 'OptionId__c' : 'ProductId__c');
			return this.lineItemSO()[idField];
		};

		LineItemModel.prototype.optionComponentId = function() {
			return this.lineItemSO()[nsPrefix + 'ProductOptionId__c'];
		};

		LineItemModel.prototype.product = function() {
			var productField = nsPrefix + (this.lineType() === 'Option' ? 'OptionId__r' : 'ProductId__r');
			return this.lineItemSO()[productField];
		};

		LineItemModel.prototype.productName = function() {
			return this.product().Name;
		};

		LineItemModel.prototype.primaryLine = function() {
			return this.chargeLines[0];
		};

		LineItemModel.prototype.lineItemSO = function(chargeIndex) {
			chargeIndex = angular.isNumber(chargeIndex) ? chargeIndex : 0;
			var chargeLineDO = this.lineItemDO.chargeLines[chargeIndex];
			var chargeLineSO = chargeLineDO ? chargeLineDO.lineItemSO : undefined;
			return chargeLineSO;
		};

		LineItemModel.prototype.primaryLineNumber = function() {
			var liso = this.lineItemSO();
			return  liso ? liso[nsPrefix + 'PrimaryLineNumber__c'] : undefined; 
		};

		LineItemModel.prototype.isPersisted = function() {
			return !!this.lineItemSO().Id;
		};

		LineItemModel.prototype.isPricePending = function() {
			if (!this.isPersisted()) { //until saved in server pricing is not needed
				return false;
			}
			var isChargePending = _.some(this.chargeLines, function (chargeLine) {
				return chargeLine.isPricePending();
			});
			//Return immediately if line has pending charge
			if (isChargePending) {
				return true;

			}
			//If no pending charge, check option lines
			return _.some(this.optionLines, function (optionLine) {
				return optionLine.isSelected() && optionLine.isPricePending();
			});

		};

		LineItemModel.prototype.isConfigurationPending = function() {
			if (this.chargeLines[0].lineItemDO.lineItemSO[nsPrefix + 'ConfigStatus__c'] === LineItemSupport.CONFIG_STATUS_PENDING) {
 				return true;

			} else {	
				return false;
			
			}
		};

		LineItemModel.prototype.isDeleted = function() {
			return this.lineItemDO ? this.lineItemDO.lineAction === LineItemSupport.LINE_ACTION_DELETE : true;
		};

		LineItemModel.prototype.isSelected = function() {
			return !!this.lineItemDO.isSelected;
		};

		//Return the model class constructor
		return LineItemModel;

	}

}).call(this);
