// assetDataService declaraion
// this service facilitates remoting calls to fetch Asset line item data 
// as well as Asset Filter data. This service will also support all other
// actions on asset data that requires remoting calls to Apex classes.
// 
// Author - Mihir Parikh
// (c)2015 - Apttus Corp.
//

(function() {
	'use strict';

	angular.module('aptCPQData').service('AssetDataService', AssetDataServiceFunc);

	AssetDataServiceFunc.$inject = [
		'$q',
		'$http',
		'$log',
		'systemConstants',
		'ConfigurationDataService',
		'aptBase.RemoteService'
	];
		
	function AssetDataServiceFunc($q, $http, $log, systemConstants, ConfigurationDataService, RemoteService) {
		var nsPrefix = systemConstants.nsPrefix;
		// assetDataService.assetLineItemData = {}; 

		// makes a remoting call with filters to return filtered asset line items
		// @params {array} assetFilters - array of Asset Filter discription objects
		this.getFilteredAssetLineItemData = function(assetFilters) {
			// console.log("Display AssetFilters: " + JSON.stringify(assetFilters));
			var includeParams = ['cartLines', 'chargeLines', 'ruleActions'];
			var requestPromise = ConfigurationDataService.createCartRequestDO(null, null, null, null, includeParams, assetFilters).then(function(assetRequest) {
				return RemoteService.getAssetLineItems(assetRequest);
				
			});

			return requestPromise.then(function(result) {
				// add property to enable checkbox selection:
				result.assetLineItems.forEach(function(lineItem){
					lineItem.assetLineItemSO['@@uiSelection'] = false;
				});
				var lineItemData = result.assetLineItems; // new asset line items
				return lineItemData;
			});
		};
		
		// remoting call to get asset line items
		this.getAssetLineItemData = function() {
			var includeParams = ['cartLines', 'chargeLines', 'ruleActions'];
			var requestPromise = ConfigurationDataService.createCartRequestDO(null, null, null, null, includeParams, null).then(function(assetRequest) {
				return RemoteService.getAssetLineItems(assetRequest);	

			});
			

			return requestPromise.then(function(result) {
				var lineItemData = result.assetLineItems; // asset line items array
				return lineItemData;
			});
		};

		// implementation pending
		this.getAssetFiltersData = function() {
			var includeParams = ['cartLines', 'chargeLines', 'ruleActions'];
			var requestPromise = ConfigurationDataService.createCartRequestDO(null, null, null, null, includeParams).then(function(assetFilterReqeust) {
				return RemoteService.getAssetFilters(assetFilterReqeust);
				
			});
			

			return requestPromise.then(function(result){
				return result;
			});
		};

		// get replacement assets (used in 'swap')
		this.getReplacementProducts = function(productId) {
			var requestObj = {};
			requestObj.includeParams = ['cartLines'];
			// There should be a helper method for this.
			var replacementSO = {};
			replacementSO[nsPrefix + 'ProductId__c'] = productId;
			requestObj.lineItems = [ 
				{ 
					"chargeLines" : [
						{ 
							lineItemSO: replacementSO
						}
					] 
				}
			];

			var request = ConfigurationDataService.createAssetActionRequest(requestObj);
			var requestPromise = RemoteService.getReplacementProducts(request);

			return requestPromise.then(function(result){
				return result;
			});
		};

		// calculate pricing data for assets
		this.calculateMetricsForAssets = function(assetLineItems) {
			var requestObj = {};
			// create request
			requestObj.assetLineItems = assetLineItems;

			var request = ConfigurationDataService.createAssetActionRequest(requestObj);
			var requestPromise = RemoteService.calculateMetricsForAssets(request);

			return requestPromise.then(function(result){
				return result;
			});
		}

		return this; // return the service object
	}
	
})();
