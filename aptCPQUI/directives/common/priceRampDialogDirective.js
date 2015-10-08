/**
 * Directive: priceRampDialog
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('priceRampDialog', PriceRampDialog);

	PriceRampDialog.$inject = ['systemConstants'];

	/**
	 *  Price Ramp Dialog Directive
	 */	
	function PriceRampDialog(systemConstants) {
		return {
			restrict: 'E',
			controller: PriceRampDialogCtrl,
			controllerAs: 'priceRamp',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + "/templates/directives/common/price-ramp.html"
		};
	}

	PriceRampDialogCtrl.$inject = [
	                               'lodash',                            
	                               'systemConstants',
	                               'aptBase.i18nService',
	                               'CartService'
	                               ];

	/**
	 * Price Ramp Dialog controller, used by the directive
	 */ 
	function PriceRampDialogCtrl(_, systemConstants, i18nService, CartService) {
		var activate;
		var nsPrefix = systemConstants.nsPrefix;
		var ctrl = this;
		ctrl.labels = i18nService.CustomLabel;
		ctrl.ramp = CartService.ramp;
		ctrl.rampErrors = {};

		activate = function() {
			CartService.getRampColumns().then(function(result) {
				ctrl.columns = result;
			});

		};
		activate();

		ctrl.close = function() {
			ctrl.rampErrors = {};
			return CartService.isRampDialogOpen = false;

		};

		ctrl.visible = function() {
			return CartService.isRampDialogOpen;
		};

		ctrl.addRampLine = function(rampLine) {
			return CartService.addRampLine(rampLine);
		};

		ctrl.removeRampLine = function(rampLine) {
			return CartService.removeRampLine(rampLine);
		};

		ctrl.hasErrorMessages = function() {
			return Object.keys(ctrl.rampErrors).length > 0;
		};

		ctrl.getProductName = function() {
			if(ctrl.ramp.lineItem) {
				return ctrl.ramp.lineItem.lineItemSO[nsPrefix + 'ProductId__r']['Name'];
			}
		};

		ctrl.saveRamp = function() {

			// TODO: Keep Track of Error Messages with Primary Line Number. 
			// TODO: Sync Server Validation Error 
			var errorMessagesMap = {};

			for(var rampLineIndex = 0; rampLineIndex < ctrl.ramp.lineItem.rampLines.length; rampLineIndex ++) {

				var rampLineStartDate = ctrl.ramp.lineItem.rampLines[rampLineIndex].lineItemSO[nsPrefix + 'StartDate__c'];
				var rampLineEndDate = ctrl.ramp.lineItem.rampLines[rampLineIndex].lineItemSO[nsPrefix + 'EndDate__c'];

				if(rampLineStartDate > rampLineEndDate) {
					if(!angular.isDefined(errorMessagesMap[rampLineIndex])) {
						errorMessagesMap[rampLineIndex] = [ctrl.labels.RampErrorEndBeforeStartDate];
					} else {
						errorMessagesMap[rampLineIndex].push(ctrl.labels.RampErrorEndBeforeStartDate);
					}
				}

				if(rampLineIndex != ctrl.ramp.lineItem.rampLines.length - 1) {
					var nextRampLineStartDate = ctrl.ramp.lineItem.rampLines[rampLineIndex + 1].lineItemSO[nsPrefix + 'StartDate__c'];
					if(rampLineEndDate > nextRampLineStartDate) {
						if(!angular.isDefined(errorMessagesMap[rampLineIndex + 1])) {
							errorMessagesMap[rampLineIndex + 1] = [ctrl.labels.RampErrorDateOverlap];
						} else {
							errorMessagesMap[rampLineIndex + 1].push(ctrl.labels.RampErrorDateOverlap);
						}
					}
				}
			}

			ctrl.rampErrors = errorMessagesMap;

			if(Object.keys(ctrl.rampErrors).length > 0) {
				CartService.saveRamp();

			} else {
				return;

			}	 

		};

		return ctrl;

	};

}).call(this);
