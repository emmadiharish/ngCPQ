(function() {
  var CatalogProduct, catalogProductCtrl;

  catalogProductCtrl = function($state, systemConstants, CartService, i18nService, CategoryService, CartDataService, CatalogDataService) {
    var ctrl = this;
    ctrl.nsPrefix = systemConstants.nsPrefix;
    ctrl.baseFileUrl = systemConstants.baseFileUrl;
    
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

  };

  catalogProductCtrl.$inject = ['$state', 'systemConstants', 'CartService', 'aptBase.i18nService', 'CategoryService', 'CartDataService', 'CatalogDataService'];

  CatalogProduct = function(systemConstants) {
    return {
      scope: {
        product: '=',
        actionFn: '&actionAttr'
      },
      templateUrl: systemConstants.baseUrl + "/templates/directives/catalog-product.html",
      controller: catalogProductCtrl,
      controllerAs: 'catalogProduct',
      bindToController: true,
      restrict: 'E'
    };
  };

  CatalogProduct.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('catalogProduct', CatalogProduct);

}).call(this);
