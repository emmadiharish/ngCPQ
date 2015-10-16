;(function() {
	angular.module('aptCPQData')
		.service('AttributesCache', AttributesCache);

	function AttributesCache() {
		var cache = this;

		var productToAttributeGroupsMap, lineItemToAttributeValueMap, attributeFields, attributeRules;
		
		cache.putAttributeGroupsForProduct = putAttributeGroupsForProduct;
		cache.getAttributeGroupsForProduct = getAttributeGroupsForProduct;
		cache.getAttributeGroup = getAttributeGroup;
		cache.putAttributeFields = putAttributeFields;
		cache.getAttributeFields = getAttributeFields;
		cache.getAttributeValueSOForLineItem = getAttributeValueSOForLineItem;
		cache.putAttributeValueSOForLineItem = putAttributeValueSOForLineItem;
		cache.getAttributeRulesForProduct = getAttributeRulesForProduct;
		cache.getAttributeDefaultRules = getAttributeDefaultRules;
		cache.putAttributeRules = putAttributeRules;
		cache.putAttributeRulesForProduct = putAttributeRulesForProduct;		
		cache.getAttributeMatricesForProduct = getAttributeMatricesForProduct;
		cache.putAttributeMatrices = putAttributeMatrices;
		cache.putAttributeMatricesForProduct = putAttributeMatricesForProduct;

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
			attributeGroupsById = {};
			lineItemToAttributeValueMap = {};
			attributeRules = {};
			attributeDefaultRules = {};
			attributeMatrices = {};

		}

	    /**
		 * update attribute groups for product
		 */
		function putAttributeGroupsForProduct(productId, AttributeGroups) {
			if (!productId) {
				return;
			}

			productToAttributeGroupsMap[productId] = AttributeGroups;			
			for(var i = 0, groupLen = AttributeGroups.length; i < groupLen; i++) {
				var group = AttributeGroups[i];
				attributeGroupsById[group.Id] = group;				
			}
		}

		/**
		 * get attributes for the product
	     */
		function getAttributeGroup(groupId) {
			if (!attributeGroupsById[groupId]) {
				return null;

			}
			return attributeGroupsById[groupId];

		}

		/**
		 * get attribute groups for product
	     */
		function getAttributeGroupsForProduct(productId) {
			if (!productToAttributeGroupsMap[productId]) {
				return null;

			}
			return productToAttributeGroupsMap[productId];

		}

		/**
		 * update attribute fields
		 */
		function putAttributeFields(newAttributeFields) {
			if (!newAttributeFields) {
				return;
			
			}

			attributeFields = newAttributeFields;
			cache.isValid = true;

		}

		/**
		 * get attribute fields
		 */ 
		function getAttributeFields() {
			if (!attributeFields || !cache.isValid) {
			 return null;

			}
			return attributeFields;

		}

		/**
		 * update attribute rules with given map specs
		 * @param newRules map of product attribute rules by product id
		 */ 
		function putAttributeRules(newRules) {
			if(!newRules) {
				return;

			}

			for(productId in newRules) {
				if(newRules.hasOwnProperty(productId)) {
					putAttributeRulesForProduct(productId, newRules[productId]);
				}
			}
		}

		/**
		 * update attribute rules for specified productId
		 * @param productId ID of product to update rules		 
		 */ 
		function putAttributeRulesForProduct(productId, newRules) {
			if (!productId || !newRules) {
				return;		

			}

			attributeRules[productId] = newRules;
			cache.isValid = true;		
		}

		/**
		 * get default value attribute rules		 
		 * @return the default value rules by product id
		 */ 
		function getAttributeDefaultRules() {		
			return cache.isValid ? attributeDefaultRules : undefined;

		}

		/**
		 * get rules for given product
		 * @param productId ID of product to fetch rules
		 * @return the rules for product, null if none defined
		 */ 
		function getAttributeRulesForProduct(productId) {
			if (!attributeRules[productId]) {
				return null;

			}
			return attributeRules[productId];

		}

		/**
		 * update matrices in the cache
		 * @param newMatrices map of product matrices rules by primary product id
		 */ 
		function putAttributeMatrices(newMatrices) {
			if(!newMatrices) {
				return;

			}

			for(productId in newMatrices) {
				if(newMatrices.hasOwnProperty(productId)) {
					putAttributeMatricesForProduct(productId, newMatrices[productId]);
				}
			}
		}

		/**
		 * get rules for given product
		 * @param productId the context product id
		 * @return the matrices for line, null if none defined
		 */ 
		function getAttributeMatricesForProduct(productId) {
			if (!attributeMatrices[productId]) {
				return null;

			}
			return attributeMatrices[productId];

		}

		/**
		 * update attribute matrices for the specific product
		 * @param productId the context product id
		 * @param newMatrices the new matrices
		 */ 
		function putAttributeMatricesForProduct(productId, newMatrices) {
			if (!productId || !newMatrices) {
				return;

			}

			attributeMatrices[productId] = newMatrices;
			cache.isValid = true;		
		}

		/**
		 * get attribute value record for lineItem
		 */
		function getAttributeValueSOForLineItem(lineItemId) {

			if (!lineItemId) {
				return null;
			}

			if (!lineItemToAttributeValueMap[lineItemId]) {
				return null;
			}

			return lineItemToAttributeValueMap[lineItemId];

		}

		/**
		 * update attribute value record for lineItem
		 */
		function putAttributeValueSOForLineItem(lineItemId, attributeValueRecord) {

			if (!lineItemId) {
				return  null;
			}

			lineItemToAttributeValueMap[lineItemId] = attributeValueRecord;
			
		}

	}

})();