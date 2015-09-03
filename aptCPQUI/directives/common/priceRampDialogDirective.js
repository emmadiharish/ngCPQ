/**
 * Directive: priceRampDialog
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('priceRampDialog', PriceRampDialog);

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
		ctrl.errorMessages = [];

		activate = function() {
			CartService.getRampColumns().then(function(result) {
				ctrl.columns = result;
			});

		};
		activate();

		ctrl.close = function() {
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
			return ctrl.errorMessages.length != 0;
		};

		ctrl.getProductName = function() {
			if(ctrl.ramp.lineItem) {
				return ctrl.ramp.lineItem.lineItemSO[nsPrefix + 'ProductId__r']['Name'];
			}
		};

		ctrl.saveRamp = function() {
			
			var errorMessages = [];

			_.each(ctrl.ramp.lineItem.rampLines, function(rampLine, lineIndex) {
				var startDate = rampLine.lineItemSO[nsPrefix + 'StartDate__c'];
				var endDate = rampLine.lineItemSO[nsPrefix + 'EndDate__c'];

				if(startDate > endDate) {
					errorMessages.push('Error on Line '+lineIndex+': Start Date must be before End Date');
				}
			});

			Array.prototype.splice.apply(ctrl.errorMessages, [0, ctrl.errorMessages.length].concat(errorMessages));	

		};

		return ctrl;

	};

	PriceRampDialog.$inject = ['systemConstants'];

	/**
	 *  Price Ramp Dialog Directive
	 */	
	function PriceRampDialog(systemConstants) {

		return {
			restrict: 'E',
			templateUrl: systemConstants.baseUrl + "/templates/directives/common/price-ramp.html",
			controller: PriceRampDialogCtrl,
			controllerAs: 'priceRamp',
			bindToController: true
		};
	}

}).call(this);
