;(function() {
	angular.module('aptCPQData')
		.service('OptionDataService', OptionDataService); 
			
	OptionDataService.$inject = [
		'$q',
		'$log',
		'systemConstants',
		'aptBase.RemoteService',
		'ConfigurationDataService',
		'OptionsCache'
	];

	function OptionDataService($q, $log, systemConstants, RemoteService, ConfigurationDataService, OptionsCache) {
		var service = this;
		var nsPrefix = systemConstants.nsPrefix;

		/** Storing option requests */
		var optionGroupPromises = {};
		var pendingProducts = [];
		var outstandingGroupRequest = $q.when(true);

		/** Attach service methods */		
		service.getOptionGroups = getOptionGroups;
		service.createOptionLineItemMap = createOptionLineItemMap;
		service.addOptionLineItem = addOptionLineItem;		
		
		/** -- Method declarations -- */

		function addOptionLineItem(lineItemDO, optionLineItemDO) {
			if(!angular.isArray(lineItemDO.optionLines)) {
				lineItemDO.optionLines = [];
			}

			lineItemDO.optionLines.push(optionLineItemDO);
		}


		/**
		 * get option groups for given productId
		 */
		function getOptionGroups(productId) {
			var cachedOptionGroups = OptionsCache.getOptionGroupsForProduct(productId);
			if(cachedOptionGroups) {
				return $q.when(cachedOptionGroups);

			} else if (optionGroupPromises[productId]) {
				return optionGroupPromises[productId];

			}
			
			
			var product  = {
				"Id": productId,
			};
			product[nsPrefix + 'HasOptions__c'] = true;
			product[nsPrefix + 'HasAttributes__c'] = true;
			pendingProducts.push(product);

			var newOutstandingRequest = outstandingGroupRequest.then(function (previousResult) {
				var includeParams = ["optionGroups"];
				var requestProducts = pendingProducts;
				pendingProducts = [];
				if (requestProducts.length === 0) {
					//Don't need a request.
					return previousResult;

				}
				var requestPromise = ConfigurationDataService.createCatalogRequestDO(null, null, null, includeParams, requestProducts).then(function (optionGroupRequest) {
					return RemoteService.getProductDetails(optionGroupRequest);	
				});
				
				return requestPromise.then(function (response) {
					for (var productIndex = requestProducts.length - 1; productIndex >= 0; productIndex--) {
						var nextId = requestProducts[productIndex].Id;
						OptionsCache.putOptionGroupsForProduct(nextId, response.optionGroups[nextId]);
						
					}

				});

			});

			outstandingGroupRequest = newOutstandingRequest;
			optionGroupPromises[productId] = outstandingGroupRequest.then(function () {
				return OptionsCache.getOptionGroupsForProduct(productId);
				
			});
			return optionGroupPromises[productId];

		}
		
		/**
		 * map with component id as key and line item as value
		 */
		function createOptionLineItemMap(componentLineItemMap, lineItemDO) {
			if(lineItemDO.hasOwnProperty('optionLines')) {
				mapComponentLines(componentLineItemMap, lineItemDO.optionLines);
			}
			
		}
		
		/**
		 * create a map of component id and line item 
		 */
		function mapComponentLines(componentLineItemMap, lineItemDOs) {
			for (var i=0; i<lineItemDOs.length; i++) {
				var lineItemDO = lineItemDOs[i];
				componentLineItemMap[lineItemDO.lineItemSO['ProductOptionId__c']] = lineItemDO; //use ns prefix
				if(lineItemDO.hasOwnProperty('optionLines')) {
					mapComponentLines(componentLineItemMap, lineItemDO.optionLines);
				}
			}
		}
		
		/**
		 * creates a cart request 
		 */
		function createCartRequest(lineItemDO){
			//delete lineItemDO.$$hashKey;
			return {
				"cartId": lineItemDO.lineItemSO.ConfigurationId__c,
				"lineItems": [angular.copy(lineItemDO)],
				"responseIncludes": [
					"cartLines",
					"optionLines",
					"chargeLines",
					"ruleActions"
				]
			};
			
		}

	}

})();