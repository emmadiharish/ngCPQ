/**
 * Directive: ConstraintMessages
 * 	defines the directive and the controller used in the directive 
 */
(function() {
	'use strict';
	
	angular.module('aptCPQUI').directive('constraintMessages', ConstraintMessages);

	//controller is not added to the module
	ConstraintMessagesCtrl.$inject = ['systemConstants', 'ConstraintRuleDataService', 'CartDataService'];
	function ConstraintMessagesCtrl(systemConstants, ConstraintRuleDataService, CartDataService) {
		var ctrl = this;
		var nsPrefix = systemConstants.nsPrefix;
		ctrl.errorMessages = [];
		ctrl.messageField = nsPrefix + 'Message__c';
		
		ctrl.pageErrors = function() {
			return ctrl.messenger.getMessages().page.error;
		};
		
		ctrl.pageWarnings = function() {
			return ctrl.messenger.getMessages().page.warning;
		};
		
		function processCommonErrors() {
			ctrl.errorMessages.length = 0;
			
			var contextBundleNumber = ConstraintRuleDataService.getContextBundleNumber();
			var errorLines = ctrl.messenger.getCommonErrorLines();
			if (errorLines[0] === 'error' && contextBundleNumber !== 0) {
				ctrl.errorMessages.push({message: "There are pending configuration for selected products.", lines: []});
			}
			
			if (errorLines.length != 0) {
				var lineInfoList = angular.forEach(errorLines, function(value, key){
					if (value !== 0) {
						CartDataService.getLineItem(value).then(function(lineItem) {
							var lineItemSO = lineItem.lineItemSO;
							return ('#' + lineItemSO[nsPrefix+'LineSequence__c'] + ':' + lineItemSO[nsPrefix+'ProductId__r'].Name);
						});
					}
					return [];
				});
				ctrl.errorMessages.push({message: "There are pending configuration for following bundles", lines: lineInfoList});
				
			}
			return ctrl.errorMessages;
		};

		ctrl.pageInfos = function() {
			return ctrl.messenger.getMessages().page.info;
		};
		
		ctrl.hasError = function() {
			return ctrl.messenger.getMessages().page.error.length != 0;
		};
		
		ctrl.hasWarning = function() {
			return ctrl.messenger.getMessages().page.warning.length != 0;
		};
		
		ctrl.hasCommonErrors = function() {
			return ctrl.messenger.getCommonErrorLines().length != 0;
		};
		
		ctrl.hasInfo = function() {
			return ctrl.messenger.getMessages().page.info.length != 0;
		};

		ctrl.hasMessages = function() {
			return ctrl.hasError() || ctrl.hasWarning() || ctrl.hasInfo() || ctrl.hasCommonErrors();
		};
		
		ctrl.messenger = ConstraintRuleDataService;
		
		//initialize
		processCommonErrors();
		
		return this;
		
	};

	ConstraintMessages.$inject = ['systemConstants'];
	function ConstraintMessages(systemConstants) {
		return {
			templateUrl: systemConstants.baseUrl + '/templates/directives/common/constraint-messages.html',
			controller: ConstraintMessagesCtrl,
			controllerAs: 'messageCtrl',
			bindToController: true
		};
	};

}).call(this);
