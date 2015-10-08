/**
 * Directive: catalogProduct
 *	handles display of a product and event handler of a product listed on catalog page 	
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('catalogProduct', CatalogProduct);

	CatalogProduct.$inject = ['systemConstants'];

	function CatalogProduct(systemConstants) {
		return {
			restrict: 'E',
			scope: {
				product: '=',
				actionFn: '&actionAttr'
			},
			controller: CatalogProductCtrl,
			controllerAs: 'catalogProduct',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + "/templates/directives/catalog/catalog-product.html"
		};
	};

	CatalogProductCtrl.$inject = ['$state', 'systemConstants', 'aptBase.i18nService', 'CartService', 'CategoryService', 'CartDataService', 'CatalogDataService'];

	function CatalogProductCtrl($state, systemConstants, i18nService, CartService, CategoryService, CartDataService, CatalogDataService) {
		var ctrl = this;
		ctrl.nsPrefix = systemConstants.nsPrefix;
		ctrl.baseFileUrl = systemConstants.baseFileUrl;
		ctrl.customSettings = systemConstants.customSettings;
		ctrl.labels = i18nService.CustomLabel;
		ctrl.product.quantity = 1;
		ctrl.excludedProductIds = CategoryService.excludedProductIds;
		ctrl.inCartProductIds = CartDataService.inCartProductIds;

		var isInCart = false;
		ctrl.addToCart = function() {
			isInCart = true;
			return CartService.addToCart(ctrl.product);
		};

		ctrl.configure = function() {
			return CartService.configureBundle(ctrl.product).then(function (resultItem) {
				var tpln;
				tpln = resultItem.txnPrimaryLineNumber;
				return $state.go('configure', {
					txnPrimaryLineNumber: tpln
				});
			});
		};

		ctrl.isProductDisabled = function() {
			if(ctrl.excludedProductIds) {
				return (ctrl.excludedProductIds.indexOf(ctrl.product.productSO.Id) > -1);
			} else {
				return false;
			}

		};

		ctrl.isMustConfigure = function() {
			return (ctrl.product.productSO[ctrl.nsPrefix + 'Customizable__c']);

		};

		ctrl.isConfigurable = function() {
			return (ctrl.product.productSO[ctrl.nsPrefix + 'HasAttributes__c'] || ctrl.product.productSO[ctrl.nsPrefix + 'HasOptions__c']);

		};

		ctrl.getIconId = function() {
			return (ctrl.product.productSO[ctrl.nsPrefix + 'IconId__c']);

		};

		ctrl.openProductSummary = function(productId) {
			return CatalogDataService.setProductSummaryId(productId);

		};

		ctrl.isSoldAsOption = function() {
			if(ctrl.customSettings.catalogPageSettings.SoldAsOption && 
					ctrl.product.productSO[ctrl.nsPrefix + 'ConfigurationType__c'] === 'Option') {
				return true;

			} else {
				return false;	

			}
		};

	};

}).call(this);
