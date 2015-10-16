/**
 *  Apttus Config & Pricing
 *  Attribute Group
 *   
 *  @2015-2016 Apttus Inc. All rights reserved.
 *
 * This directive is responsible for correctly displaying
 * an attribute group for a given line item
 * 
 */
(function() {
	angular.module('aptCPQUI')
		.directive('attributeGroup', AttributeGroup);

	AttributeGroup.$inject = ['systemConstants'];
	AttributeGroupCtrl.$inject = ['lodash', 'systemConstants'];

	function AttributeGroup(systemConstants) {
		return {
			scope: {
				lineItem: '=',
				attributeGroup: '=',
			},
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/attribute-group.html",
			controller: AttributeGroupCtrl,
			controllerAs: 'ctrl',
			bindToController: true,
			restrict: 'E'			
		};
	}

	function AttributeGroupCtrl(_, systemConstants) {
		var ctrl = this;
		var nsPrefix = systemConstants.nsPrefix;

	    /**
		 * Check if the attribute group has the Two Column Display
		 * flag checked
		 * @param attrGroup the id of the attribute group
		 * @return true if a two column display, false otherwise
		 */
		ctrl.isTwoColumn = function () {			
			return !!ctrl.attributeGroup[nsPrefix + 'TwoColumnAttributeDisplay__c'];
		};

		/**
		 * Get the attributes for the attribute group		 
		 * @param attrGroup the id of the attribute group
		 * @return the ProductAttribute__r objects for this attribute group
		 */
		ctrl.attrsForGroup = function () {
			return ctrl.attributeGroup[nsPrefix + 'Attributes__r'];

		};

		/**
		 * Get the attribute display information.
		 * @param attributeName the name of the attribute to check
		 * @return the attribute display properties used by dynamic field directive
		 */
		ctrl.attributeDisplayInfo = function(attribute) {					
			return ctrl.lineItem.getAttributeDisplayInfo(attribute.Id);
		}

		/**
		 * Return the APi name of the attribute
		 * @param attribute the ProductAttribute__c sObject
		 * @return attribute APi name.
		 */
		ctrl.attributeName = function (attribute) {			
			return attribute[nsPrefix+'Field__c'];

		};

		/**
		 * Check if the attribute is visible
		 * @param attribute the ProductAttribute__c sObject
		 * @return true if attribute visible, false otherwise
		 */
		ctrl.isVisible = function(attribute) {
			var attrDisplayInfo = ctrl.attributeDisplayInfo(attribute);			
			return attrDisplayInfo.IsVisible;
		};

		/**
		 * Check if the attribute requires a value
		 * @param attribute the ProductAttribute__c sObject
		 * @return true if attribute requires value, false otherwise
		 */
		ctrl.isRequired = function(attribute) {
			var attrDisplayInfo = ctrl.attributeDisplayInfo(attribute);		
			return attrDisplayInfo.IsRequired;
		};

		/**
		 * Get the attribute lanel info
		 * @param attribute the ProductAttribute__c sObject
		 * @return the label for the target attribute
		 */
		ctrl.attributeLabel = function(attribute) {
			var attrDisplayInfo = ctrl.attributeDisplayInfo(attribute);
			return attrDisplayInfo.Label;
		};

		/**
		 * Get the attribute inline help text info
		 * @param attribute the ProductAttribute__c sObject
		 * @return the inline text text for the target attribute
		 */
		ctrl.attributeHelp = function(attribute) {
			var attrDisplayInfo = ctrl.attributeDisplayInfo(attribute);
			return attrDisplayInfo.inlineHelpText;
		};
	}
})();
