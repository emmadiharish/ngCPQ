;(function() {
	angular.module('aptCPQData')
		.service('AppliedExpressionService', AppliedExpressionService); 
					
	AppliedExpressionService.$inject = [		
		'$log',
		'systemConstants',
		'FieldExpressionDataService',
		'LineItemCache',
		'CartFormulaEvaluator',
		'ConfigurationDataService'
	];

	function AppliedExpressionService($log, 
									  systemConstants,
									  ExpressionDataService,
									  LineItemCache,
									  FormulaEvaluator,
									  ConfigurationDataService) {
		var service = this;
		//namespace prefix
		var nsPrefix = systemConstants.nsPrefix;
		//attribute reference field
		var attrReferenceField = nsPrefix+'AttributeValueId__r';
		//store configuration info		
		ConfigurationDataService.requestBasePromise.then(function(requestBase) {
				service.productConfiguration = {
					'Id':requestBase.cartId
				};
		});

		/**
		 * Apply the numeric expressions and necessary defaulting 
		 * actions on change of field value.		  
		 * @param sourceId id of the source sobject which is changed
		 * @oaram fieldName name of the field which is changed
		 */
		service.applyRulesOnChange = function(sourceId, fieldName) {
			if(!systemConstants.customSettings.systemProperties.IsEnableFieldExpressions) {
				return;

			}

			var totalStartTime = new Date().getTime();			
			//ok to evaluate flag
			var needsCalculation = false;
			//expressions to evaluate
			var expressionsToEvaluate = {};
			//all charge lines
			var allChargeLines = LineItemCache.getLineItemsByPrimaryLineNumber();

			//STEP I - get numeric expressions which need recalculation
			var expressionsForRecalculation = {};
			if(angular.isDefined(sourceId) && sourceId !== true && sourceId !== null
					&& angular.isDefined(fieldName) && fieldName !== null) {
				expressionsForRecalculation = ExpressionDataService.getExpressionsForRecalculation(sourceId, fieldName);
			}
			//STEP II - evaluate all the expressions for target lines also
			var expressionsForLine = {};
			if(sourceId === true) {
				for(primaryLineNumber in allChargeLines) {
					if(allChargeLines.hasOwnProperty(primaryLineNumber)) {
						angular.extend(expressionsForLine, ExpressionDataService.getExpressionsForTarget(primaryLineNumber)); 
					}
				}				
			}

			//STEP III - if there are default value rules, we create the applied info representation
			var defaultValuesToEvaluate = generateAttrDefaultValueExpressionInfos();
			//STEP - IV - including defaults may cause other expressions to need calculations
			var modifiedByDefaultExpressions = ExpressionDataService.getModifiedByExpression(defaultValuesToEvaluate, allChargeLines);
		  	//merge collections
		  	angular.extend(expressionsForRecalculation, expressionsForLine, defaultValuesToEvaluate, modifiedByDefaultExpressions);

		  	//STEP V - map out expressions by primary line # and validate
		  	//that there are no duplicate field updates			
			var lineItemSObyPriLine = {};
			var lineItemSOList = [];
			var fieldUpdates = {};			
		  	for(expressionId in expressionsForRecalculation) {
				if(expressionsForRecalculation.hasOwnProperty(expressionId)) {
					var appliedExpressionSO = expressionsForRecalculation[expressionId];					
			      	var primaryLineNumber = appliedExpressionSO.targetPrimaryLineNumber;
			      	if(primaryLineNumber <= 0) {
			      		continue;
			      	}

			      	//validate that there are no two identical updates
			      	if(appliedExpressionSO.isFieldUpdate) {
			      		var fieldUpdatesForTarget = fieldUpdates[primaryLineNumber];
			      		if(angular.isUndefined(fieldUpdatesForTarget)) {
			      			fieldUpdatesForTarget = {};
			      			fieldUpdates[primaryLineNumber] = fieldUpdatesForTarget;

			      		} else {
			      			var existingInfoId = fieldUpdatesForTarget[appliedExpressionSO.updateField];
			      			if(angular.isDefined(existingInfoId)) {
			      				$log.error('Found field update rule and attribute default for the same field.\n' +  
								 		   'Line Number: ' + primaryLineNumber + '\n' +
								 		   'Numeric Expression Id: ' + appliedExpressionSO.expressionSOId + '\n' +
								 		   'Target Field: ' + appliedExpressionSO.updateField);
			      			}
			      		}

			      		fieldUpdatesForTarget[appliedExpressionSO.updateField] = appliedExpressionSO.Id;
			      	}

			      	//store in map for evaluation
			      	var expressionsForTarget = expressionsToEvaluate[primaryLineNumber];					
					if(angular.isUndefined(expressionsForTarget) || expressionsForTarget === null) {
						expressionsForTarget = {};
						expressionsToEvaluate[primaryLineNumber] = expressionsForTarget;
						
						// store charge SO in a map												
						var lineItem = allChargeLines[primaryLineNumber];
						var lineItemSO = lineItem.lineItemSO();				
						lineItemSObyPriLine[primaryLineNumber] = lineItemSO;
						lineItemSOList.push(lineItemSO);						
			      	}

			      	expressionsForTarget[appliedExpressionSO.Id] = appliedExpressionSO;
			      	needsCalculation = true;
			    }
			}

			//STEP VI - perform the calculations
			if(needsCalculation) {
				//config is line "0"
				lineItemSObyPriLine[0] = service.productConfiguration;				
				//and execute the expressions				
				FormulaEvaluator.calculate(expressionsToEvaluate,
										   lineItemSObyPriLine,
										   lineItemSOList);				
				//mark expression infos which were defaulted by expression
				var processedLines = [];
				for(expressionId in defaultValuesToEvaluate) {
					if(defaultValuesToEvaluate.hasOwnProperty(expressionId)) {
						var defaultExpressionInfo = defaultValuesToEvaluate[expressionId];
						var primaryLineNumber = defaultExpressionInfo.targetPrimaryLineNumber;
						if(processedLines.indexOf(defaultExpressionInfo.updateField) >= 0) {
							continue;

						}

						var chargeLine = allChargeLines[primaryLineNumber];
						var lineItemSO = lineItemSObyPriLine[primaryLineNumber];
						var attrSO = lineItemSO[attrReferenceField];
						if(attrSO) {
							for(var i = 0, len = chargeLine.attrRules.length; i < len; i++) {
								if(chargeLine.attrRules[i].defaultValueActions) {
									for(var j = 0, defaultRuleLen = chargeLine.attrRules[i].defaultValueActions.length; j < defaultRuleLen; j++) {
										var ruleInfo = chargeLine.attrRules[i].defaultValueActions[j];										
										var attributeValue = attrSO[ruleInfo.fieldAPI];
										//mark as defaulted by expression
										if(angular.isUndefined(ruleInfo.defaultedTo)
												&& angular.isDefined(attributeValue)
												&& attributeValue !== null
												&& attributeValue !== '') {
											ruleInfo.defaultedTo = attributeValue;
										}
									}
								}
							}
						}
					}
				}
			}

			var totalStopTime = new Date().getTime();
			if((totalStopTime - totalStartTime) >=20) {
				$log.log('Apply Rules on Change execution time: ' + (totalStopTime - totalStartTime) + ' ms');
			}			
		};

		/**
		 * Get the default value expressions for all charge lines
		 * which need recalculation.
		 * @param chargeLine the context charge line. null/undefined will 
		 *					 return the defaults for all lines.
		 * @return the default value expressions for calculation
		 */
		function generateAttrDefaultValueExpressionInfos() {			
			var allChargeLines = LineItemCache.getChargePrimaryLines();
			var expressionsToEvaluate = {};
			for(var i = 0, len = allChargeLines.length; i < len; i++) { //check defaults for every line
				var lineItem = allChargeLines[i];
				var primaryLineNumber = lineItem.primaryLineNumber();				
				//applicable defaults for line item
				var defaultExpressions = generateDefaultExpressions(lineItem);
				for(fieldAPI in defaultExpressions) { //for each available default for this line item...					
					var UUID = 'DEFAULT_' + fieldAPI + '_' + primaryLineNumber;
					//create the new info record
					var fieldUpdateInfo = {
						Id:UUID,
						valueExpression:defaultExpressions[fieldAPI],								
						expressionSOId:UUID,
						locked:false,
						isFieldUpdate:true,
						targetPrimaryLineNumber:primaryLineNumber,
						updateField:attrReferenceField+'.'+fieldAPI
					};

					//update the evaluation map
					expressionsToEvaluate[fieldUpdateInfo.Id] = fieldUpdateInfo;					
			    }
			}

			return expressionsToEvaluate;
		}

		/**
		 * Determine if the rule info is valid for the charge line
		 * @param chargeLine the context charge line for default
		 * @param ruleInfo the context rule info
		 * @return true if valid, false otherwise
		 */
		function isValidForDefaultRule(chargeLine, ruleInfo) {
			var isValidForDefault = false;
			var hasValue = ruleInfo.autoUpdateDefault === false &&  		//not an auto-update
						   angular.isDefined(ruleInfo.defaultedTo) && 		//has not been default yet
						   ruleInfo.defaultedTo !== null && 				//has not been default to a null value
						   String(ruleInfo.defaultedTo) !== '';				//has not been default to an empty string
			if(!hasValue) {
				var attrSO = chargeLine.attrSO(); //check attribute sObject for a value
				if(angular.isDefined(attrSO)
							&& attrSO !== null) {
					var attributeValue = attrSO[ruleInfo.fieldAPI];
					hasValue = angular.isDefined(attributeValue) && attributeValue !== null && String(attributeValue) !== '';
				}

				isValidForDefault = !hasValue; //no value then create default
			}

			return isValidForDefault;
		}

		/**
		 * Generate the default value expression for the given charge
		 * line and defaults. This function will concat the various
		 * conditions to arrive at a single answer for the default value.		 
		 * @param chargeLine the context charge line for default
		 * @return a map of default expressions by field API name
		 */
		function generateDefaultExpressions(chargeLine) {			
			var defaultExpressionsForField = {};
			if(chargeLine.attrRules) {
				for(var i = 0, len = chargeLine.attrRules.length; i < len; i++) {
					if(chargeLine.attrRules[i].defaultValueActions) {
						for(var j = 0, defaultRuleLen = chargeLine.attrRules[i].defaultValueActions.length; j < defaultRuleLen; j++) {
							var ruleInfo = chargeLine.attrRules[i].defaultValueActions[j];
							var fieldAPI = ruleInfo.fieldAPI;
							if(isValidForDefaultRule(chargeLine, ruleInfo)) {
				                //build condition expression
				                var defaultConditions = ruleInfo.ruleConditionExpression;							
								if(ruleInfo.conditionExpression) {
									defaultConditions += (defaultConditions ? '&&' : '') + ruleInfo.conditionExpression;
								}

								//defaults are honered in the order in which they appear
								//ideally there should not be two default conditions which are valid
								//at the same time
								var defaultExprForField = defaultExpressionsForField[fieldAPI];                   
				                if(!angular.isDefined(defaultExprForField)) {                    
				                  defaultExprForField = '';
				                  defaultExpressionsForField[fieldAPI] = defaultExprForField;
				                }

				                var failedValue = '{$.'+attrReferenceField+'.'+fieldAPI+'}';
				                var valueExpression = ruleInfo.valueExpression ? ruleInfo.valueExpression : failedValue;				                
				                if(defaultExprForField) {
				                	var additionalCondition = ',IF(' + (defaultConditions ? defaultConditions : 'TRUE()') + ',' + 
				                								   valueExpression + ',@#!#'+ failedValue + ')';																	
									defaultExprForField = defaultExprForField.replace(',@#!#' + failedValue, additionalCondition);
								} else {
									defaultExprForField = 'IF(' + (defaultConditions ? defaultConditions : 'TRUE()') + ',' + valueExpression + ',@#!#' + failedValue +')';
								}

								if(defaultExprForField) {
									defaultExpressionsForField[fieldAPI] = defaultExprForField;
								}																
							}
						}
					}
				}
			}

			//remove internal markers in expression
			for(fieldAPI in defaultExpressionsForField) {
				if(defaultExpressionsForField.hasOwnProperty(fieldAPI)) {
					var formattedExpr = defaultExpressionsForField[fieldAPI].replace('@#!#', '');
					defaultExpressionsForField[fieldAPI] = formattedExpr;
				}				
			}

			return defaultExpressionsForField;
		}
	}
})();
