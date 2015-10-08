/**
 * Directive: cartTotals
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('cartTotals', CartTotals);

	CartTotals.$inject = ['systemConstants'];

	function CartTotals(systemConstants) {
		return {
			controller: CartTotalsCtrl,
			controllerAs: 'cartTotals',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + '/templates/directives/cart/cart-totals-table.html'
		};

	};

	CartTotalsCtrl.$inject = ['CartService', '$q'];

	function CartTotalsCtrl(CartService, $q) {
		var ctrl = this;
		ctrl.getSummaryItem = function(key) {
			if (ctrl.item.summaryGroupSO[key]) {
				return ctrl.item.summaryGroupSO[key];
			} else {

			}
		};
		ctrl.isFieldEditable = function(lineTotal, column) {
			if(angular.isUndefined(lineTotal)) {
				return false;
			}
			return column.IsEditable && lineTotal.readOnlyFields.indexOf(column.FieldName) <  0;

		};

		function activate() {
			return $q.all([CartService.getCartTotalSummaryColumns(), CartService.getCartTotalLines()]).then(function(res) {
				ctrl.totalColumns = res[0];
				return ctrl.totals = res[1];
			});
		};
		return activate();
	};


}).call(this);