/**
 * Directive: breadcrumbTrail
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('breadcrumbTrail', BreadcrumbTrail);

	function BreadcrumbTrail(systemConstants) {
		var directive = {
				restrict: 'AE',
				controller: BreadcrumbCtrl,
				controllerAs: 'crumb',
				bindToController: true,
				templateUrl: systemConstants.baseUrl + '/templates/directives/catalog/breadcrumb-block.html'
		};

		return directive;

	};

	BreadcrumbCtrl.$inject = ['$stateParams', 'systemConstants', 'aptBase.i18nService', 'CatalogDataService'];
	
	function BreadcrumbCtrl($stateParams, systemConstants, i18nService, CatalogDataService) {
		var ctrl = this;
		ctrl.labels = i18nService.CustomLabel;
		
		return CatalogDataService.getBreadcrumb($stateParams.categoryId).then(function(res) {
			ctrl.trail = res;
			return ctrl.currentCategory = ctrl.trail.pop();
		});
		
	};

}).call(this);
