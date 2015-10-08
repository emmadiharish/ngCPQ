/**
 * Service: FilterSearchService
 * 	search product by search term and selected category
 *		TODO: rename this as SearchPoductService
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').service('FilterSearchService', FilterSearchService);

	FilterSearchService.$inject = [
	                       '$q',  
	                       'lodash',
	                       'systemConstants', 
	                       'CatalogDataService',
	                       'ProductFilterDataService',
	                       'CatalogCache',
	                       ];

	function FilterSearchService($q, _, systemConstants, CatalogDataService, ProductFilterDataService, CatalogCache) {		
		var service = this;
		var categoryFilterCache = {};
		
		service.searchCategoryId = "";
		service.searchTerm = "";
		service.searchResultLoaded = false;
		
		service.categories = [];			//all categories
		service.resultCategoryIds = [];		//linked to searched products
		service.lineageCategoryIds = []; 	//ancestor of result categoryIds which are leaf nodes
		
		service.currentCategory;

		service.setCurrentCategory = function (categoryId) {
			if (angular.isDefined(categoryId) && categoryId != "") {
				CatalogDataService.id = categoryId;			
				return CatalogDataService.getCategory(categoryId).then(function(category) {
					service.currentCategory = category;
					service.filters = categoryFilterCache[categoryId];
					return service.currentCategory;
					
				});
				
			} else {
				service.currentCategory = null;
				//service.filters = [];
				return $q.when(service.currentCategory);
				
			}
		};

		service.getCategories = function(searchCategoryId, searchTerm) {
				service.searchResultLoaded = false;
				service.searchTerm = searchTerm;
				return $q.all([	CatalogDataService.getCategories(), 
								CatalogDataService.searchProducts(searchCategoryId, searchTerm) 
								]).then( function (res) {
									service.categories = res[0];
									service.resultCategoryIds = res[1].resultCategoryIds;
									service.searchResultLoaded = true;
									service.categories[0].isExpanded = true;
									service.filters = res[1].productFilters;
									
									if (searchCategoryId && searchCategoryId != "" && angular.isUndefined(service.filters)) {
										CatalogDataService.getProductFiltersForCategory(searchCategoryId).then(function(filters){
											service.filters = filters;
											categoryFilterCache[searchCategoryId] = service.filters;
										});
									} 
									
									//find lineage category id set
									return CatalogDataService.getLineageCategoryIds(service.resultCategoryIds).then(function(res) {
										service.lineageCategoryIds = Object.keys(res.categoryIdSet);
										return service.categories;
										
									});

								});
		};

		service.getAncestors = function (categoryId) {
			return CatalogDataService.getAncestors(categoryId, service.categories);
		};

		service.expandCategoryTree = function (categoryId) {
			var ancestors = service.getAncestors(categoryId);
			_.each(ancestors,function (category) {
				category.isExpanded = true;
			})
		};

		service.collapseCategory = function (category) {
			category.isExpanded = false;
			if (angular.isDefined(category.childCategories) && category.childCategories.length > 0) {
				_.each(category.childCategories, function (category) {
					service.collapseCategory(category);
				});
			} else {
				return;
			}
		};

		service.hasChildCategory = function (category) {
			return (category.childCategories && category.childCategories.length > 0);
		}

		return this;

	}

}).call(this);
