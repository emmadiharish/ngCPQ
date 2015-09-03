/**
 * Directive: mainConfigureProduct
 *  Directive for the Bundle configuration  page
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').directive('mainConfigureProduct', MainConfigureProduct);

	MainConfigureProductController.$inject = [
	                                          '$stateParams',
	                                          'ConfigureService',
	                                          'aptBase.i18nService',
	                                          'CatalogDataService'
	                                          ];

	function MainConfigureProductController($stateParams, ConfigureService, i18nService, CatalogDataService) {
		var mainConfigCtrl = this;
		mainConfigCtrl.lineItem = ConfigureService.lineItem;
		mainConfigCtrl.view = $stateParams.step ? $stateParams.step : mainConfigCtrl.lineItem.hasAttrs() ? 'attributes' : 'options';
		mainConfigCtrl.labels = i18nService.CustomLabel; 

		mainConfigCtrl.openProductSummary = function(productId) {
			return CatalogDataService.setProductSummaryId(productId);
		};

	}

	MainConfigureProduct.$inject = ['systemConstants'];

	function MainConfigureProduct(systemConstants) {
		return {
			controller: MainConfigureProductController,
			controllerAs: 'config',
			bindToController: true
		};
	}

})();
