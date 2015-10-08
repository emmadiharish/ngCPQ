/**
 * Directive: globalHeader
 * 
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('globalHeader', GlobalHeader);

	GlobalHeader.$inject = ['systemConstants'];

	function GlobalHeader(systemConstants) {
		return {
			controller: HeaderCtrl,
			controllerAs: 'header',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + "/templates/directives/common/global-header.html"
		};
	};

	HeaderCtrl.$inject = ['systemConstants', 'CartService', 'ActionHandlerService'];

	function HeaderCtrl(systemConstants, CartService, ActionHandlerService) {
		var nsPrefix = systemConstants.nsPrefix;

		CartService.getCartHeader().then((function(_this) {
			return function(headerData) {
				return _this.headerData = headerData;
			};
		})(this));

		this.customerName = function() {
			var ref, ref1;
			return (ref = this.headerData) != null ? (ref1 = ref[nsPrefix + 'AccountId__r']) != null ? ref1.Name : void 0 : void 0;
		};

		this.opportunityName = function() {
			return void 0;
		};

		this.opportunityID = function() {
			return void 0;
		};

		this.businessObjectType = function() {
			var ref;
			return (ref = this.headerData) != null ? ref[nsPrefix + 'BusinessObjectType__c'] : void 0;
		};

		this.abandonCart = function() {
			ActionHandlerService.abandonCart();
		};

		this.showHelp = function() {
			ActionHandlerService.showHelp();
		};

	};


}).call(this);
