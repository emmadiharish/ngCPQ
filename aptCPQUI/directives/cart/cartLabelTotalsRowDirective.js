(function() {
  var CartLabelTotals, CartLabelTotalsCtrl;

  CartLabelTotalsCtrl = function(CartService) {
    var vm;
    vm = this;
    return CartService.getCartTotalSummaryColumns().then(function(res) {
      return vm.displayColumns = res;
    });
  };

  CartLabelTotalsCtrl.$inject = ['CartService'];

  CartLabelTotals = function(systemConstants) {
    var directive;
    directive = {
      scope: {
        item: '='
      },
      templateUrl: systemConstants.baseUrl + '/templates/directives/cart-label-total-row.html',
      controller: CartLabelTotalsCtrl,
      controllerAs: 'cartLabelTotals',
      bindToController: true
    };
    return directive;
  };

  CartLabelTotals.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('cartLabelTotals', CartLabelTotals);

}).call(this);
