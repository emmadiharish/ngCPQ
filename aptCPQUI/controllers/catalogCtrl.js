/**
 * Controller: catalogCtrl
 * 	displays category list, invoked from aptCPQUI.js 
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').controller('catalogCtrl', CatalogCtrl);

	CatalogCtrl.$inject = ['systemConstants', 'aptBase.i18nService', 'CatalogDataService'];
	
	function CatalogCtrl(systemConstants, i18nService, CatalogDataService) {
		var ctrl = this;

		ctrl.labels = i18nService.CustomLabel;
		ctrl.baseFileUrl = systemConstants.baseFileUrl;

		CatalogDataService.getCategories().then(function(res) {
			return ctrl.categories = res;
		});

		return ctrl;
	};

}).call(this);
