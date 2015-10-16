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
	                               'PriceRampService',
	                               'CartService'
	                               ];

	/**
	 * Price Ramp Dialog controller, used by the directive
	 */ 
	function PriceRampDialogCtrl(_, systemConstants, i18nService, PriceRampService, CartService) {
		var activate;
		var nsPrefix = systemConstants.nsPrefix;
		var ctrl = this;
		ctrl.labels = i18nService.CustomLabel;
		ctrl.rampLineItemModel = PriceRampService.rampLineItemModel;
		ctrl.rampErrors = {};

		activate = function() {
			CartService.getRampColumns().then(function(result) {
				ctrl.columns = result;
			});

		};
		activate();

		ctrl.close = function() {
			ctrl.rampErrors = {};
			return PriceRampService.isRampDialogOpen = false;

		};

		ctrl.visible = function() {
			return PriceRampService.isRampDialogOpen;
		};

		ctrl.addRampLine = function(rampLine) {
			return PriceRampService.addRampLine(rampLine);
		};

		ctrl.removeRampLine = function(rampLine) {
			return PriceRampService.removeRampLine(rampLine);
		};

		ctrl.hasErrorMessages = function() {
			return Object.keys(ctrl.rampErrors).length > 0;
		};

		ctrl.isDynamicField = function(fieldType) {
			return angular.isUndefined(fieldType) || String(fieldType).toUpperCase() !== "GUIDANCE";
		};

		ctrl.saveRamp = function() {
			PriceRampService.saveRamp();
			ctrl.close();
		};

		return ctrl;

	};

}).call(this);
