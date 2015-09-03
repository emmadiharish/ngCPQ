;(function() {
	'use strict';
	
	angular.module('aptCPQUI')
	.service('ConfigureService', ConfigureService);

	ConfigureService.$inject = ['$q',
		'$log',
		'systemConstants',
		'LineItemModelService',
		'CartDataService',
		'ConstraintRuleDataService',
		'ConfigurationDataService'
	];
	 
	function ConfigureService($q, $log, systemConstants, LineItemModel, CartDataService, ConstraintRuleDataService, ConfigurationDataService) {
		var service = this;
		var nsPrefix = systemConstants.nsPrefix;
		service.excludedOptionIds = [];

		/**
		 * Initialize line item to be displayed with in config state directives.
		 * Also ensures the custom settings are initialized to allow display of
		 *   custom option columns.
		 * @param {number} txnPrimaryLineNumber  item identifier
		 */
		service.setLineitemToConfigure = function(txnPrimaryLineNumber) {
			return CartDataService.getLineItem(txnPrimaryLineNumber).then(function(lineItemData) {
				return LineItemModel.create(lineItemData).then(function(newLineItem) {
					service.lineItem = newLineItem;
					ConstraintRuleDataService.contextLineItem = newLineItem;
					service.getExcludedOptionIds();
					service.getPageSettings();
					return service.lineItem;
				
				});
			
			});
			
		};

		service.getPageSettings = function () {
			ConfigurationDataService.getCustomSettings().then(function (settings) {
				service.pageSettings = settings.optionsPageSettings;
			});

		};

		service.getExcludedOptionIds = function() {
			var contextBundleNumber = service.lineItem ? service.lineItem.lineItemSO()[nsPrefix + 'PrimaryLineNumber__c'] : undefined;
			if (!contextBundleNumber) {
				service.excludedOptionIds.length = 0;
				return $q.when(service.excludedOptionIds);

			}
			return CartDataService.getExcludedOptionIds(contextBundleNumber).then(function(optionIds){
				Array.prototype.splice.apply(service.excludedOptionIds, [0, service.excludedOptionIds.length].concat(optionIds));
				return service.excludedOptionIds;
				
			});
			
		};
		
		/**
		 * Pass the line item data the cart data service for update.
		 * @return {[type]} [description]
		 */
		service.updateBundle = function() {
			return CartDataService.updateBundle(service.lineItem.data).then(service.getExcludedOptionIds);

		};
		
		return service;

	}

}).call(this);
