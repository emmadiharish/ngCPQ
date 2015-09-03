;(function() {
	angular.module('aptCPQData')
		.service('AttributeDataService', AttributeDataService); 
			
	AttributeDataService.$inject = [
		'$q',
		'$log',
		'systemConstants',
		'aptBase.RemoteService',
		'ConfigurationDataService',
		'CatalogCache',
		'CartDataService',
		'AttributesCache'
	 ];

	function AttributeDataService($q, $log, systemConstants, RemoteService, ConfigurationDataService, CatalogCache, CartDataService , AttributesCache) {
		var service = this;
		var nsPrefix = systemConstants.nsPrefix;
		var attributeGroupsPromises = {};

		service.getAttributeGroups = getAttributeGroups;
		service.getAttributeValueSO = getAttributeValueSO;
		service.getAttributeFields = getAttributeFields;
		service.newAttributeValueSO = newAttributeValueSO;
		service.getAttributeRules = getAttributeRules;

		/**
		 * get attribute groups for given productId
		 */
		function getAttributeGroups(productId) {
			var cachedAttributeGroups = AttributesCache.getAttributeGroupsForProduct(productId);
			
			if (cachedAttributeGroups) {
				return $q.when(cachedAttributeGroups);
				
			} else if (attributeGroupsPromises[productId]) {
				return attributeGroupsPromises[productId];

			}

			var includeParams = ["attributeGroups"];

			//TODO: generalize creating this request.
			var product  = {
				"Id": productId,
			};
			product[nsPrefix + 'HasAttributes__c'] = true;
			product[nsPrefix + 'HasOptions__c'] = true;
			var products = [product];

			var requestPromise = ConfigurationDataService.createCatalogRequestDO(null, null, null, includeParams, products).then(function(attributeGroupRequest) {
				return RemoteService.getProductDetails(attributeGroupRequest);	
			});
			
			attributeGroupsPromises[productId] = requestPromise.then(function(response) {
				AttributesCache.putAttributeGroupsForProduct(productId, response.attributeGroups[productId]);
				return response.attributeGroups[productId];

			});
			return attributeGroupsPromises[productId];

		}

		/**
		 * get attribute value so for given lineItemId
		 */
		function getAttributeValueSO(txnPrimaryLineNumber) {
			return CartDataService.getLineItemDetails(txnPrimaryLineNumber).then(function (lineItem) {
				var primaryLineSO = lineItem.chargeLines[0].lineItemSO;
				if (!primaryLineSO[nsPrefix + 'AttributeValueId__r']) {
					$log.debug('Making new ASO');
					return newAttributeValueSO(primaryLineSO[nsPrefix + 'ProductId__c']).then(function (valueSO) {
						primaryLineSO[nsPrefix + 'AttributeValueId__r'] = valueSO;
						return valueSO;

					});

				}
				return primaryLineSO[nsPrefix + 'AttributeValueId__r'];

			});

		}

		/**
		 * get attribute fields
		 */
		function getAttributeFields() {
			var attributeFields = AttributesCache.getAttributeFields();
			
			if(attributeFields) {
				return $q.when(attributeFields);
				
			}
		
			var includeParams = ["attributeFields"];
			
			var requestPromise = ConfigurationDataService.createCatalogRequestDO(null, null, null, includeParams, null).then(function(attributeFieldRequest){
				return RemoteService.getConfigurationData(attributeFieldRequest);	
			});
			
			return requestPromise.then(function(response) {
				AttributesCache.putAttributeFields(response.attributeFields);
				return response.attributeFields;

			});

		}

		/**
		 * upsert Attribute Value SO for the given Line Item. 
		 */ 
		function upsertAttributesValueSO(lineItemId, attributeSO) {
			// if(!attributeSO[nsPrefix + 'LineItemId__c']) {
			// 		attributeSO[nsPrefix + 'LineItemId__c'] = luineItemId;
	 
			// }

			// var lineItemDO = LineItemCache.getLineItem(lineItemId); // Use Cart Service to get the lineItemDO
			// lineItemDO.attributeValueSO = attributeSO;
				 
			// var lineItems = [];
			// lineItems.push(lineItemDO);
			// var updateAttributesRequest = ConfigurationDataService.createCartRequestDO(lineItems, false, false, null);
				 
			// var requestPromise = RemoteService.upsertAttributesConfiguration(updateAttributesRequest);
			// return requestPromise.then(function(response) {
			// 	var valueSO = response[0].attributeValueSO;
			// 	AttributesCache.putAttributeValueSOForLineItem(lineItemId, valueSO); // update attributes in lineItemCache
		
			// 	return response;
						 
			// });
		}

		/**
		 * Create an attrbiute value SO for a given product. Just a template,
		 * 	could cache and copy to save time looping.
		 * 	
		 * @param  {[type]} productId [description]
		 * @return {[type]}           [description]
		 */
		function newAttributeValueSO(productId) {
			var newSO = {};
			return getAttributeGroups(productId).then(function	(groups) {
				var nextGroup, nextAttr;
				for (var groupIndex = groups.length - 1; groupIndex >= 0; groupIndex--) {
					nextGroup = groups[groupIndex];
					for (var attrIndex = nextGroup[nsPrefix + 'Attributes__r'].length - 1; attrIndex >= 0; attrIndex--) {
						nextAttr = nextGroup[nsPrefix + 'Attributes__r'][attrIndex];
						newSO[nextAttr[nsPrefix + 'Field__c']] = undefined;

					}

				}
				return newSO;
			});
			
		}

		function getAttributeRules(productId) {
			var rulesForProduct = AttributesCache.getAttributeRules(productId);
			if(typeof(rulesForProduct) !== 'undefined') {
				return $q.when(rulesForProduct);				
			}

			var requestPromise = RemoteService.getAttributeRules(productId);
			return requestPromise.then(function(response) {				
				AttributesCache.putAttributeRules(productId, response);
				return response;

			});
		}
	}

	

})();