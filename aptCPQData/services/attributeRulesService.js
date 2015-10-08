/**
 *  Apttus Config & Pricing
 *  AttributeRulesService
 *
 *  @2015-2016 Apttus Inc. All rights reserved.
 *
 * This service, AttributeRulesService, contains a single method
 * for processing ABC (Attribute Based Configuration) rules
 *
 */
;(function() {
	angular.module('aptCPQData')
		.service('AttributeRules', AttributeRules);

	//inject the formulae iterator
	AttributeRules.$inject = [
		'systemConstants',
		'CartFormulaEvaluator',
		'LineItemCache',
		'ConfigurationDataService'
	];

	function AttributeRules(systemConstants, CartEvaluator, LineItemCache, ConfigData) {
		var service = this;
		/** -- Service scope variables -- */
		var nsPrefix = systemConstants.nsPrefix;

		/** -- Attach public methods -- */
		service.processAttributeRules = processAttributeRules;
		
		/** -- Method declarations -- */
		
		//fetch config id
		ConfigData.requestBasePromise.then(function(requestBase) {
				service.productConfiguration = {
					'Id':requestBase.cartId
				};
		});

		/**
		 * Process the ABC rule infos for speficied line
		 * @param contextLine the context line item
		 * @param cartLines all cart line's & configuration sObject ordered by
		 *					their primary line number
		 * @param attributeRules the rules for context line
		 * @return an object containing all rule results
		 */
		function processAttributeRules(contextLine, attributeRules, allLineItems, processDefaultRules) {			
			attributeRules = attributeRules || [];
			var constrainedValues = {};
			var hiddenValues = {};
			var requiredValues = {};
			var readOnlyValues = {};

			//initialize cart lines
			if(!allLineItems) {
		        var allLineItems = LineItemCache.getLineItemSOsByPrimaryLineNumber();
		        allLineItems[0] = service.productConfiguration;
			}
			CartEvaluator.setCartLines(allLineItems);

			//iterate through all rules...
			for(var ruleId in attributeRules) {
				if(attributeRules.hasOwnProperty(ruleId)) {
					var ruleCondition = attributeRules[ruleId];
					var meetsRuleCondition = getMeetsRuleConditions(ruleCondition.conditionExpression, [contextLine]);

					//Constrain the picklist values
					if(meetsRuleCondition) {
						for(var index=0; index < ruleCondition.actions.length; index++) {
							var ruleInfo = ruleCondition.actions[index];
							//Default value by expression
							if(ruleInfo.isDefaultAction) {
							
							//Constrained value by expression
							} else if(ruleInfo.isConstraintAction) {
								var meetsCondition = getMeetsRuleConditions(ruleInfo.conditionExpression, [contextLine]);
								if(meetsCondition) {
									var availableValues = [];
									if(ruleInfo.valueExpression != null) {
										availableValues = CartEvaluator.calculateExpression(ruleInfo.valueExpression, [contextLine]).result.split(';');
									}

									var constraintsForAttribute = constrainedValues[ruleInfo.fieldAPI];
									if(angular.isUndefined(constraintsForAttribute)) {
										constraintsForAttribute = [];
										constrainedValues[ruleInfo.fieldAPI] = constraintsForAttribute;
										for(var i=0; i < availableValues.length; i++) {
											constraintsForAttribute.push(availableValues[i]);
										}
									} else {
										var availableMap = {};
										for(var i=0, max=availableValues.length; i < max; i++) {
											availableMap[availableValues[i]] = true;
										}

										var newConstraints = [];
										for(var i=0, max=constraintsForAttribute.length; i < max; i++) {
											var constraintValue = constraintsForAttribute[i];
											if(angular.isDefined(availableMap[constraintValue])) {
												newConstraints.push(constraintValue);
											}
										}

										constrainedValues[ruleInfo.fieldAPI] = newConstraints;
									}
								}							
							//Make attribute hidden
							} else if(ruleInfo.isHiddenAction) {
								var meetsCondition = getMeetsRuleConditions(ruleInfo.conditionExpression, [contextLine]);
								if(meetsCondition) {
										//check against value expression (may have addition conditions)
										meetsCondition = getMeetsRuleConditions(ruleInfo.valueExpression, [contextLine]);
									if(meetsCondition) {
										hiddenValues[ruleInfo.fieldAPI] = true;
									}
								}
							//Make attribute read only
							} else if(ruleInfo.isReadOnlyAction) {
								var meetsCondition = getMeetsRuleConditions(ruleInfo.conditionExpression, [contextLine]);
								if(meetsCondition) {
										if(meetsCondition) {
												//check against value expression (may have addition conditions)
												meetsCondition = getMeetsRuleConditions(ruleInfo.valueExpression, [contextLine]);
												if(meetsCondition) {
												readOnlyValues[ruleInfo.fieldAPI] = true;
											}
										}
								}
							//Make attribute required
							} else if(ruleInfo.isRequiredAction) {
								var meetsCondition = getMeetsRuleConditions(ruleInfo.conditionExpression, [contextLine]);
								if(meetsCondition) {
									requiredValues[ruleInfo.fieldAPI] = true;

								}
							}
						}
					}
				}
			}

			return {
				constraints:constrainedValues,
				required:requiredValues,
				hidden:hiddenValues,
				readOnly:readOnlyValues
			};

		}

		/**
		 * Check if the ABC info meets the rule conditions
		 * Note: missing/not specified match condition is treated as "true"
		 * @param expressionInfo the ABC rule info
		 * @param contextSObjects array of objects for evaluation
		 * @return true if info meets match conditions, false otherwise
		 */
		function getMeetsRuleConditions(expressionInfo, contextSObjects) {
			var meetsCondition = true;
			if(expressionInfo != null) {
				meetsCondition = CartEvaluator.calculateExpression(expressionInfo, contextSObjects).result;

			}

			return meetsCondition;

		}

	}

})();