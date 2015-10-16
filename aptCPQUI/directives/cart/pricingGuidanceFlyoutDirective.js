/**
 * Directive: PricingGuidanceFlyout
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('pricingGuidanceFlyout', PricingGuidanceFlyout);

	PricingGuidanceFlyout.$inject = ['systemConstants'];

	function PricingGuidanceFlyout(systemConstants) {
		var directive = {
				restrict: 'E',
				controller: PricingGuidanceFlyoutCtrl,
				controllerAs: 'pricingGuidance',
				bindToController: true,
				link: pricingGuidanceFlyoutLink,
				templateUrl: systemConstants.baseUrl + '/templates/directives/cart/pricing-guidance-flyout.html'
		};

		return directive;
	}

	PricingGuidanceFlyoutCtrl.$inject = [                           
	                                    '$log',
	                                    '$sce',
	                                    'systemConstants',
	                                    'aptBase.i18nService',
	                                    'CartService'
	                                    ];

	function PricingGuidanceFlyoutCtrl( $log, $sce, systemConstants, i18nService, CartService) {
		var nsPrefix = systemConstants.nsPrefix;
		var ctrl = this;
		ctrl.labels = i18nService.CustomLabel;
		ctrl.selectedGuidance = {};
		ctrl.visible = false;

		ctrl.close = function() {
			ctrl.visible = false;
			CartService.isPricingFlyoutOpen = false;

		};

		ctrl.open = function() {
			ctrl.selectedGuidance = CartService.selectedPricingGuidance;
			ctrl.visible = true;
			ctrl.setFlyoutPosition();
		};

		ctrl.isPricingFlyoutOpen = function() {
			return CartService.isPricingFlyoutOpen; 
		};

		ctrl.getDimensionLabels = function() {
			return ctrl.selectedGuidance.DimensionLabels;
		};

		ctrl.getRatingCSSClass = function(rating) {
			var ratingCSSPrefix = "guidance-";
			var ratingColor = (angular.isDefined(rating)) ? String(rating).toLowerCase() : "none";
			return ratingCSSPrefix + ratingColor;
		};

		ctrl.getItemRatingCSSClass = function(item) {
			if (item.IsItemRating == true) {
				var ratingCSSPrefix = "guidance-row-highlight-";
				var ratingColor = (angular.isDefined(item.Rating)) ? String(item.Rating).toLowerCase() : "none";
				return ratingCSSPrefix + ratingColor;
			} else {
				return "";
			}
		};

		ctrl.isPriceFromAboveMeasures = function(item) {
			return (item.MeasureType == 'HighLow' && item.PriceFrom == 99999);
		};

		ctrl.setFlyoutPosition = function() {
			var flyoutContainer = ctrl.flyoutElem.querySelectorAll("div.pricing-guidance-flyout");
			if (flyoutContainer.length > 0) {
				flyoutContainer = angular.element(flyoutContainer[0]);
				var clkBtnRect = (ctrl.selectedGuidance.guidanceBtnElement) ? ctrl.selectedGuidance.guidanceBtnElement.getBoundingClientRect() : null;
				if (clkBtnRect) {
					flyoutContainer.css("top", (clkBtnRect.top + clkBtnRect.height +  window.pageYOffset + 15) + "px");
					flyoutContainer.css("left", (clkBtnRect.left - 615) + "px"); // todo: Need to get Flyout width dynamically.
				}
				 
			}
		};

		return ctrl;

	}

	function pricingGuidanceFlyoutLink(scope, elem, attrs, ctrl) {
		ctrl.flyoutElem = elem;
		var clickOutside = document.querySelector('html');
		var scrollableGrid = document.querySelector("div.main-cart-container");

		clickOutside.addEventListener('click',closeFlyoutHandler);

		scrollableGrid.addEventListener('scroll', closeFlyoutHandler);

		scope.$watch(function () { 
						return ctrl.isPricingFlyoutOpen(); 
					},
					function(newVal, oldVal) {
						if (newVal === true) {
							ctrl.open();
						}
					});

		function closeFlyoutHandler(e) {
				//e.stopPropagation();
				ctrl.close();
				scope.$apply();
		}
	}


}).call(this);
