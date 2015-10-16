(function() {
	angular.module('aptCPQUI')
		.service('ChargeLineModelService', ChargeLineModelService);

	ChargeLineModelService.$inject = [
		'$q',
		'$log',
		'lodash',
		'LineItemSupport',
		'AppliedExpressionService'
	];

	function ChargeLineModelService($q, $log, _, LineItemSupport, RuleService) {

		function ChargeLineModel(sourceDO, parentItem, isPrimaryLine) {
			this.lineItemDO = sourceDO;
			this.txnPrimaryLineNumber = sourceDO.txnPrimaryLineNumber || LineItemSupport.getNextTxnPrimaryLineNumber();			
			this.parentItem = parentItem;
			this.isPrimaryLine = isPrimaryLine;
			// Change tracking info
			this.getterSetters = {};
			this.isDirty = false; //whether any field has been modified
			this.dirtyFields = {};
			// Attr value change tracking
			this.attrGetterSetters = {};
			this.isAttrDirty = false; //whether any attr field has been modified
			this.attrDirtyFields = {};

		}

		ChargeLineModel.prototype.mergeChargeDO = function(sourceDO) {
			var thisLine = this;
			//Merge properties attached to DO structure
			_.merge(thisLine.lineItemDO, sourceDO, function (destDOVal, sourceDOVal, property) {
				//Special checks for line item SO.
				if (property === 'lineItemSO') {
					return _.merge(destDOVal, sourceDOVal, function (destSOVal, sourceSOVal, fieldName) {
						//Detect and preserve local changes.
						//TODO: detect only editable fields
						if (!(_.endsWith(fieldName, 'PricingStatus__c') || _.endsWith(fieldName, 'Id') || _.endsWith(fieldName, 'Id__c'))  && thisLine.dirtyFields[fieldName]) {
							$log.debug('Dirty merge (client, server):', destSOVal, sourceSOVal);
							return destSOVal;

						} else if (fieldName === LineItemSupport.getFullyQualifiedName('AttributeValueId__r')) {
							//TODO Consider breaking this into separate function
							return _.merge(destSOVal, sourceSOVal, function (destAttrVal, sourceAttrVal, attrName) {
								if (thisLine.attrDirtyFields[attrName]) {
									$log.debug('Dirty Attribute Merge (client, server):', destAttrVal, sourceAttrVal);
									return destAttrVal;

								}
								return sourceAttrVal;

							});

						}
						return sourceSOVal;
						
					});

				}
				//Merge logic for other structures goes here
				return undefined;

			});

		};	

		ChargeLineModel.prototype.getLineItemDOChanges = function(lineAction) {
			var thisLine = this;
			var chargeSO = thisLine.lineItemDO.lineItemSO;
			var newChargeSO = {};
			//Copy over fields that are always needed for identifying charge line.
			_.forEach(LineItemSupport.lineItemSOFields, function (fieldName) {
				if (angular.isDefined(chargeSO[fieldName])) {
					newChargeSO[fieldName] = chargeSO[fieldName];
			
				}
			
			});
			//Decide whether to copy all fields for add or just dirty fields for udpate.
			if (lineAction === LineItemSupport.LINE_ACTION_ADD) {
				_.forOwn(chargeSO, function (feildVal, fieldName) {
					if (!LineItemSupport.getIsFieldExcluded(fieldName)) {
						newChargeSO[fieldName] = feildVal;

					}
				
				});

			} else if (lineAction === LineItemSupport.LINE_ACTION_UPDATE) {
				_.forOwn(thisLine.dirtyFields, function (isDirty, fieldName) {
					if (isDirty) {
						newChargeSO[fieldName] = chargeSO[fieldName];

					}

				});

			}
			//Attach attributes object
			if (thisLine.isAttrDirty && lineAction !== LineItemSupport.LINE_ACTION_DELETE) {
				var attrField = LineItemSupport.getFullyQualifiedName('AttributeValueId__r');
				//TODO: selectively pull dirty fields from attr so to make txn smaller
				newChargeSO[attrField] = _.clone(thisLine.attrSO());

			}
			//Reset all dirty fields
			thisLine.resetDirtyFields();
			thisLine.resetAttrDirtyFields();
			//Constructe DO wrapper for SO.
			var newChargeDO = {
				"lineItemSO": newChargeSO
			};
			return newChargeDO;

		};

		ChargeLineModel.prototype.isPricePending = function() {
			var priceField = LineItemSupport.getFullyQualifiedName('PricingStatus__c');
			var pricingStatus = this.lineItemDO.lineItemSO[priceField];
			return !pricingStatus || pricingStatus == LineItemSupport.PRICING_STATUS_PENDING;
			// return this.isDirty || this.isAttrDirty;

		};

		ChargeLineModel.prototype.markPricePending = function() {
			// var priceField = LineItemSupport.getFullyQualifiedName('PricingStatus__c');
			// this.lineItemDO.lineItemSO[priceField] = LineItemSupport.PRICING_STATUS_PENDING;
			// this.dirtyFields[priceField] = true;
			this.isDirty = true;

		};

		ChargeLineModel.prototype.clearChargeDO = function() {
			LineItemSupport.clearLineItemSO(this.lineItemDO.lineItemSO);
			return this.resetDirtyFields;

		};

		ChargeLineModel.prototype.resetDirtyFields = function() {
			this.dirtyFields = {};
			this.isDirty = false;
			return this;

		};

		ChargeLineModel.prototype.resetAttrDirtyFields = function() {
			this.attrDirtyFields = {};
			this.isAttrDirty = false;
			return this;

		};


		/**  -- Getting and setting fields --  */

		/**
		 * Dynamic constructor of a Getter-Setter function for any Line Item SO field.
		 * 	Returns a function that can be called with no arguments to retrieve the current
		 * 	value of that field on the Line Item SO, or can be called with an parameter
		 * 	which will set the value on the Line Item SO mark the field as dirty.
		 * 	The function is constructed once on first call for the field, and is 
		 * 	saved for future use.
		 * 	
		 * @param  {String} fieldName  which LineItemSO field, namespace optional.
		 * @return {Function}          getter-setter for the specified field.
		 */
		ChargeLineModel.prototype.fieldGetterSetter = function(fieldName) {
			var thisLine = this;
			if (!angular.isString(fieldName)) {
				$log.error("Invalid field name '" + fieldName + "' for charge line: ", this);
				return;
				
			}
			// Should not qualify name -- this would break user custom fields
			// fieldName = LineItemSupport.getFullyQualifiedName(fieldName);
			if (!angular.isFunction(thisLine.getterSetters[fieldName])) {
				//Construct a new function for modifying this object.
				thisLine.getterSetters[fieldName] = function (newValue) {
					var lineItemSO = thisLine.lineItemDO.lineItemSO;
					var refObj = lineItemSO,
					 	refField = fieldName;
					if (_.endsWith(fieldName, '__r')) {
						refObj = lineItemSO[fieldName];
						refField = 'Name';

					}

					if (angular.isDefined(newValue)) {						
						var modelVal = refObj[refField];
						refObj[refField] = newValue;
						thisLine.dirtyFields[fieldName] = true;
						this.isDirty = true;

						if(newValue !== modelVal) {
							if(newValue !== null || 
							   (angular.isDefined(modelVal) && modelVal !== null)) {							
								try {														
									// run the Numeric Expressions and defaults						
									RuleService.applyRulesOnChange(lineItemSO.Id, fieldName);								
								} catch(e) {
									$log.error('Field Expressions and ABC defaults failed to execute. ' + e);

								}

								//process attribute rules for context line						
								var hasAttrRules = angular.isDefined(thisLine.parentItem.attrRules) && thisLine.parentItem.attrRules.length > 0;
								var hasAttrMatrices = angular.isDefined(thisLine.parentItem.attrMatrices) && thisLine.parentItem.attrMatrices.length > 0;
								var hasAttributes = angular.isDefined(thisLine.parentItem.attrGroups) && thisLine.parentItem.attrGroups.length > 0;
								if((hasAttrRules || hasAttrMatrices) && hasAttributes) {
									try {
										thisLine.parentItem.processAttributeRules();
									} catch(e) {
										$log.error('ABC rules failed to execute. ' + e);
									}
								}
							}
						}

						// thisLine.markPricePending();
						//TODO: put a function in LineItemSupport for determining which fields should cause PricePending
						// if (refField.indexOf('LineSequence__c') < 0) {
						// 	thisLine.markPricePending();
							
						// }

					}

					if(angular.isDefined(refObj)) {
						return refObj[refField];	
					} 
										
				};
				
			}

			return thisLine.getterSetters[fieldName];
			
		};
		
		/**
		 * Get any line item SO field by name.
		 */
		ChargeLineModel.prototype.field = function(fieldName) {
			return this.lineItemDO.lineItemSO[fieldName];

		};

		ChargeLineModel.prototype.isFieldEditable = function(fieldName) {
			var qtyField = LineItemSupport.getFullyQualifiedName('Quantity__c');
			if (fieldName === qtyField) {
				var isQtyModField = LineItemSupport.getFullyQualifiedName('IsQuantityModifiable__c');
				var isQtyModifiable = this.field(isQtyModField);
				if (angular.isDefined(isQtyModifiable)) {
					return isQtyModifiable;
					
				}

			}
			var readOnlyFields = this.lineItemDO.readOnlyFields;
			if (angular.isArray(readOnlyFields)) {
				return readOnlyFields.indexOf(fieldName) < 0;
			
			}
			return true;
		
		};

		ChargeLineModel.prototype.isFieldHidden = function(fieldName) {
			var hiddenFields = this.lineItemDO.hiddenFields;
			if (angular.isArray(hiddenFields)) {
				return hiddenFields.indexOf(fieldName) >= 0;
			
			}
			return false;

		};

		ChargeLineModel.prototype.isRampEnabled = function() {
			var priceGroupField = LineItemSupport.getFullyQualifiedName('PriceGroup__c');
			var isPrimaryRampLine = LineItemSupport.getFullyQualifiedName('IsPrimaryRampLine__c');
			return this.lineItemDO.lineItemSO[priceGroupField] === 'Price Ramp' || this.lineItemDO.lineItemSO[isPrimaryRampLine];

		};
		
		/** Often-used getters */

		ChargeLineModel.prototype.primaryLineNumber = function() {
			var primaryLineNumberField = LineItemSupport.getFullyQualifiedName('PrimaryLineNumber__c');
			return this.lineItemDO.lineItemSO[primaryLineNumberField];
		};

		ChargeLineModel.prototype.quantity = function() {
			var qtyField = LineItemSupport.getFullyQualifiedName('Quantity__c');
			return this.lineItemDO.lineItemSO[qtyField];

		};

		ChargeLineModel.prototype.chargeType = function() {
			var chargeField = LineItemSupport.getFullyQualifiedName('ChargeType__c');
			return this.lineItemDO.lineItemSO[chargeField];

		};

		ChargeLineModel.prototype.netPrice = function() {
			var priceField = LineItemSupport.getFullyQualifiedName('NetPrice__c');
			return this.lineItemDO.lineItemSO[priceField];

		};

		ChargeLineModel.prototype.sequence = function() {
			var sequenceField = LineItemSupport.getFullyQualifiedName('LineSequence__c');
			return this.lineItemDO.lineItemSO[sequenceField];

		};

		/**  -- Getting and setting attributes --  */

		ChargeLineModel.prototype.attrSO = function() {
			var lineItemSO = this.lineItemDO.lineItemSO;
			var attrField = LineItemSupport.getFullyQualifiedName('AttributeValueId__r');
			var attrSO = lineItemSO[attrField];
			if (angular.isDefined(attrSO)) {
				return attrSO;
			
			}
			//Define a temporary object, should be done thru service
			var configId = lineItemSO[LineItemSupport.getFullyQualifiedName('ConfigurationId__c')];
			attrSO = {
				"Id": configId
			};
			lineItemSO[attrField] = attrSO;
			return attrSO;

		};

		ChargeLineModel.prototype.attrGetterSetter = function(attrName) {
			var thisLine = this;
			if (!angular.isString(attrName)) {
				$log.error("Invalid field name '" + attrName + "' for attribute value: ", this);
				return;
				
			}
			if (!angular.isFunction(thisLine.attrGetterSetters[attrName])) {				
				var attrSO = thisLine.attrSO();				
				//Construct a new function for modifying attr object.
				thisLine.attrGetterSetters[attrName] = function (newValue) {
					if (angular.isDefined(newValue)) {	
						var attrValue = attrSO[attrName];					
						
						attrSO[attrName] = newValue;
						thisLine.attrDirtyFields[attrName] = true;
						thisLine.isAttrDirty = true;						
						if(attrValue !== newValue) {
							if(newValue !== null ||
							   (angular.isDefined(attrValue) && attrValue !== null)) {
								try {
									// run the Numeric Expressions and defaults
									RuleService.applyRulesOnChange(attrSO.Id, attrName);
								} catch(e) {
									$log.error('Field Expressions and ABC defaults failed to execute. ' + e);

								}

								//process attribute rules for context line
								var hasAttrRules = angular.isDefined(thisLine.parentItem.attrRules) && thisLine.parentItem.attrRules.length > 0;
								var hasAttrMatrices = angular.isDefined(thisLine.parentItem.attrMatrices) && thisLine.parentItem.attrMatrices.length > 0;
								var hasAttributes = angular.isDefined(thisLine.parentItem.attrGroups) && thisLine.parentItem.attrGroups.length > 0;
								if((hasAttrRules || hasAttrMatrices) && hasAttributes) {
									try {
										thisLine.parentItem.processAttributeRules();
									} catch(e) {
										$log.error('ABC rules failed to execute. ' + e);
									}
								}
							}
						}
						
						// thisLine.markPricePending();

					}
					return attrSO[attrName];
					
				};
				
			}
			return thisLine.attrGetterSetters[attrName];
			
		};


		return ChargeLineModel;

	}

})();