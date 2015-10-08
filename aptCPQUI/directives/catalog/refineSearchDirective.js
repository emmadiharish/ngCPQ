/**
 * Directive: refineSearch
 * 	Defines refine search 
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('refineSearch', RefineSearch);

	RefineSearch.$inject = ['systemConstants'];

	function RefineSearch(systemConstants) {
		return {
			controller: RefineSearchCtrl,
			controllerAs: 'refineSearch',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + "/templates/directives/catalog/refine-search.html"
		};
	};

	RefineSearchCtrl.$inject = ['aptBase.i18nService', 'CategoryService'];

	function RefineSearchCtrl(i18nService, CategoryService) {
		var ctrl = this;
		ctrl.labels = i18nService.CustomLabel;
		
		ctrl.getFilters = function(){
			return CategoryService.filters;
		};
		
		ctrl.searchProducts = function(){
			return CategoryService.updateProducts().then(function(result){
				return result;
			});
		};
		
		return ctrl;
	};

}).call(this);
