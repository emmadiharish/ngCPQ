;(function() {
	'use strict';
	
	angular.module('aptCPQUI')
	.service('ConfigureService', ConfigureService);

	ConfigureService.$inject = [
		'$q',
		'$log',
		'systemConstants',
		'LineItemModelService',
		'OptionDataService',
		'CartDataService',
		'ConstraintRuleDataService',
		'ConfigurationDataService'
	];
	 
	function ConfigureService($q, $log,  systemConstants, LineItemModel, OptionDataService, CartDataService, ConstraintRuleDataService, ConfigurationDataService) {
		var service = this;
		var nsPrefix = systemConstants.nsPrefix;
		service.excludedOptionIds = {};
		service.pageSettings = {};

		/**
		 * Initialize line item to be displayed with in config state directives.
		 * Also ensures the custom settings are initialized to allow display of
		 *   custom option columns.
		 * @param {number} txnPrimaryLineNumber  item identifier
		 */
		service.setLineitemToConfigure = function(txnPrimaryLineNumber) {
			return CartDataService.getLineItem(txnPrimaryLineNumber).then(function (lineItem) {
				service.lineItem = lineItem;
				
				ConstraintRuleDataService.contextLineItem = service.lineItem;
				service.getExcludedOptionIds();
				service.getPageSettings();
				return service.lineItem;
			
			});
			
		};

		service.formatPageUrl = function(optionGroup) {
			var pageUrl = optionGroup.getDetailPageUrl();
			var optionGroupId = optionGroup.groupInfo.id;
			return ConfigurationDataService.formatPageUrl(pageUrl) 
				+ '&primaryLineNumber=' + service.lineItem.primaryLineNumber()
				+ '&lineItemId=' + service.lineItem.lineItemSO().Id
				+ '&optionGroupId=' + optionGroupId;
		};
		
		service.getOptionGroups = function() {
			var productId = service.lineItem.productId();
			return OptionDataService.getOptionGroups(productId);
		};

		service.getPageSettings = function () {
			ConfigurationDataService.getCustomSettings().then(function (settings) {
				service.pageSettings = settings.optionsPageSettings;
			});

		};

		service.getExcludedOptionIds = function() {
			// var contextBundleNumber = service.lineItem ? service.lineItem.lineItemSO()[nsPrefix + 'PrimaryLineNumber__c'] : undefined;
			var contextBundleNumber = service.lineItem ? service.lineItem.primaryLineNumber() : undefined;
			if (!contextBundleNumber) {
				// service.excludedOptionIds.length = 0;
				service.excludedOptionIds = {};
				return $q.when(service.excludedOptionIds);

			}
			return CartDataService.getExcludedOptionIds(contextBundleNumber).then(function(optionIds){
				// Array.prototype.splice.apply(service.excludedOptionIds, [0, service.excludedOptionIds.length].concat(optionIds));
				service.excludedOptionIds = {};
				for (var optionIndex = 0; optionIndex < optionIds.length; optionIndex++) {
					service.excludedOptionIds[optionIds[optionIndex]] = true;
				}
				return service.excludedOptionIds;
				
			});
			
		};
		
		/**
		 * Pass the line item data the cart data service for update.
		 * @return {[type]} [description]
		 */
		service.updateBundle = function() {
			// return CartDataService.updateBundle(service.lineItem.lineItemDO).then(service.getExcludedOptionIds);
			return CartDataService.updateBundle(service.lineItem).then(service.getExcludedOptionIds);

		};
		
		return service;

	}

}).call(this);
