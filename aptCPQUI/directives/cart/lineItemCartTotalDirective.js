/**
 * Directive : 
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('lineItemCartTotal', LineItemCartTotal);

	LineItemCartTotal.$inject = ['systemConstants'];

	function LineItemCartTotal(systemConstants) {
		return {
			scope: {
				item: '='
			},
			controller: LineItemCartTotalCtrl,
			controllerAs: 'lineItemCartTotal',
			bindToController: true,
			link: lineItemCartTotalLink,
			templateUrl: systemConstants.baseUrl + '/templates/directives/cart/cart-line-item-total.html'
		};
	};

	function lineItemCartTotalLink(scope, elem, attrs) {
		var lineItem = elem[0];
	};

	LineItemCartTotalCtrl.$inject = ['CartService', 'aptBase.i18nService', '$compile'];

	function LineItemCartTotalCtrl(CartService) {
		var ctrl = this;
		ctrl.getSummaryItem = function(key) {
			if (ctrl.item.summaryGroupSO[key]) {
				return ctrl.item.summaryGroupSO[key];
			} else {

			}
		};
		return CartService.getCartTotalSummaryColumns().then(function(res) {
			return ctrl.displayColumns = res;
		});
	};


}).call(this);
