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
		var primaryNumber = 10000;
		var optionGroupPromises = {};
		
		service.getOptionGroups = getOptionGroups;
		service.createOptionLineItemMap = createOptionLineItemMap;
		service.getNextPrimaryLineNumber = getNextPrimaryLineNumber;
		service.getNextItemSequence = getNextItemSequence;
		service.addOptionLineItem = addOptionLineItem;		
		
		function getNextPrimaryLineNumber() {
			return ++primaryNumber;
		}
		
		function getNextItemSequence(lineItemDO) {
			var itemSequence = 2;
			if(angular.isArray(lineItemDO.chargeLines)) {
				itemSequence +=  lineItemDO.chargeLines.length;
			}
			if(angular.isArray(lineItemDO.optionLines)) {
				itemSequence +=  lineItemDO.optionLines.length;
			}
			return itemSequence;
		}

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
			
			var includeParams = ["optionGroups"];
			/* TODO: find if the product has attributes 
			var products = CatalogCache.getProductInfo(productId);
			if(!products) {
			products = LineItemCache.getProductInfo(productId);

			}*/
				
			var product  = {
				"Id": productId,
			};
			product[nsPrefix + 'HasAttributes__c'] = true;
			product[nsPrefix + 'HasOptions__c'] = true;
			var products = [product];

			var requestPromise = ConfigurationDataService.createCatalogRequestDO(null, null, null, includeParams, products).then(function(optionGroupRequest) {
				return RemoteService.getProductDetails(optionGroupRequest);	
			});
			
			optionGroupPromises[productId] = requestPromise.then(function(response) {
				OptionsCache.updateOptionGroupsForProduct(productId, response.optionGroups[productId]);
				return response.optionGroups[productId];

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