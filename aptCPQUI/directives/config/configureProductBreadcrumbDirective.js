/**
 * Directive: configureProductBreadcrumb
 * Shows Bredcrumbs navigaion of Bundle and Sub-bundle products
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('configureProductBreadcrumb', ConfigureProductBreadcrumb);

	ConfigureProductBreadcrumb.$inject = ['systemConstants'];
	function ConfigureProductBreadcrumb(systemConstants) {
		return {
			controller: configureProductBreadcrumbCtrl,
			controllerAs: 'breadCrumb',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/configure-product-breadcrumb.html"
		};
	};

	configureProductBreadcrumbCtrl.$inject = ['ConfigureService'];

	function configureProductBreadcrumbCtrl(ConfigureService) {
		var ctrl = this;
		ctrl.lineItem = ConfigureService.lineItem;
		ctrl.crumbs = [];

		var init = function(){			
			if (ctrl.crumbs.length === 0) {
				generateCrumbs(ctrl.lineItem);
			}			
		};

		var generateCrumbs = function(lineItem) {			
			if (lineItem.parentItem) {
				generateCrumbs(lineItem.parentItem);
			}
			ctrl.crumbs.push(lineItem);
			return ctrl.crumbs;
		};

		ctrl.getCrumbs = function() {
			return ctrl.crumbs;			
		};

		ctrl.isCurrentItem = function(lineItem) {
			return lineItem.txnPrimaryLineNumber === ctrl.lineItem.txnPrimaryLineNumber;
		};
		
		init();
		
		return ctrl;
		
	};

}).call(this);
