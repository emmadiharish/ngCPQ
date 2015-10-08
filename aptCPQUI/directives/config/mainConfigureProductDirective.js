/**
 * Directive: mainConfigureProduct
 *  Directive for the Bundle configuration  page
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').directive('mainConfigureProduct', MainConfigureProduct);

	MainConfigureProduct.$inject = ['systemConstants'];

	function MainConfigureProduct(systemConstants) {
		return {
			controller: MainConfigureProductController,
			controllerAs: 'mainConfigCtrl',
			bindToController: true
		};
	}

	MainConfigureProductController.$inject = [
	                                          '$stateParams',
	                                          'systemConstants',
	                                          'ConfigureService',
	                                          'aptBase.i18nService',
	                                          'CatalogDataService'
	                                          ];

	function MainConfigureProductController($stateParams, systemConstants, ConfigureService, i18nService, CatalogDataService) {
		var ctrl = this;
		
		ctrl.lineItem = ConfigureService.lineItem;
		ctrl.view = $stateParams.step ? $stateParams.step : ConfigureService.lineItem.hasAttrs() ? 'attributes' : 'options';
		ctrl.labels = i18nService.CustomLabel; 
		
		ctrl.showBundleHeader = function() {
			return systemConstants.customSettings.optionsPageSettings.ShowBundleDetail == true;
		};

		ctrl.viewOptions = function() {
			return systemConstants.customSettings.optionsPageSettings.TabViewInConfigureBundle == true
			 			|| $stateParams.step == 'options'
			 			|| ctrl.lineItem.hasAttrs() == false;
		};
		
		ctrl.viewAttributes = function() {
			return !ctrl.viewOptions();
		};

		ctrl.openProductSummary = function(productId) {
			return CatalogDataService.setProductSummaryId(productId);
		};
		
		ctrl.showRootNavigation = function() {
			return (!!ConfigureService.lineItem.rootItem 
					&& (ConfigureService.lineItem.rootItem.txnPrimaryLineNumber != ConfigureService.lineItem.txnPrimaryLineNumber));
		};

		return ctrl;

	}

})();
