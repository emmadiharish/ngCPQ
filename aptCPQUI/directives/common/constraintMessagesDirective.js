/**
 * Directive: ConstraintMessages
 * 	defines the directive and the controller used in the directive 
 */
(function() {
	'use strict';

	angular.module('aptCPQUI').directive('constraintMessages', ConstraintMessages);

	ConstraintMessages.$inject = ['systemConstants'];
	function ConstraintMessages(systemConstants) {
		return {
			controller: ConstraintMessagesCtrl,
			controllerAs: 'messageCtrl',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + '/templates/directives/common/constraint-messages.html'
		};
	}

	ConstraintMessagesCtrl.$inject = [
		'systemConstants',
		'aptBase.i18nService',
		'aptBase.UtilService',
		'ConstraintRuleDataService',
		'CartDataService'
	];
	
	function ConstraintMessagesCtrl(systemConstants, i18nService, UtilService, ConstraintRuleDataService, CartDataService) {
		var ctrl = this;
		var nsPrefix = systemConstants.nsPrefix;
		ctrl.labels = i18nService.CustomLabel;
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
			var errorLineNumbers = ctrl.messenger.getCommonErrorLines();

			if (errorLineNumbers.length !== 0) {
				CartDataService.getLineItems(errorLineNumbers).then(function (lineItemsWithErrors) {
					angular.forEach(lineItemsWithErrors, function(nextLineItem, index) {
						var lineSequence = nextLineItem.primaryLine().sequence();
						var productName = nextLineItem.productName();
						var newError = {
							message: UtilService.stringFormat(ctrl.labels.ConfigurationPendingFor, [lineSequence, productName])
						}; 
						ctrl.errorMessages.push(newError);
						
					});

				});
				
			}
			return ctrl.errorMessages;
		
		}

		ctrl.pageInfos = function() {
			return ctrl.messenger.getMessages().page.info;
		};

		ctrl.hasError = function() {
			return ctrl.messenger.getMessages().page.error.length !== 0;
		};

		ctrl.hasWarning = function() {
			return ctrl.messenger.getMessages().page.warning.length !== 0;
		};

		ctrl.hasCommonErrors = function() {
			return ctrl.messenger.getCommonErrorLines().length !== 0;
		};

		ctrl.hasInfo = function() {
			return ctrl.messenger.getMessages().page.info.length !== 0;
		};

		ctrl.hasMessages = function() {
			return ctrl.hasError() || ctrl.hasWarning() || ctrl.hasInfo() || ctrl.hasCommonErrors();
		};

		ctrl.messenger = ConstraintRuleDataService;

		//initialize
		processCommonErrors();

		return this;

	}

}).call(this);
