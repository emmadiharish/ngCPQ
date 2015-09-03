/**
 * Directive: FilterSearchResults
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').directive('filterSearchResults', FilterSearchResults);

	FilterSearchResultsCtrl.$inject = [
		'$stateParams',
		'$q',
		'aptBase.i18nService',
		'CatalogDataService'
	];
	
	function FilterSearchResultsCtrl($stateParams, $q, i18nService, CatalogService) {
		var ctrl = this;
		ctrl.labels = i18nService.CustomLabel;
		var searchedTerm = $stateParams.term;
		var searchCategory = $stateParams.category;

		ctrl.checkChildrenForResults = function(childCats) {
			var ref;
			if (!(childCats != null ? (ref = childCats.childCategories) != null ? ref.length : void 0 : void 0)) {
				return false;
			}
			
			var cat = childCats.childCategories[0];
			var remaining = childCats.childCategories.slice(1);
			
			if (ctrl.isSearchResult(cat.nodeId)) {
				return true;
				
			} else if (remaining.length > 0) {
				return ctrl.checkChildrenForResults(remaining);
				
			} else {
				return false;
				
			}
		};
		
		function getAllNodeIds(lineage) {
			var leaves = lineage.map(function(elem) {
				return elem.nodeId;
			}, lineage);

			return leaves;
		};
		
		ctrl.isSearchResult = function(nodeId) {
			return angular.isDefined(ctrl.searchResultCategoryIds) ? ctrl.searchResultCategoryIds.indexOf(nodeId) > -1 : false;
		};
		
		ctrl.isExpanded = function(nodeId) {
			if (ctrl.openLeaves) {
				return ctrl.openLeaves.indexOf(nodeId) > -1;
			} else {
				return false;
			}
		};
		
		ctrl.viewAll = searchCategory;
		ctrl.term = $stateParams.term;
		
		return CatalogService.getProductFilters().then((function(_this) {
			return function(filters) {
				var filter, filterParam, i, j, k, len, len1, len2, ref, selected, selectedFilters, value;
				if ($stateParams.filterBy) {
					filterParam = $stateParams.filterBy.split(',');
					selectedFilters = _.collect(filterParam, function(entry) {
						return decodeURIComponent(entry);
					});
					for (i = 0, len = filters.length; i < len; i++) {
						filter = filters[i];
						ref = filter.filterFieldValues;
						for (j = 0, len1 = ref.length; j < len1; j++) {
							value = ref[j];
							for (k = 0, len2 = selectedFilters.length; k < len2; k++) {
								selected = selectedFilters[k];
								if (value.value === selected) {
									value.isSelected = true;
								}
							}
						}
					}
					ctrl.filters = filters;
				}
				
				return $q.all([CatalogService.getCategories(), CatalogService.searchProducts(null, searchedTerm, ctrl.filters)]).then(function(res) {
					ctrl.categories = res[0];
					ctrl.products = res[1].products;
					ctrl.resultCategoryIds = res[1].resultCategoryIds;
					ctrl.allFoundProductCount = res[1].products.length;
					return CatalogService.getCategoryIdsForLeaves(ctrl.resultCategoryIds).then(function(res) {
						var categoryLineage;
						ctrl.topLevelCats = res.ancestorIds;
						ctrl.resultCategories = res.resultCategories;
						ctrl.searchResultCategoryIds = Object.keys(ctrl.resultCategories);
						if (searchCategory) {
							categoryLineage = CatalogService.getAncestors(searchCategory, ctrl.categories);
							ctrl.openLeaves = getAllNodeIds(categoryLineage);
						}
						if (searchCategory && categoryLineage.length > 0) {
							return ctrl.categoryTree = categoryLineage;
						} else {
							return ctrl.categoryTree = ctrl.categories;
						}
					});
				});
			};
		})(this));
	};
	
	
	FilterSearchResults.$inject = ['systemConstants'];
	
	function FilterSearchResults(systemConstants) {
		var directive;
		directive = {
				templateUrl: systemConstants.baseUrl + '/templates/directives/filter-search-block.html',
				controller: FilterSearchResultsCtrl,
				controllerAs: 'searchedTerm',
				bindToController: true
		};
		return directive;
	};


}).call(this);
