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
		'CartFormulaEvaluator',
		'systemConstants'
	];

	var CartEvaluator;
	var nsPrefix;
	function AttributeRules(_CartEvaluator, systemConstants) {
		var service = this;
		service.processAttributeRules = processAttributeRules;
		
		CartEvaluator = _CartEvaluator;
		nsPrefix = systemConstants.nsPrefix;
	}

	/**
	 * Process the ABC rule infos for speficied line
	 * @param contextLine the context line item
	 * @param cartLines all cart line's & configuration sObject ordered by
	 *					their primary line number
	 * @param attributeRules the rules for context line
	 * @return an object containing all rule results
	 */
	var processAttributeRules = function(contextLine, cartLines, attributeRules) {
		attributeRules = attributeRules || [];
		var constrainedValues = {};
		var hiddenValues = {};
		var requiredValues = {};
		var readOnlyValues = {};

      	//initialize cart lines
      	CartEvaluator.setCartLines(cartLines);

		//iterate through all rules...		
		for(var ruleId in attributeRules) {
			if(attributeRules.hasOwnProperty(ruleId)) {
			  var ruleInfo = attributeRules[ruleId];

			  //Constrain the picklist values
			  if(ruleInfo.isConstraintAction) {
			    var meetsCondition = getMeetsRuleConditions(ruleInfo.conditionExpression, [contextLine]);
			    if(meetsCondition) {
			      var availableValues = [];
			      if(ruleInfo.valueExpression != null) {              
			        availableValues = CartEvaluator.calculateExpression(ruleInfo.valueExpression, [contextLine]).result.split(';');
			      }

			      var constraintsForAttribute = constrainedValues[ruleInfo.fieldAPI];
			      if(typeof(constraintsForAttribute) === 'undefined') {
			        constraintsForAttribute = {};
			        constrainedValues[ruleInfo.fieldAPI] = constraintsForAttribute;
			        for(var i=0; i < availableValues.length; i++) {
			        	constraintsForAttribute[availableValues[i]] = availableValues[i];
			        }
			      } else {
			        var availableMap = {};
			        for(var i=0, max=availableValues.length; i < max; i++) {
			          availableMap[availableValues[i]] = true;                  
			        }

			        var newConstraints = {};
			        for(var i=0, max=constraintsForAttribute.length; i < max; i++) {
			          var constraintValue = constraintsForAttribute[i];
			          if(typeof(availableMap[constraintValue]) !== 'undefined') {
			            newConstraints[constraintValue] = constraintValue;
			          }
			        }

			        constrainedValues[ruleInfo.fieldAPI] = newConstraints;
			      }
			    }
			  	//Default value by expression
			  	} else if(ruleInfo.isDefaultAction) {				    
				    var hasValue = ruleInfo.defaultedByExpression == true && ruleInfo.autoUpdateDefault == false;
				    if(!hasValue) {
				      var attributeValue = contextLine[nsPrefix+'AttributeValueId__r'];
				      if(typeof(attributeValue) !== 'undefined'
				      			&& attributeValue != null) {
				      	var elementValue = attributeValue[ruleInfo.fieldAPI];
				      	hasValue = typeof(elementValue) !== 'undefined' && elementValue != null && elementValue != '';
				      }				      
				    }

				      if(!hasValue) { //if no value, test condition and set new value
				        var meetsCondition = getMeetsRuleConditions(ruleInfo.conditionExpression, [contextLine]);                
				        if(meetsCondition && 
				            ruleInfo.valueExpression != null) {//set default value
				        	attributeValue[ruleInfo.fieldAPI] = 
				        		CartEvaluator.calculateExpression(ruleInfo.valueExpression, [contextLine]).result;
				          	//bypass future updates
				          	ruleInfo.defaultedByExpression = true;
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

		return {
			constraints:constrainedValues,
			required:requiredValues,
			hidden:hiddenValues,
			readOnly:readOnlyValues
		};
	},

	/**
	 * Check if the ABC info meets the rule conditions
	 * Note: missing/not specified match condition is treated as "true"
	 * @param expressionInfo the ABC rule info
	 * @param contextSObjects array of objects for evaluation
	 * @return true if info meets match conditions, false otherwise
	 */
	getMeetsRuleConditions = function(expressionInfo, contextSObjects) {
	    var meetsCondition = true;
	    if(expressionInfo != null) {
	      meetsCondition = CartEvaluator.calculateExpression(expressionInfo, contextSObjects).result;

	    }

	    return meetsCondition;
	};
})();