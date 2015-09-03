/**
 * Directive: CategorySelector
 * 	displays category tree and user can select a category
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').directive('categorySelector', CategorySelector);

	categorySelectorCtrl.$inject = ['$stateParams', 'CatalogDataService', 'aptBase.i18nService'];
	function categorySelectorCtrl($stateParams, CatalogService, i18nService) {
		var ctrl = this;
		
		ctrl.depth = 0;
		ctrl.labels = i18nService.CustomLabel;
		
		return CatalogService.getCategories().then(function(res) {
			var categoriesDepth, categoryLineage;
			ctrl.categories = res;
			categoryLineage = CatalogService.getAncestors($stateParams.catID, res);
			categoriesDepth = categoryLineage.length;
			if (categoriesDepth <= 1 && categoryLineage[0]) {
				return ctrl.dropdownLabel = categoryLineage[0].label;

			} else if (categoriesDepth >= 1) {
				return ctrl.dropdownLabel = categoryLineage[1].label;

			}
	
		});

	};

	CategorySelector.$inject = ['systemConstants'];
	function CategorySelector(systemConstants) {
		return {
			scope: {},
			bindToController: true,
			controller: categorySelectorCtrl,
			controllerAs: 'catSelect',
			templateUrl: systemConstants.baseUrl + '/templates/directives/category-selector-block.html'
		};
	};


}).call(this);
