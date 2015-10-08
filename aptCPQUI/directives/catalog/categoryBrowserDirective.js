/**
 * Directive: categoryBrowser
 * 	Defines category browsing directive
 *     	parent            <--- Back to 1 level higher in family tree
 *       sibling
 *       sibling
 *       -----------
 *       sibling         <--- Toggles open to show children if applicable, highlights otherwise
 *         children      <--- Updates generation list
 *       -----------
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('categoryBrowser', CategoryBrowser);

	CategoryBrowser.$inject = ['systemConstants'];

	function CategoryBrowser(systemConstants) {
		return {
			scope: {},
			controller: CategoryBrowserCtrl,
			controllerAs: 'catGroup',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + '/templates/directives/catalog/category-browser-block.html'
		};
	};

	CategoryBrowserCtrl.$inject = ['$state', '$stateParams', 'CatalogDataService'];

	function CategoryBrowserCtrl($state, $stateParams, CatalogService) {
		var ctrl = this;
		ctrl.state = $state.current.name;
		ctrl.depth = 0;
		ctrl.parentSref = '#/catalog';

		CatalogService.getCategory($stateParams.categoryId).then(function(res) {
			return ctrl.currentCategory = res;

		});

		return CatalogService.getCategories().then(function(res) {
			ctrl.categories = res;
			if ($state.is('category')) {
				var categoryLineage = CatalogService.getAncestors($stateParams.categoryId, res);
				var categoriesDepth = categoryLineage.length;
				var modulo = categoriesDepth % 2;
				if (modulo && categoriesDepth > 1) {
					if (categoryLineage[categoriesDepth - 1].childCategories.length) {
						ctrl.browseTree = categoryLineage[categoriesDepth - 1];
						ctrl.parentSref = '#/category/' + categoryLineage[categoriesDepth - 1].parentId;
					} else {
						ctrl.browseTree = categoryLineage[categoriesDepth - 2];
						ctrl.parentSref = '#/category/' + categoryLineage[categoriesDepth - 2].parentId;
					}
				} else if (modulo && categoriesDepth <= 1) {
					ctrl.browseTree = categoryLineage[0];
					ctrl.parentSref = '#/catalog';
				} else {
					ctrl.browseTree = categoryLineage[categoriesDepth - 2];
				}
				return ctrl.parentCategoryLabel = ctrl.browseTree.label;
			}
		});

	};

}).call(this);
