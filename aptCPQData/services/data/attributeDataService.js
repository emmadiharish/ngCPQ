;(function() {
	angular.module('aptCPQData')
		.service('AttributeDataService', AttributeDataService); 
			
	AttributeDataService.$inject = [
		'$q',
		'$log',
		'systemConstants',
		'aptBase.RemoteService',
		'ConfigurationDataService',
		'AttributesCache'
	 ];

	function AttributeDataService($q, $log, systemConstants, RemoteService, ConfigurationDataService, AttributesCache) {
		var service = this;
		var nsPrefix = systemConstants.nsPrefix;

		/** Storing attribute requests */
		var outstandingInfoRequest = $q.when(true);
		var pendingProducts = [];
		var pendingProductIds = {};
		//Groups
		var attributeGroupPromises = {};
		//Rules
		var attributeRulePromises = {};
		//Matrices
		var attributeMatrixPromisses = {};
		//Fields
		var attributeFieldRequest;

		/** Attach service methods */
		service.getAttributeFields = getAttributeFields;
		service.getAttributeGroups = getAttributeGroups;
		service.getAttributeRules = getAttributeRules;
		service.getAttributeMatricesForProduct = getAttributeMatricesForProduct;
		service.newAttributeValueSO = newAttributeValueSO;
		// service.getAttributeValueSO = getAttributeValueSO;


		/** -- Method declarations -- */

		function queueProductIdForRequest(productId) {
			if (!productId || pendingProductIds[productId]) {
				return;

			}
			var product  = {
				"Id": productId,
			};
			product[nsPrefix + 'HasAttributes__c'] = true;
			// product[nsPrefix + 'HasOptions__c'] = true;
			pendingProducts.push(product);
			pendingProductIds[productId] = true;

		}

		function getProductsQueuedForRequest() {
			var queued = pendingProducts;
			pendingProductIds = {};
			pendingProducts = [];
			return queued;

		}

		function getAttributeInfo() {
			if (!pendingProducts || pendingProducts.length === 0) {
				return outstandingInfoRequest;

			}
			var newOutstandingRequest = outstandingInfoRequest.then(function (previousResult) {
				var includeParams = ["attributeGroups", "attributeRules", "attributeMatrices"];
				var requestProducts = getProductsQueuedForRequest();
				if (requestProducts.length === 0) {
					//Already handled -- don't submit;
					return previousResult;

				}
				var requestPromise = ConfigurationDataService.createCatalogRequestDO(null, null, null, includeParams, requestProducts).then(function (attributeRequest) {
					return RemoteService.getProductDetails(attributeRequest);	
				
				});
				return requestPromise.then(function (response) {
					for (var productIndex = requestProducts.length - 1; productIndex >= 0; productIndex--) {
						var nextId = requestProducts[productIndex].Id;
						AttributesCache.putAttributeGroupsForProduct(nextId, response.attributeGroups[nextId]);
						AttributesCache.putAttributeRulesForProduct(nextId, response.attributeRules[nextId]);	
						AttributesCache.putAttributeMatricesForProduct(nextId, response.attributeMatrices[nextId]);						
					}

					return response;
				});

			});
			outstandingInfoRequest = newOutstandingRequest;
			return outstandingInfoRequest;

		}

		/**
		 * Get attribute groups for given productId.
		 * Improvment: accumulate product Ids and submit request with 
		 * 	multiple products
		 */
		function getAttributeGroups(productId) {
			var cachedAttributeGroups = AttributesCache.getAttributeGroupsForProduct(productId);
			
			if (cachedAttributeGroups) {
				return $q.when(cachedAttributeGroups);
				
			} else if (attributeGroupPromises[productId]) {
				return attributeGroupPromises[productId];

			}
			queueProductIdForRequest(productId);
			var infoPromise = getAttributeInfo();
			attributeGroupPromises[productId] = infoPromise.then(function () {
				return AttributesCache.getAttributeGroupsForProduct(productId);
				
			});
			return attributeGroupPromises[productId];

		}

		/**
		 * get attribute fields
		 */
		function getAttributeFields() {
			var attributeFields = AttributesCache.getAttributeFields();
			if(attributeFields) {
				return $q.when(attributeFields);
				
			} else if (attributeFieldRequest) {
				return attributeFieldRequest;

			}
		
			var includeParams = ["attributeFields"];
			var requestPromise = ConfigurationDataService.createCatalogRequestDO(null, null, null, includeParams, null).then(function(requestDO) {
				return RemoteService.getConfigurationData(requestDO);

			});
			
			attributeFieldRequest = requestPromise.then(function(response) {
				AttributesCache.putAttributeFields(response.attributeFields);
				return response.attributeFields;

			});
			return attributeFieldRequest;

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

		/**
		 * Get attribute rules for the given product Id
		 * @param productId
		 * @return a promise which will resolve to an array of rules for the product
		 */
		function getAttributeRules(productId) {
			var cachedAttributeRules = AttributesCache.getAttributeRulesForProduct(productId);
			if (cachedAttributeRules) {
				return $q.when(cachedAttributeRules);
				
			} else if (attributeRulePromises[productId]) {
				return attributeRulePromises[productId];

			}

			queueProductIdForRequest(productId);
			var infoPromise = getAttributeInfo();
			attributeRulePromises[productId] = infoPromise.then(function () {
				return AttributesCache.getAttributeRulesForProduct(productId);
				
			});
			return attributeRulePromises[productId];

		}

		/**
		 * Get attribute matrices for the given product
		 * @param productId the context product id
		 * @return a promise which will resolve to an array of matrix infos for the product
		 */
		function getAttributeMatricesForProduct(productId) {
			var cachedMatrices = AttributesCache.getAttributeMatricesForProduct(productId);
			if (cachedMatrices) {
				return $q.when(cachedMatrices);
				
			} else if (attributeMatrixPromisses[productId]) {
				return attributeMatrixPromisses[productId];

			}

			queueProductIdForRequest(productId);
			var infoPromise = getAttributeInfo();
			attributeMatrixPromisses[productId] = infoPromise.then(function () {
				return AttributesCache.getAttributeMatricesForProduct(productId);
				
			});
			return attributeMatrixPromisses[productId];
		}
	}

})();