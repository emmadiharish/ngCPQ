/**
 * Controller: productListCtrl
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').controller('productListCtrl', ProductListCtrl);

	ProductListCtrl.$inject = [
	                           '$log',
	                           '$state',
	                           '$stateParams',
	                           'lodash',
	                           'systemConstants',
	                           'aptBase.i18nService',
	                           'CatalogDataService',
	                           'CategoryService',
	                           'CartDataService',
	                           'FilterSearchService'
	                           ];

	function ProductListCtrl($log, $state, $stateParams, _, systemConstants, i18nService, CatalogDataService, CategoryService, CartDataService, FilterSearchService) {
		var searchCtrl = this;
		var searchTerm = $stateParams.term;
		var searchCategory = $stateParams.categoryId;

		searchCtrl.labels = i18nService.CustomLabel;

		searchCtrl.excludedProductIds = CategoryService.excludedProductIds; //Category Browse and Search Merge Change, Not found its usage, copied from categoryProductCtrl.js

		searchCtrl.selectedProductsCount = 0; //Category Browse and Search Merge Change, Added, it's fix for showing selected product count
		searchCtrl.itemsPerPage = systemConstants.customSettings.catalogPageSettings.CatalogProductsPerPage;
		searchCtrl.currentPage = 1;
		searchCtrl.productsInCurrentPage = [];
		searchCtrl.contextProductIds = [];

		FilterSearchService.searchResultLoaded = false;

		//Category Browse and Search Merge Change, Added, not sure purpose of it, copied from categoryProductCtrl.js
		var getExcludeProductIds = function() {
			getContextProductsForCurrentPage();
			CategoryService.getExcludedProductsInContext();
		}

		var getContextProductsForCurrentPage = function() {
			var start = (searchCtrl.currentPage - 1) * searchCtrl.itemsPerPage;
			var end = start + searchCtrl.itemsPerPage;
			searchCtrl.contextProductIds = searchCtrl.getProductsList().slice(start, end);
			return searchCtrl.contextProductIds;
		}

		var initProductsInCurrentPage = function() {
			searchCtrl.productsInCurrentPage = getContextProductsForCurrentPage();
		}

		searchCtrl.isSearchResult = function() {
			return (searchTerm == "" || searchTerm && angular.isDefined(searchTerm));
		}

		searchCtrl.isSearchResultLoaded = function() {
			return FilterSearchService.searchResultLoaded == true;
		}

		searchCtrl.getProductsList = function() {
			return (angular.isDefined(CategoryService.products) ) ? CategoryService.products : [];
		}

		searchCtrl.pageChanged = function(newPage) {
			searchCtrl.currentPage = newPage;
		};


		searchCtrl.addSelectedToCart = function() {
			var selectedProducts = buildSelectedList();
			if (selectedProducts.length > 0) {
				CartDataService.addToCart(selectedProducts);

			}
		}

		searchCtrl.compareSelected = function() {
			var selectedProductIds = [];
			_.each(searchCtrl.getProductsList(), function (product) {
				if (product.select) {
					selectedProductIds.push(product.productSO.Id);
				}
			});
			if (selectedProductIds.length > 0) {
				//Travel to compare state?
				$log.info('Compare Selected Products2: ', selectedProductIds);
				return $state.go('compare', {
					productIds: selectedProductIds
				});
			}

		}

		var buildSelectedList = function() {
			var selectedProducts = [];

			_.each(searchCtrl.getProductsList(), function (product) {
				if (product.select) {
					selectedProducts.push(product);
					product.select = false;
				}
			});
			return selectedProducts;

		}

		searchCtrl.getProductSONames = function(product){
			var productSONames = [];
			_.each(product['defaultOptionProducts'], function(item){
				productSONames.push(item['productSO']['Name']);
			});
			return productSONames;
		}

		searchCtrl.getProductSOs = function(product){
			var productSOs = [];
			_.each(product['defaultOptionProducts'], function(item){
				productSOs.push(item['productSO']);
			});
			return productSOs;
		}

		searchCtrl.selectAll = function() {
			if(!searchCtrl.getProductsList()){
				return;
			}

			initProductsInCurrentPage();

			var newValue = !searchCtrl.allSelected();

			_.each(searchCtrl.productsInCurrentPage, function (product) {
				if(!(_.includes(searchCtrl.excludedProductIds, product.productSO.Id))) {
					product.select = newValue;
				}

			});
		}

		searchCtrl.allSelected = function() {
			if(!searchCtrl.getProductsList()){
				return;
			}

			initProductsInCurrentPage();

			var needsMet = _.reduce(searchCtrl.productsInCurrentPage, function (memo, product) {
				return memo + (product.select ? 1 : 0);
			}, 0);

			searchCtrl.selectedProductsCount = _.reduce(searchCtrl.getProductsList(), function (memo, product) {
				return memo + (product.select ? 1 : 0);
			}, 0);

			return (needsMet !== 0 && needsMet === (searchCtrl.productsInCurrentPage.length - searchCtrl.excludedProductIds.length));
		}

		searchCtrl.isProductSelected = function () {
			return (searchCtrl.selectedProductsCount !== 0);
		}

		searchCtrl.unSelectProducts = function () {
			_.each(searchCtrl.products, function (product) {
				product.select = false;
			});
		}

		searchCtrl.getSearchResult = function () {
			CatalogDataService.searchProducts(searchCategory, searchTerm).then(function(res) {
				CategoryService.products = res.products;
				CategoryService.filters = res.productFilters;
				CategoryService.categoryId = searchCategory;

				CategoryService.resultLeafCategoryIds = res.resultCategoryIds;
				FilterSearchService.searchResultLoaded = true;

				searchCtrl.unSelectProducts();
			});

		}

		//initializer code block
		var init = function() {
			if (searchCtrl.isSearchResult()) {
				//CategoryService.searchText = searchTerm;
				FilterSearchService.searchResultLoaded = false;

				FilterSearchService.setCurrentCategory(searchCategory).then(function(res){
					CategoryService.products = [];
					searchCtrl.getSearchResult();
				});

			} else {
				getExcludeProductIds();
				FilterSearchService.searchResultLoaded = true;
			}
		}

		init();

		return searchCtrl;

	};

}).call(this);
