/**
 * Directive: compareProducts
 *	Displays product features for products being compared
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').directive('compareProducts', CompareProducts);

	CompareProducts.$inject = ['systemConstants'];

	function CompareProducts(systemConstants) {
		return {
			restrict: 'E',
			scope: {},
			controller: CompareProductsCtrl,
			controllerAs: 'compareCtrl',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + "/templates/directives/catalog/compare-products-block.html"
		};
	};

	CompareProductsCtrl.$inject = ['$log', '$stateParams', 'lodash', 'systemConstants', 'aptBase.i18nService', 'CartService', 'CategoryService', 'CartDataService', 'CatalogDataService'];

	function CompareProductsCtrl($log, $stateParams, _, systemConstants, i18nService, CartService, CategoryService, CartDataService, CatalogDataService) {
		var ctrl = this;
		ctrl.nsPrefix = systemConstants.nsPrefix;
		ctrl.baseFileUrl = systemConstants.baseFileUrl;
		ctrl.customSettings = systemConstants.customSettings;
		ctrl.labels = i18nService.CustomLabel;
		ctrl.excludedProductIds = CategoryService.excludedProductIds;
		ctrl.inCartProductIds = CartDataService.inCartProductIds;
		
		var isInCart = false;
		ctrl.addToCart = function(product) {
			isInCart = true;
			return CartService.addToCart(product);
		};
		
		ctrl.getFeatureSet = function(){
			if (angular.isDefined(ctrl.productFeatures)) {
				return ctrl.productFeatures.featureSets;
			}
		};

		ctrl.getCompareProductIds = function(){
			if (angular.isDefined(ctrl.productFeatures)) {
				return ctrl.productFeatures.productIds;
			}	
		};

		ctrl.getTotalProducts = function(){
			if (angular.isDefined(ctrl.productFeatures.productIds)) {
				return ctrl.productFeatures.productIds.length;
			}	
		};

		ctrl.isProductDisabled = function(product) {
			if(ctrl.excludedProductIds) {
				return (ctrl.excludedProductIds.indexOf(product.productSO.Id) > -1);
			} else {
				return false;
			}

		};

		ctrl.isMustConfigure = function(product) {
			return (product.productSO[ctrl.nsPrefix + 'Customizable__c']);

		};

		ctrl.isConfigurable = function(product) {
			return (product.productSO[ctrl.nsPrefix + 'HasAttributes__c'] || product.productSO[ctrl.nsPrefix + 'HasOptions__c']);

		};

		ctrl.isSoldAsOption = function(product) {
			if(ctrl.customSettings.catalogPageSettings.SoldAsOption && 
					product.productSO[ctrl.nsPrefix + 'ConfigurationType__c'] === 'Option') {
				return true;

			} else {
				return false;	

			}
		};
		
		ctrl.isFeatureSetAdded = function(featureSetId) {
			if (angular.isDefined(ctrl.productFeatures.productFeatureValues)) {
				return _.some( ctrl.productFeatures.productFeatureValues, function( el ) {
					var flag = false;
					return _.some( el, function( fset ) {
				    	if(fset.FeatureId__r.FeatureSetId__c === featureSetId){
				    		flag = true;
				    	}
				    	return flag;
					});
				});
			}	
		};

		ctrl.getFeatureValue = function(productId, featureId) {
			
			var FeatureValue = _(ctrl.productFeatures).chain().
													   pluck(productId).
													   flatten().
													   findWhere({FeatureId__c : featureId}).
													   value();

			return angular.isDefined(FeatureValue) ? FeatureValue.Value__c : ctrl.labels.NoRecordsToDisplay;

		};

		
		function init() {
			ctrl.productIds = $stateParams.productIds.split(',');
			CatalogDataService.getCompareProductFeatures(ctrl.productIds).then(function(result){
				$log.log('productFeatures', result);
				ctrl.productFeatures = result;
				ctrl.totalFeature = Object.keys(ctrl.productFeatures.productFeatureValues).length;
			});

			CatalogDataService.getProductsByIds(ctrl.productIds).then(function(result){
				$log.log('products', result);
				// Get 2 type of JSON response
				// scenario 1 : on Compare product page > refresh page > get result in array of array
				// scenario 2 : From catalog page > select products to compare > redirect to compare > get result in array
				if (angular.isObject(result.products)) { 
					if (angular.isArray(result.products[0])) {
						ctrl.compareProducts = result.products[0];
					} else {
						ctrl.compareProducts = result.products;
					}
				}
			});
		}
		
		init();
		
		return ctrl;
		
	};


}).call(this);
