/**
 * Directive: cartHeaderDirective 
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('cartHeader', CartHeader);

	CartHeader.$inject = ['systemConstants'];

	function CartHeader (systemConstants) {
		return {
			controller: CartHeaderCtrl,
			controllerAs: 'cartHeader',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + '/templates/directives/cart/cart-header.html'
		};
	}

	CartHeaderCtrl.$inject = [
	                          '$scope',
	                          'lodash',
	                          'systemConstants',
	                          'aptBase.i18nService',
	                          'CartService'
	                          ];

	function CartHeaderCtrl ($scope, _, systemConstants, i18nService, CartService) {
		var headerCtrl;
		headerCtrl = this;
		headerCtrl.allSelected = false;
		headerCtrl.anySelected = false;
		headerCtrl.labels = i18nService.CustomLabel; 
		headerCtrl.selectedProductsCount = 0;
		headerCtrl.itemsPerPage = systemConstants.customSettings.systemProperties.LineItemsPerPage;
		headerCtrl.currentPage = 1;
		headerCtrl.productsInCurrentPage = [];
		headerCtrl.contextProductIds = [];

		function init() {
			CartService.getCartLineItems().then(function (lineItems) {
				headerCtrl.lineItems = lineItems;
			});
			CartService.getCheckboxModels().then(function (models) {
				headerCtrl.checkModels = models.all;
			});
		}

		function getContextProductsForCurrentPage() {
			var Start = (headerCtrl.currentPage - 1) * headerCtrl.itemsPerPage;
			var End = Start + headerCtrl.itemsPerPage;
			headerCtrl.contextProductIds = headerCtrl.lineItems.slice(Start, End);
			return headerCtrl.contextProductIds;
		}

		function initProductsInCurrentPage() {
			headerCtrl.productsInCurrentPage = getContextProductsForCurrentPage();
		}

		headerCtrl.isSelected = function() {
			if(!headerCtrl.lineItems){
				return false;
			}

			//Following logic counts selected products from all pages
			var checkedItemCount = _.countBy(headerCtrl.checkModels);
			headerCtrl.selectedProductsCount = (angular.isDefined(checkedItemCount) && angular.isDefined(checkedItemCount.true)) ? checkedItemCount.true : 0;
			headerCtrl.anySelected = (headerCtrl.selectedProductsCount > 0);

			//Following logic check all current page products are selected or not.
			initProductsInCurrentPage();

			var needsMet = _.reduce(headerCtrl.productsInCurrentPage, function (memo, lineItem) {
				return memo + (headerCtrl.checkModels[lineItem.txnPrimaryLineNumber] ? 1 : 0);
			}, 0);

			headerCtrl.allSelected = (needsMet !== 0 && needsMet === headerCtrl.productsInCurrentPage.length);

			return headerCtrl.allSelected;
		}

		headerCtrl.checkAll = function() {

			initProductsInCurrentPage();

			headerCtrl.allSelected = !headerCtrl.allSelected;
			_.each(headerCtrl.productsInCurrentPage, function (lineItem) {
				headerCtrl.checkModels[lineItem.txnPrimaryLineNumber] = headerCtrl.allSelected;
			});
		}

		headerCtrl.removeCheckedItems = function() {
			var selectedItems = buildSelection();
			CartService.removeFromCart(selectedItems);

		}

		headerCtrl.copyCheckedItems = function() {
			var selectedItems = buildSelection();
			CartService.addCopyToCart(selectedItems);
		}

		function buildSelection() {
			var selectedItems = [];
			_.each(headerCtrl.lineItems, function (lineItem) {
				if (headerCtrl.checkModels[lineItem.txnPrimaryLineNumber]) {
					selectedItems.push(lineItem);
					headerCtrl.checkModels[lineItem.txnPrimaryLineNumber] = false;
				}
			});
			return selectedItems;
		}

		headerCtrl.pageChanged = function (newPage) {
			headerCtrl.currentPage = newPage;
		}

		init();

		return headerCtrl;
	}

}).call(this);
