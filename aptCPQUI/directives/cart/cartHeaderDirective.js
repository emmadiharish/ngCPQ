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
		headerCtrl.totalPage = 1;
		headerCtrl.selectedItemsIndex = [];
		headerCtrl.usedItemsIndex = [];
		headerCtrl.moveToIndex = 0;

		function init() {
			CartService.getCartLineItems().then(function (lineItems) {
				headerCtrl.lineItems = lineItems;
				headerCtrl.totalPage = Math.ceil(headerCtrl.lineItems.length/headerCtrl.itemsPerPage);
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

		headerCtrl.getTimes = function(n) {
		     return new Array(n);
		}

		headerCtrl.moveCheckedItems = function(pageNumber){
			var selectedItems = buildSelection();
			headerCtrl.usedItemsIndex = [];

			// calculate destination index based on items per page and selected page number
			headerCtrl.moveToIndex = pageNumber * headerCtrl.itemsPerPage;

			// Rearrange line items array without selected items
			_.each(headerCtrl.lineItems, function(lineItem, key) {
				var ele = findNextElement(key);
				if(!isNaN(ele))
			    {
			    	headerCtrl.lineItems[key] = headerCtrl.lineItems[ele];
			    }
			});

			// move selected item to specified page
			moveSelectedItems(selectedItems);

			// To update Indexes
			CartService.resequenceLineItems();
			CartService.updateCartLineItems();

		}

		// Find next element which take place of selected element
		function findNextElement(index){
		  	for(var j = index;j < headerCtrl.lineItems.length; j++)
		    {
		        if(!_.contains(headerCtrl.selectedItemsIndex, j) && !_.contains(headerCtrl.usedItemsIndex, j))
		        {
		            headerCtrl.usedItemsIndex.push(j);
		            return j;
		        }
		    }
		}

		function moveSelectedItems(selectedItem){
			var calculatedLineItems = headerCtrl.moveToIndex + selectedItem.length;
			var totalLineItems = headerCtrl.lineItems.length;
			if(calculatedLineItems > totalLineItems)
			{
				headerCtrl.moveToIndex = headerCtrl.moveToIndex - (calculatedLineItems - totalLineItems);
			}
			for(var k=0; k < selectedItem.length; k++){
			  headerCtrl.lineItems.splice(headerCtrl.moveToIndex, 0, selectedItem[k]);
			  headerCtrl.moveToIndex++;
			}  

		}

		function buildSelection() {
			var selectedItems = [];
			headerCtrl.selectedItemsIndex = [];
			var selectedItemIndex = 0;
			_.each(headerCtrl.lineItems, function (lineItem) {
				if (headerCtrl.checkModels[lineItem.txnPrimaryLineNumber]) {
					selectedItems.push(lineItem);
					headerCtrl.selectedItemsIndex.push(selectedItemIndex);
					headerCtrl.checkModels[lineItem.txnPrimaryLineNumber] = false;
				}
				selectedItemIndex++;
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
