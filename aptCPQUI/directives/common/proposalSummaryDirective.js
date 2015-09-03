/**
 * Directive: proposalSummary
 * 	defines directive and controller for proposal summary
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').directive('proposalSummary', ProposalSummary);

	ProposalSummaryCtrl.$inject = ['systemConstants', 'CartService'];
	function ProposalSummaryCtrl(systemConstants, CartService) {
		var nsPrefix = systemConstants.nsPrefix;
		var ctrl = this;
		
		ctrl.customerName = function() {
			if (angular.isDefined(ctrl.headerData) && angular.isDefined(ctrl.headerData.cartSO)) {
				var acct = ctrl.headerData.cartSO[nsPrefix + 'AccountId__r'];
				if(angular.isDefined(ctrl.headerData)){
					return acct.Name;
				}
				
			} else {
				return void 0;
				
			}
		};
		
		ctrl.opportunityName = function() {
			return void 0; //TBD
		};
		
		ctrl.proposalName = function() {
			if (angular.isDefined(ctrl.headerData) && angular.isDefined(ctrl.headerData.bizObject)) {
				return ctrl.headerData.bizObject.Name;
				
			} else {
				return void 0;
				
			}
		};
		
		ctrl.businessObjectType = function() {
			if (angular.isDefined(ctrl.headerData) && angular.isDefined(ctrl.headerData.cartSO)) {
				return ctrl.headerData.cartSO[nsPrefix + 'BusinessObjectType__c'];
				
			} else {
				return void 0;
				
			}
			
		};
		
		ctrl.tabTitle = function() {
			return (ctrl.businessObjectType()) + " " + (ctrl.proposalName());
		};
		
		//initialize
		CartService.getCartHeader().then(function(headerData) {
			ctrl.headerData = headerData;
			//get html from min-page layout
			CartService.getQuoteSummary(ctrl.headerData.cartSO[nsPrefix + 'BusinessObjectId__c']).then(function(quoteData) {
				ctrl.quoteData = quoteData;
				
			});

		});
		
		return ctrl;
		
	}

	ProposalSummary.$inject = ['systemConstants'];
	function ProposalSummary(systemConstants) {
		
		//link function
		function ProposalSummaryLink(scope, elem, attrs, ctrl) {
			var dropdown = elem[0].querySelector('.proposal-summary__display');
			var clickOutside = document.querySelector('html');
			var proposal = elem[0].querySelector('.proposal-summary__proposal');
			
			scope.$watch('proposal.quoteData', (function(_this) {
				return function(html) {
					return angular.element(proposal).html(html);
				};
			})(this));
			
			clickOutside.addEventListener('click', function() {
				return elem.removeClass('is--open');
			});
			
			elem[0].addEventListener('click', function(e) {
				return e.stopPropagation();
			});
			
			return dropdown.addEventListener('click', function(e) {
				if (elem.hasClass('is--open')) {
					return elem.removeClass('is--open');
				} else {
					return elem.addClass('is--open');
				}
			});
		};
		
		//directive definition
		return {
			bindToController: true,
			controller: ProposalSummaryCtrl,
			controllerAs: 'proposal',
			restrict: 'AE',
			link: ProposalSummaryLink,
			templateUrl: systemConstants.baseUrl + "/templates/directives/proposal-summary.html"
		};
	}

}).call(this);
