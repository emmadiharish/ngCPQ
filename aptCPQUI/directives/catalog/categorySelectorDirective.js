/**
 * Directive: CategorySelector
 * 	displays category tree and user can select a category
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('categorySelector', CategorySelector);

	CategorySelector.$inject = ['systemConstants'];
	function CategorySelector(systemConstants) {
		return {
			scope: {},
			controller: CategorySelectorCtrl,
			controllerAs: 'catSelect',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + '/templates/directives/catalog/category-selector-block.html'
		};
	};

	CategorySelectorCtrl.$inject = ['$stateParams', 'CatalogDataService', 'aptBase.i18nService'];
	function CategorySelectorCtrl($stateParams, CatalogService, i18nService) {
		var ctrl = this;

		ctrl.depth = 0;
		ctrl.labels = i18nService.CustomLabel;

		return CatalogService.getCategories().then(function(res) {
			ctrl.categories = res;
			var categoryLineage = CatalogService.getAncestors($stateParams.categoryId, res);
			var categoriesDepth = categoryLineage.length;
			if (categoriesDepth <= 1 && categoryLineage[0]) {
				return ctrl.dropdownLabel = categoryLineage[0].label;

			} else if (categoriesDepth >= 1) {
				return ctrl.dropdownLabel = categoryLineage[1].label;

			}

		});

	};

})();
