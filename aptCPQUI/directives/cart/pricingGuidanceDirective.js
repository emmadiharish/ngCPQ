/**
* Directive: PricingGuidance
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('pricingGuidance', PricingGuidance);

	PricingGuidance.$inject = ['systemConstants'];

	function PricingGuidance(systemConstants) {
		var directive = {
				restrict: 'E',
				scope: {
					chargeLine: '=',
					properties: '=?'
				},
				controller: PricingGuidanceCtrl,
				controllerAs: 'pricingGuidance',
				bindToController: true,
				link: pricingGuidanceLink,
				templateUrl: systemConstants.baseUrl + '/templates/directives/cart/pricing-guidance.html'
		};

		return directive;

	};

	PricingGuidanceCtrl.$inject = ['$log', 'systemConstants', 'CartService'];
	
	function PricingGuidanceCtrl($log, systemConstants, CartService) {
		var ctrl = this;
		var nsPrefix = systemConstants.nsPrefix;
		
		function init() {
			if (angular.isDefined(ctrl.chargeLine)) {
				var guidanceValue = ctrl.chargeLine.field(nsPrefix + "Guidance__c");// Todo: need constant service to get fields Name instead of hardcoading.
				var pricingGuidance = ctrl.chargeLine.field(nsPrefix + "PricingGuidance__c"); 

				ctrl.properties = (angular.isDefined(ctrl.properties)) ? ctrl.properties : {};			
				ctrl.guidance = (angular.isDefined(guidanceValue)) ? guidanceValue : "";
				ctrl.pricingGuidance = (angular.isDefined(pricingGuidance)) ? getJSONObject(pricingGuidance) : {};
			}
		}

		ctrl.getRatingCSSClass = function() {
			var ratingCSSPrefix = "guidance-";
			var ratingColor = (angular.isDefined(ctrl.guidance)) ? ctrl.guidance.toLowerCase() : "none";
			return ratingCSSPrefix + ratingColor;
		}

		ctrl.setPricingGuidance = function(domElem) {
			ctrl.pricingGuidance.guidanceBtnElement = domElem;
			CartService.setPricingGuidance(ctrl.pricingGuidance);
		}

		function getJSONObject(JSONString) {
			try {
				return JSON.parse(JSONString);
			} catch(e) {
				$log.error("Error while parsing Guidance JSON String : " + JSONString);
				return {};
			}
		}

		init();
	}

	function pricingGuidanceLink(scope, elem, attr, ctrl) {
		elem.on('click', function(e){
			ctrl.setPricingGuidance(this);
			e.stopPropagation();
			scope.$apply();
		});
	}

}).call(this);