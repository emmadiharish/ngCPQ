(function() {
	'use strict';
	angular.module('aptCPQUI').service('AssetService', AssetServiceFunc);

	AssetServiceFunc.$inject = [
		'lodash', 
		'$q', 
		'$log', 
		'$state',
		'AssetDataService', 
		'ConfigurationDataService', 
		'CartDataService', 
		'aptBase.i18nService'
	];

	function AssetServiceFunc(_, $q, $log, $state, AssetDataService, ConfigDataService, CartDataService, i18nService) {
		// selected filters list - when empty the asset lines items are not filtered at all
		// when non-empty, filter out any that don't match
		var assetServiceRef = this; // for access within closures

		var today = new Date();

		assetServiceRef.searchKey = '';
		assetServiceRef.assetLineItems = {};
		assetServiceRef.assetColumnMetadata = {}; 
		assetServiceRef.assetFilterList = []; // initalized to empty
		assetServiceRef.assetFilterCache = {};
		assetServiceRef.filteredResponse = false;
		assetServiceRef.loadingDiv = false;
		assetServiceRef.disableActions = true;
		assetServiceRef.isAssetSummaryOpen = false;
		
		var isAssetCacheValid = false;
		var isAssetFilterCacheValid = false;
		var isAssetDisplayColumnCacheValide = false;
		var selectedSummaryAsset = {};

		assetServiceRef.disableActionsObj = {
			'Cancel' : true,
			'Swap' : true,
			'Change' : true,
			'Manage': true,
			'New': true
		};

		this.resetDisableActionsObj = function() {
			assetServiceRef.disableActionsObj = {
				'Cancel' : true,
				'Swap' : true,
				'Change' : true,
				'Manage': true,
				'New': true
			};
		};

		this.setSelectedSummaryAsset = function(asset) {
			assetServiceRef.isAssetSummaryOpen = true;
			selectedSummaryAsset = asset;
		};

		this.getSelectedSummaryAsset = function() {
			return selectedSummaryAsset;
		};

		// assetServiceRef.currLineSelection = null;

		assetServiceRef.currLineSelectionMap = {};

		var assetActions = [
			{
				"order": 5,
				"label" : i18nService.CustomLabel.Terminate,
				"action": "Cancel",
				"enabled": true,
				"display": true
			},
			{
				"order" : 2,
				"label" : i18nService.CustomLabel.Swap,
				"action": "Swap",
				"enabled": true,
				"display": true
			},
			{
				"order" : 3,
				"label" : i18nService.CustomLabel.Change,
				"action": "Amend",
				"enabled": true,
				"display": true
			},
			{
				"order" : 1,
				"label" : "New",
				"action": "New",
				"enabled": false,
				"display": false
			},
			{
				"order" : 4,
				"label" : "Manage",
				"action": "Manage",
				"enabled": false,
				"display": false
			}	
		];

		// get current time in mSec
		this.getCurrentTime = function() {
			return today.getTime();
		};

		this.resetLineSelection = function() {
			Object.keys(assetServiceRef.currLineSelectionMap).forEach(function (key){
				assetServiceRef.currLineSelectionMap[key].assetLineItemSO['@@uiSelection'] = false;
			});
		};

		// generic cancel action - cancel current action and return to the asset items list
		this.genericCancelAction = function(actionName) {
			$log.info(actionName + " cancelled");
			// unselect checkboxes
			assetServiceRef.resetLineSelection();
			assetServiceRef.currLineSelectionMap = {}; // clear the selection map
			assetServiceRef.disableActions = true;
			assetServiceRef.resetDisableActionsObj(); // disable all action buttons
			$state.go('assets');
		};

		this.getAssetActions = function() {
			// static data for now
			return assetActions;
		};

		this.getAssetLineItems = function() {
			if (isAssetCacheValid) {
				return $q.when(assetServiceRef.assetLineItems);
			} 

			return AssetDataService.getAssetLineItemData().then(function(result){
				isAssetCacheValid = true;
				assetServiceRef.assetLineItems = result;
				return result;
			});
		};

		this.invalidateAssetCache = function() {
			isAssetCacheValid = false;
		};

		this.invalidateAssetFilterCache = function() {
			isAssetFilterCacheValid = false;
		}

		this.searchAssetLineItems = function(searchKey) {
			var assetFilters = [];
			assetFilters.push({
				"FieldType": "REFERENCE",
				"FieldName": "ProductId__c",
				"FieldValue": searchKey
			});

			return AssetDataService.getFilteredAssetLineItemData(assetFilters).then(function(result){
				isAssetCacheValid = false;
				assetServiceRef.assetLineItems = result;
			});
		};

		this.getReferenceObjects = function(refObjKey){
			return ConfigDataService.getReferenceObjects(refObjKey);
		};

		this.getColumnMetadata = function() {
			if(isAssetDisplayColumnCacheValide) {
				return $q.when(assetServiceRef.assetColumnMetadata);
			}

			return ConfigDataService.getDisplayColumns().then(function(result) {
				assetServiceRef.assetColumnMetadata = result;
				return result;
			});
		};

		this.getAssetFilterList = function() {
			if (isAssetFilterCacheValid) {
				return $q.when(assetServiceRef.assetFilterCache);
			}

			return AssetDataService.getAssetFiltersData().then(function(result){
				assetServiceRef.assetFilterCache = result;
				isAssetFilterCacheValid = true;
				return result;
			});
		};

		this.getCartLineItems = function() {
			return CartDataService.getCartLineItems().then(function (result){
				return result;
			});
		};

		this.requestAssetAction = function(actionLineItems) {
			// return CartDataService.submitAssetActions(actionLineItems).then(function(result){
			// 	return result;
			// });
			return CartDataService.submitAssetActions(actionLineItems);
		};

		this.getReplacementProducts = function(productId) {
			return AssetDataService.getReplacementProducts(productId);
		};

		this.calculateMetricsForAssets = function(actionLineItems) {
			return AssetDataService.calculateMetricsForAssets(actionLineItems);
		};

		// handler for the filter panel "Apply" button
		this.submitAssetFilterQuery = function() {
			// re-align the assetFilterList 
			var assetFilters = [];
			for ( var idx=0; idx < assetServiceRef.assetFilterList.length; idx++) {

			}
			return AssetDataService.getFilteredAssetLineItemData();
		};

		// clear the asset Filter array
		this.clearAssetFilterList = function() {
			this.assetFilterList.length = 0;
			// could also do this.assetFilterList = []
		};

		// update local copy of the search-filters object
		// @params {object} modelData - Filter object that needs to be updated
		this.handleSearchFilterApply = function(submitFilterList) {
			return AssetDataService.getFilteredAssetLineItemData(submitFilterList).then(function(result){
				// refresh the asset line item cache
				assetServiceRef.assetLineItems = result;
				return result;
			});
		};

		return this;
	}
})();