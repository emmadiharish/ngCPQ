/**
 * ConstraintRuleDataService
 * 	prepares data for constraint rule messages and prompts 
 *  defines ignoreRuleAction function 
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQData')
		.service('ConstraintRuleDataService', ConstraintRuleDataService); 

	ConstraintRuleDataService.$inject = [
	                                     '$log',
	                                     '$stateParams',
	                                     'lodash',
	                                     'systemConstants',
	                                     'ConfigurationDataService',
	                                     'aptBase.RemoteService'
	                                     ];
	//ConstraintRuleDataService definition
	function ConstraintRuleDataService($log, $stateParams, _, systemConstants, ConfigurationDataService, RemoteService) {
		var service = this;
		var nsPrefix = systemConstants.nsPrefix;
		var ruleTypes = ['error', 'warning', 'info'];
		var processedIds = {};
		
		service.contextLineItem;
		
		var linesWithMessage = {};
		
		//targetBundleNumder to message map
		var messages = {
			 	
		};
		
		var messageTemplate = {
				page: {
					error: [],
					warning: [],
					info: []
				},
				prompt: []
		};
		
		/**
		 * @return 0 or context bundles primary line number
		 */	
		service.getContextBundleNumber = function() {
 			var contextBundleNumber = 0;
 			if (angular.isDefined($stateParams.txnPrimaryLineNumber)) {
				if (angular.isDefined(service.contextLineItem)) {
					var lineItemSO = service.contextLineItem.lineItemSO();
					contextBundleNumber =  lineItemSO[nsPrefix + 'PrimaryLineNumber__c'];
					
				} else {
					contextBundleNumber = -1;//should never happen
					
 				}
 			}
 			return contextBundleNumber;
 		}

		/**
		 * @return {Object} message structure
		 */
		service.getMessages = function() {
			var contextBundleNumber = service.getContextBundleNumber();
			if (angular.isUndefined(messages[contextBundleNumber])) {
				messages[contextBundleNumber] = angular.copy(messageTemplate);
			}
			return messages[contextBundleNumber];

		}
		/**
		 * returns all prompts with target bundle number as zero. 
		 * used in options page to display primary prompt in addition to its own prompts
		 */
		var getPrimaryPrompts = function() {
			var contextBundleNumber = 0;
			if (angular.isUndefined(messages[contextBundleNumber])) {
				messages[contextBundleNumber] = angular.copy(messageTemplate);
			}
			return messages[contextBundleNumber].prompt;

		}
		
		/**
		 * returns next active prompt
		 */
		service.getNextPrompt = function(){
			//display all primary prompts in all pages
			var primaryPrompts = getPrimaryPrompts();
			var activePrompt;
			for (var i = 0; i < primaryPrompts.length; i++) {
				var prompt = primaryPrompts[i];
				if (processedIds[prompt.Id] !== true && prompt[nsPrefix + 'Ignored__c'] !== true) {
					activePrompt = primaryPrompts[i];
					break;
				}
			}
			if (angular.isUndefined(activePrompt)) {
				var optionPrompts = service.getMessages().prompt;
				for (var i = 0; i < optionPrompts.length; i++) {
					var prompt = optionPrompts[i];
					if (processedIds[prompt.Id] !== true && prompt[nsPrefix + 'Ignored__c'] !== true) {
						activePrompt = optionPrompts[i];
						break;
					}
				}
				
			}
			return activePrompt;
			
		}
		
		/**
		 * @return [Object] list of warnings 
		 */
		service.getCommonErrorLines = function() {
			var contextBundleNumber = service.getContextBundleNumber();
			var errorLines = [];
			angular.forEach(linesWithMessage, function(value, key){
				if(value === 'error') {
					if (key != contextBundleNumber) {
						errorLines.push(key);
					}
				}
				
			});
			return errorLines;
			
		}

		/**
		 * Insert new rule actions into stored actions.
		 * Currently just overwrites, maybe should merge?
		 * 
		 * @param  {Object} newActions Actions structure
		 * @return {Object}            Reference to rule actions 
		 */
		service.updateRuleActions = function(newActions) {
			//cleanup all messages
			messages = {};
			messages[0] = angular.copy(messageTemplate);
			linesWithMessage = {};
			
			//do nothing if there are no messages.
			if (!newActions) {
				return;

			}
			// messages.prompt = [];
			_.forEach(ruleTypes, function (ruleType) {
				var ruleActions = newActions[ruleType];
				_.forEach(ruleActions, function (ruleAction) {
					var targetBundleNumber = ruleAction[nsPrefix + 'TargetBundleNumber__c'];//TODO: set as zero for null
					linesWithMessage[targetBundleNumber] = ruleType;
					
					if (angular.isUndefined(messages[targetBundleNumber])) {
						messages[targetBundleNumber] = angular.copy(messageTemplate);
					}
					var targetMessages = messages[targetBundleNumber];
					
					if (ruleAction[nsPrefix + 'IsPrompt__c'] && !ruleAction[nsPrefix + 'Ignored__c']) {
						targetMessages.prompt.push(ruleAction);
						
					} else {
						targetMessages.page[ruleType].push(ruleAction);
						
					}
					
				});

			});

			$log.info('messages', messages);
			return messages;

		}
		
		/**
		 * flag as processed. TODO: handle min-required
		 */
		service.markAsProcessed = function(activePrompt) {
			processedIds[activePrompt.Id] = true;
			
		}	

		/**
		 * @param [RuleAction] activePrompt
		 * @return {[type]} [description]
		 */
		service.ignoreRuleAction = function(activePrompt) {
			var ruleActionId = activePrompt.Id;
			processedIds[activePrompt.Id] = true;
			activePrompt[nsPrefix + 'Ignored__c'] = true;
			
			ConfigurationDataService.createCartRequestDO().then(function(cartRequest) {
				cartRequest.ruleActionId = ruleActionId;
				RemoteService.ignoreRuleAction(cartRequest).then(function(result) {
					service.updateRuleActions(result.ruleActions);				
				});
			});
			
		}

	}

})();