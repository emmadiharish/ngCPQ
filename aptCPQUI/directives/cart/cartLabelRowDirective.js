/**
 * Directive: 
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').directive('cartLabelField', CartLabel);

	function CartLabel() {
		return {
			link: cartLabelLink
		};
	};

	function cartLabelLink(scope, elem, attr) {
		var cart, header, globalHeader;
		function scrollHandler() {
			header = header || document.querySelector('.cart-header');
			cart = cart || document.querySelector('.main-cart-wrapper');
			globalHeader = globalHeader || document.querySelector('.header-global');
			if (cart && header && angular.element(cart).hasClass('main-cart-wrapper--header-fixed')) {
				// 26 is gap between process trail and main cart 
				var newTop = - cart.getBoundingClientRect().top - Math.ceil(globalHeader.getBoundingClientRect().height) - 26 + 'px';
				elem.css({
					'top': newTop
				});
			} else {
				elem.css({
					'top': '0'
				});
			}
		};
		
		return window.addEventListener('scroll', scrollHandler);
		
	};


}).call(this);
