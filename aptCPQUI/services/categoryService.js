/**
 * Service: CategoryService
 * 	keeps track of category selection
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').service('CategoryService', CategoryService);
	
	CategoryService.$inject = ['$q', 'CatalogDataService', 'ProductFilterDataService'];

	function CategoryService($q, CatalogDataService, ProductFilterDataService) {
		var service = this;
		
		service.contextProductIds; //value is set by controller 
		service.excludedProductIds = [];
		service.categoryId;
		service.rootId;
		service.searchText; //currently value is not set, category browsing is not constrained by search term
		service.filters; //used only for across categories
		
		service.setCurrentCategory = function(categoryId) {
			if (service.categoryId !== categoryId) {
				service.filters = undefined;
			}
			service.categoryId = categoryId;
			return CatalogDataService.getCategory(categoryId).then(function(category) {
				return CatalogDataService.searchProducts(service.categoryId, service.searchText, service.filters).then( function (result) {
						service.products = result.products;
						service.resultCategoryIds = result.resultCategoryIds;
						service.filters = result.productFilters;
						service.searchResultLoaded = true;
						return service.products; 
				});	
			});
		};
		
		service.getDefaultSearchCategory = function() {
			return CatalogDataService.getCategories().then(function(categories) {
				if (service.defaultLaunched !== true) {
					for (var i = 0; i < categories.length; i++) {
						var category = categories[i];
						if (category.defaultSearchCategory === true) {
							category = findDefaultSearchCategory([].concat(category));
							service.categoryId = category.nodeId;
							service.defaultLaunched = true;
							return category.nodeId;
						}
					}
				}
				return null;
			});
			
		};


		service.updateProducts = function() {
			return CatalogDataService.searchProducts(service.categoryId, service.searchText, service.filters).then(function(result) {
				service.products = result.products;
				return service.products;

			});
		};

		service.getExcludedProductsInContext = function() {
			return CatalogDataService.getExculdedProductIds(service.categoryId, service.contextProductIds).then(function(productIds) {
				Array.prototype.splice.apply(service.excludedProductIds, [0, service.excludedProductIds.length].concat(productIds));
				return service.excludedProductIds;

			});
		}

		/**
		 * returns first category or the one that is marked as default search category.
		 */
		function findDefaultSearchCategory(categories) {
			for (var i = 0; i < categories.length; i++) {
				var category = categories[i];
				if (category.defaultSearchCategory === true) {
					if (category.leaf === true) {
						return category;

					} else if (category.childCategories.length > 0) {
						return findDefaultSearchCategory(category.childCategories);

					}

				}

			}
			//default to first one	
			return categories[0];

		}

		return service;
	}

}).call(this);
