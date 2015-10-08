/**
 * Directive: cartLabelTotals
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('cartLabelTotals', CartLabelTotals);

	CartLabelTotals.$inject = ['systemConstants'];

	function CartLabelTotals(systemConstants) {
		return {
			scope: {
				item: '='
			},
			controller: CartLabelTotalsCtrl,
			controllerAs: 'cartLabelTotals',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + '/templates/directives/cart/cart-label-total-row.html'
		};
	};

	CartLabelTotalsCtrl.$inject = ['CartService'];

	function CartLabelTotalsCtrl(CartService) {
		var vm;
		vm = this;
		return CartService.getCartTotalSummaryColumns().then(function(res) {
			return vm.displayColumns = res;
		});
	};

}).call(this);
