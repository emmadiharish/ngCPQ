/**
 *  Apttus Config & Pricing
 *  Attribute Groups
 *   
 *  @2015-2016 Apttus Inc. All rights reserved.
 *
 * This directive is responsible for correctly displaying
 * the attribute groups for a line item
 * 
 */
(function() {
	angular.module('aptCPQUI')
		.directive('attributeGroups', AttributeGroups);

	AttributeGroups.$inject = ['systemConstants'];	
	function AttributeGroups(systemConstants) {
		return {
			scope: {
				lineItem: '=',
				
			},
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/attribute-groups.html",			
			bindToController: false,
			restrict: 'E'
		};
	}
})();
