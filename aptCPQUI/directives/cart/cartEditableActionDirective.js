/**
 * Directive: cartEditableAction
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('cartEditableAction', CartEditableAction);

	CartEditableAction.$inject = ['systemConstants'];

	function CartEditableAction(systemConstants) {
		return {
			restrict: 'AEC',
			controller: CartEditableActionCtrl,
			controllerAs: 'cartEditableAction',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + '/templates/directives/cart/cart-editable-action.html'
		};
	};

	CartEditableActionCtrl.$inject = ['CartService', 'aptBase.i18nService'];

	function CartEditableActionCtrl(CartService, i18nService) {
		return this.labels = i18nService.CustomLabel;
	};

})();
