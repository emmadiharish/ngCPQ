(function() {
  var MiniCart, miniCartCtrl, miniCartLink;

  miniCartLink = function(scope, elem, attrs, ctrl) {
    var clickOutside, dropdown;
    dropdown = elem[0].querySelector('.mini-cart__display');
    clickOutside = document.querySelector('html');
    clickOutside.addEventListener('click', function() {
      return elem.removeClass('is--open');
    });
    elem[0].addEventListener('click', function(e) {
      return e.stopPropagation();
    });

    scope.$watch(function () { return ctrl.totals; },
      function(newVal, oldVal) {
        if(newVal) {
          ctrl.syncCartTotal();
        }
      }, true
    );

    return dropdown.addEventListener('click', function(e) {
      if (elem.hasClass('is--open')) {
        return elem.removeClass('is--open');
      } else {
        return elem.addClass('is--open');
      }
    });
  };

  miniCartCtrl = function(_, $state, $window, i18nService, systemConstants, CartService, DisplayActionDataService, ActionHandlerService, ConfigurationDataService) {
    var nsPrefix = systemConstants.nsPrefix;
    var activate, miniCart;
    miniCart = this;
    miniCart.labels = i18nService.CustomLabel;

    activate = function() {
      return CartService.getCartLineItems().then(function(lineItems) {
        miniCart.cart = lineItems;
        return miniCart.syncCartTotal();
      });
    };
    activate();
    miniCart.removeFromCart = function(lineItem) {
      return CartService.removeFromCart(lineItem);
    };
    miniCart.getProductName = function (lineItem) {
      return lineItem.lineItemSO[nsPrefix + 'ProductId__r'].Name;
    };
    miniCart.getProductSubtitle = function (lineItem) {
      return lineItem.lineItemSO[nsPrefix + 'ProductId__r'].Family;
    };
    miniCart.getLineItemPrice = function (lineItem) {
      return lineItem.chargeLines[0].lineItemSO[nsPrefix + 'NetPrice__c'];
    };
    miniCart.getIsItemConfigurable = function (lineItem) {
      var primaryChargeLine = lineItem.chargeLines[0].lineItemSO;
      return primaryChargeLine[nsPrefix + 'HasAttributes__c'] || primaryChargeLine[nsPrefix + 'HasOptions__c'];
    };
    miniCart.syncCartTotal = function() {
      return CartService.getCartTotalsDisplayData().then(function(totals) {
        miniCart.totals = totals;
        if(totals.length == 0) {
          miniCart.grandTotalNetPrice = '';
        } else {
          _.each(miniCart.totals, function(total) {
            if(total.summaryGroupSO[nsPrefix + 'LineType__c'] === 'Grand Total') {
              miniCart.grandTotalNetPrice = total.summaryGroupSO[nsPrefix + 'NetPrice__c'];
            }
          });  
        }
      });  
    };
  
    miniCart.gotoCart = function() {
      if ($state.is('assets') && 
          ConfigurationDataService.CartPageUrl !== undefined && 
          ConfigurationDataService.CartPageUrl !== null) 
      {
        $window.location.assign(ConfigurationDataService.CartPageUrl);
      } else {
        $state.go('cart');
      }
    }

    miniCart.finalizeCart = function() {
      if(!DisplayActionDataService.finalizeActionInfo) {
        return;
      }

      ActionHandlerService.performAction(DisplayActionDataService.finalizeActionInfo).then(function (response) {
        if (!response) {
          return;

        }
        if (response.targetType == "state") {
          $state.go(response.path);

        } else if (response.targetType == "page" && response.path != null) {
          window.location = response.path;

        }
      });
    };
  };

  miniCartCtrl.$inject = [
    'lodash', 
    '$state',
    '$window', 
    'aptBase.i18nService',
    'systemConstants', 
    'CartService', 
    'DisplayActionDataService', 
    'ActionHandlerService',
    'ConfigurationDataService'
  ];

  MiniCart = function(systemConstants) {

    var directive;
    directive = {
      link: miniCartLink,
      controller: miniCartCtrl,
      controllerAs: 'miniCart',
      bindToController: true
    };
    return directive;
  };

  angular.module('aptCPQUI').directive('miniCart', MiniCart);

}).call(this);
