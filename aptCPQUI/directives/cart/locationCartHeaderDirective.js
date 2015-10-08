/**
 * Directive: LocationCartHeaderDirective 
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('locationCartHeader', LocationCartHeader);

	LocationCartHeader.$inject = ['systemConstants'];

	function LocationCartHeader (systemConstants) {
		return {
			controller: LocationCartHeaderCtrl,
			controllerAs: 'locationCartHeader',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + '/templates/directives/cart/location-cart-header.html'
		};
	}

	LocationCartHeaderCtrl.$inject = [
	                          'lodash',
	                          'systemConstants',
	                          'aptBase.i18nService',
	                          'CartService'
	                          ];

	function LocationCartHeaderCtrl (_, systemConstants, i18nService, CartService) {
		var headerCtrl;
		headerCtrl = this;
		headerCtrl.labels = i18nService.CustomLabel; 
		headerCtrl.selectedProductsCount = 0;

		function init() {
			CartService.getCartLineItems().then(function (lineItems) {
				headerCtrl.lineItems = lineItems;
			});
			CartService.getLocationCartCheckBoxModels().then(function (models) {
				headerCtrl.checkModels = models.all;
			});
		}

		headerCtrl.isAnyProductSelected = function() {
			if(!headerCtrl.lineItems){
				return false;
			}

			//Following logic counts selected products from all pages
			var checkedItemCount = _.countBy(headerCtrl.checkModels);
			headerCtrl.selectedProductsCount = (angular.isDefined(checkedItemCount) && angular.isDefined(checkedItemCount.true)) ? checkedItemCount.true : 0;
			headerCtrl.anySelected = (headerCtrl.selectedProductsCount > 0);

			return headerCtrl.anySelected;

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

		init();

		return headerCtrl;
	}

}).call(this);
