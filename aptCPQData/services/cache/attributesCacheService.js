;(function() {
	angular.module('aptCPQData')
		.service('AttributesCache', AttributesCache);

	function AttributesCache() {
		var cache = this;

		var productToAttributeGroupsMap, lineItemToAttributeValueMap, attributeFields, attributeRules;

		cache.putAttributeGroupsForProduct = putAttributeGroupsForProduct;
		cache.getAttributeGroupsForProduct = getAttributeGroupsForProduct;
		cache.putAttributeFields = putAttributeFields;
		cache.getAttributeFields = getAttributeFields;
		cache.getAttributeValueSOForLineItem = getAttributeValueSOForLineItem;
		cache.putAttributeValueSOForLineItem = putAttributeValueSOForLineItem;
		cache.getAttributeRules = getAttributeRules;
		cache.putAttributeRules = putAttributeRules;
		init();

		function init() {
			resetAttributes();

		}

	    /**
		 * reset attributes
		 */
		function resetAttributes() {
			cache.isValid = false;
			productToAttributeGroupsMap = {};
			lineItemToAttributeValueMap = {};
			attributeRules = {};

		}

	    /**
		 * update attribute groups for product
		 */
		function putAttributeGroupsForProduct(productId, AttributeGroups) {
			if(!productId) {
				return;
			}

			productToAttributeGroupsMap[productId] = AttributeGroups;
			

		}

		/**
		 * get attribute groups for product
	     */
		function getAttributeGroupsForProduct(productId) {
			if(!productId) {
				return null;

			}

			if(productToAttributeGroupsMap[productId]) {
				return null;

			}

			return productToAttributeGroupsMap[productId];

		}

		/**
		 * update attribute fields
		 */
		function putAttributeFields(newAttributeFields) {
			if(!newAttributeFields) {
				return;
			
			}

			attributeFields = newAttributeFields;
			cache.isValid = true;

		}

		/**
		 * get attribute fields
		 */ 
		function getAttributeFields() {
			if(!attributeFields || !cache.isValid) {
			 return null;

			}
			return attributeFields;

		}

		/**
		 * update attribute rules for specified productID
		 * @param productID ID of product to update rules		 
		 */ 
		function putAttributeRules(productID, newRules) {
			if(!productID || !newRules) {
				return;			
			}

			attributeRules[productID] = newRules;
			cache.isValid = true;
		}

		/**
		 * get rules for given product
		 * @param productID ID of product to fetch rules
		 * @return the rules for product, null if none defined
		 */ 
		function getAttributeRules(productID) {
			return typeof(attributeRules) === 'undefined' ? attributeRules : attributeRules[productID];
		}

		/**
		 * get attribute value record for lineItem
		 */
		function getAttributeValueSOForLineItem(lineItemId) {

			if(!lineItemId) {
				return null;
			}

			if(!lineItemToAttributeValueMap[lineItemId]) {
				return null;
			}

			return lineItemToAttributeValueMap[lineItemId];

		}

		/**
		 * update attribute value record for lineItem
		 */
		function putAttributeValueSOForLineItem(lineItemId, attributeValueRecord) {

			if(!lineItemId) {
				return  null;
			}

			lineItemToAttributeValueMap[lineItemId] = attributeValueRecord;
			
		}

	}

})();