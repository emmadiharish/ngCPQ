/**
 * Directive : miniCart
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').directive('miniCart', MiniCart);

	function MiniCart(systemConstants) {
		return {
			link: miniCartLink,
			controller: MiniCartCtrl,
			controllerAs: 'miniCart',
			bindToController: true
		};
	};

	function miniCartLink(scope, elem, attrs, ctrl) {
		var dropdown = elem[0].querySelector('.mini-cart__display');
		var clickOutside = document.querySelector('html');
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

	MiniCartCtrl.$inject = [
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

	function MiniCartCtrl(_, $state, $window, i18nService, systemConstants, CartService, DisplayActionDataService, ActionHandlerService, ConfigurationDataService) {
		var miniCart = this;
		var nsPrefix = systemConstants.nsPrefix;

		miniCart.labels = i18nService.CustomLabel;
		miniCart.itemsPerPage = systemConstants.customSettings.catalogPageSettings.SelectedProductsPerPage;

		var activate = function() {
			return CartService.getCartLineItems().then(function(lineItems) {
				miniCart.cart = lineItems;
				return miniCart.syncCartTotal();
			});
		};
		activate();
		miniCart.removeFromCart = function(lineItem) {
			return CartService.removeFromCart(lineItem);
		};
		miniCart.syncCartTotal = function() {
			return CartService.getCartTotalLines().then(function(totals) {
				miniCart.totals = totals;
				if(totals.length === 0) {
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
		};

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

				} else if (response.path) {
					window.location = response.path;

				}
			});
		};
	};


}).call(this);
