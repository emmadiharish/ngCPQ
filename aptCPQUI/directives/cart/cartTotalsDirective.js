(function() {
  var CartTotals, cartTotalsCtrl;

  cartTotalsCtrl = function(CartService, $q) {
    var activate, vm;
    vm = this;
    vm.getSummaryItem = function(key) {
      if (vm.item.summaryGroupSO[key]) {
        return vm.item.summaryGroupSO[key];
      } else {

      }
    };
    vm.isFieldEditable = function(lineTotal, column) {
      return column.IsEditable && lineTotal.readOnlyFields.indexOf(column.FieldName) <  0;
      
    };
    activate = function() {
      return $q.all([CartService.getCartTotalSummaryColumns(), CartService.getCartTotalsDisplayData()]).then(function(res) {
        vm.totalColumns = res[0];
        return vm.totals = res[1];
      });
    };
    return activate();
  };

  cartTotalsCtrl.$inject = ['CartService', '$q'];

  CartTotals = function(systemConstants) {
    var directive;
    directive = {
      templateUrl: systemConstants.baseUrl + '/templates/directives/cart-totals-table.html',
      controller: cartTotalsCtrl,
      controllerAs: 'cartTotals',
      bindToController: true
    };
    return directive;
  };

  CartTotals.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('cartTotals', CartTotals);

}).call(this);
