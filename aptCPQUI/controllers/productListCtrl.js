/**
 * Controller: productListCtrl
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').controller('productListCtrl', ProductListCtrl);

	ProductListCtrl.$inject = [
	                           '$log',
	                           '$stateParams',
	                           'lodash',
	                           'aptBase.i18nService',
	                           'CatalogDataService',
	                           'CategoryService',
	                           'CartDataService'
	                           ];

	function ProductListCtrl($log, $stateParams, _, i18nService, CatalogService, Category, CartDataService) {
		var searchCtrl = this;
		var searchedTerm = $stateParams.term;
		var searchedTermCategory = $stateParams.category;

		searchCtrl.labels = i18nService.CustomLabel;

		searchCtrl.excludedProductIds = Category.excludedProductIds; //Category Browse and Search Merge Change, Not foud its usage, copied from categoryProductCtrl.js

		searchCtrl.selectedProductsCount = 0; //Category Browse and Search Merge Change, Added, it's fix for showing selected product count
		searchCtrl.itemsPerPage = 10;
		searchCtrl.currentPage = 1;
		searchCtrl.productsInCurrentPage = [];
		searchCtrl.contextProductIds = [];
		searchCtrl.searchResultLoaded = false;
		
		//Category Browse and Search Merge Change, Added, not sure purpose of it, copied from categoryProductCtrl.js
		var getExcludeProductIds = function() {
			getContextProductsForCurrentPage();
			searchCtrl.category.getExcludedProductsInContext();
		}

		var getContextProductsForCurrentPage = function() {
			var Start = (searchCtrl.currentPage - 1) * searchCtrl.itemsPerPage;
			var End = Start + searchCtrl.itemsPerPage;
			searchCtrl.contextProductIds = searchCtrl.getProductsList().slice(Start, End);
			return searchCtrl.contextProductIds;
		}

		var initProductsInCurrentPage = function() {
			searchCtrl.productsInCurrentPage = getContextProductsForCurrentPage();
		}

		searchCtrl.isSearchResult = function() {
			return (searchedTerm == "" || searchedTerm && angular.isDefined(searchedTerm));
		}

		searchCtrl.getProductsList = function() {
			return ( angular.isDefined(searchCtrl.category) && angular.isDefined(searchCtrl.category.products) ) ? searchCtrl.category.products : [];
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
			var selectedProducts = buildSelectedList();
			if (selectedProducts.length > 0) {
				//Travel to compare state?
				$log.info('Compare Selected Products: ', selectedProducts);
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

		/*Remove this function if it is not used anywhere else
		searchCtrl.selectOne = function(){
			if(!searchCtrl.getProductsList()){
				return;
			}

			initProductsInCurrentPage();

			var needsMet = _.reduce(searchCtrl.productsInCurrentPage, function (memo, product) {
				return memo + (product.select ? 1 : 0);
			}, 0);
			return (needsMet !== 0);
		}*/

		searchCtrl.isProductSelected = function () {
			return (searchCtrl.selectedProductsCount !== 0);
		}

		//initializer code block
		var init = function() {
			if (searchCtrl.isSearchResult()) { //Category Browse and Search Merge Change, Added condition to distinguse Search and Category logic

				searchCtrl.searchResultLoaded = false;

				Category.setCurrentCategory(searchedTermCategory).then(function(res){

					searchCtrl.category = Category;
					searchCtrl.category.products = [];

					var filters = ( angular.isDefined(searchCtrl.category) && angular.isDefined(searchCtrl.category.filters) ) ?  searchCtrl.category.filters : [] ;
				
					CatalogService.searchProducts(searchedTermCategory, searchedTerm, filters).then(function(res) {
						searchCtrl.categories = res.categories;
						searchCtrl.category.products = res.products;
						searchCtrl.products = res.products;
						searchCtrl.searchResultLoaded = true;

						_.each(searchCtrl.products, function (product) {
							product.select = false;
						});
						return searchCtrl.products;
					});
				});
					
			} else {
				searchCtrl.category = Category; //Category Browse and Search Merge Change, Added  
				searchCtrl.products = Category.products; //Category Browse and Search Merge Change, Added Todo:need condition for search and category
				getExcludeProductIds();
				searchCtrl.searchResultLoaded = true;
			}
		}

		init();

		return searchCtrl;

	};

}).call(this);
