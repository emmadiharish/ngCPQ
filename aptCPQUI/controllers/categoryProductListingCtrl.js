/**
 * Controller: CategoryProductListingCtrl
 *  Helps listing products for a category
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').controller('categoryProductListingCtrl', CategoryProductListingCtrl);

	CategoryProductListingCtrl.$inject = [
	                                      'lodash',
	                                      'systemConstants',
	                                      'aptBase.i18nService',
	                                      'CategoryService',
	                                      'CartDataService'
	                                      ];

	function CategoryProductListingCtrl(_, systemConstants, i18nService, CategoryService, CartDataService) {
		var ctrl = this;
		
		ctrl.products = CategoryService.products;
		ctrl.productsInCurrentPage = [];
		ctrl.labels = i18nService.CustomLabel;
		ctrl.addSelectedToCart = addSelectedToCart;
		ctrl.getProductSONames = getProductSONames;
		ctrl.getProductSOs = getProductSOs;
		ctrl.selectAll = selectAll;
		ctrl.allSelected = allSelected;
		ctrl.selectOne = selectOne;
		ctrl.excludedProductIds = CategoryService.excludedProductIds;
		ctrl.pageChanged = pageChanged;
		ctrl.itemsPerPage = systemConstants.customSettings.catalogPageSettings.CatalogProductsPerPage;
		ctrl.currentPage = 1;

		getExcludeProductIds();


		return ctrl;

		function getExcludeProductIds() {
			getContextProductsForCurrentPage();
			CategoryService.getExcludedProductsInContext();

		};

		function getContextProductsForCurrentPage() {
			var Start = (ctrl.currentPage - 1) * ctrl.itemsPerPage;
			var End = Start + ctrl.itemsPerPage;
			CategoryService.contextProductIds = ctrl.products.slice(Start, End);
			return CategoryService.contextProductIds;

		}

		function pageChanged(newPage) {
			ctrl.currentPage = newPage;
			getExcludeProductIds();

		};



		function addSelectedToCart() {
			var selectedProducts = buildSelectedList();
			if (selectedProducts.length > 0) {
				CartDataService.addToCart(selectedProducts);

			}

		}

		function buildSelectedList() {
			var selectedProducts = [];

			_.each(ctrl.productsInCurrentPage, function (product) {

				if (product.select) {
					selectedProducts.push(product);
					product.select = false;
				}
			});
			return selectedProducts;

		}

		function getProductSONames(product){
			var productSONames = [];
			_.each(product['defaultOptionProducts'], function(item){
				productSONames.push(item['productSO']['Name']);
			});
			return productSONames;
		}

		function getProductSOs(product){
			var productSOs = [];
			_.each(product['defaultOptionProducts'], function(item){
				productSOs.push(item['productSO']);
			});
			return productSOs;
		}


		function initProductsInCurrentPage(){
			ctrl.productsInCurrentPage = getContextProductsForCurrentPage();
		}

		function selectAll() {
			if (!CategoryService) {
				return;
			}

			initProductsInCurrentPage();

			var newValue = !ctrl.allSelected();

			_.each(ctrl.productsInCurrentPage, function (product) {

				if(ctrl.excludedProductIds.indexOf(product.productSO.Id) == -1) {
					product.select = newValue;
				}

			});
		}

		function allSelected() {

			if (!CategoryService) {
				return;
			}

			initProductsInCurrentPage();

			var needsMet = _.reduce(ctrl.productsInCurrentPage, function (memo, product) {
				return memo + (product.select ? 1 : 0);
			}, 0);

			return (needsMet === (ctrl.productsInCurrentPage.length - ctrl.excludedProductIds.length));
		}

		function selectOne(){
			if (!CategoryService) {
				return;
			}

			initProductsInCurrentPage();

			var needsMet = _.reduce(ctrl.productsInCurrentPage, function (memo, product) {
				return memo + (product.select ? 1 : 0);
			}, 0);
			return (needsMet !== 0);
		}

	};

}).call(this);
