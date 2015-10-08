(function() {
	angular.module('aptCPQUI')
		.service('OptionModelService', OptionModelService);

	OptionModelService.$inject = [
		'$q',
		'$log',
		'lodash',
		'systemConstants',
		'aptBase.UtilService',
		'aptBase.i18nService'
	];

	function OptionModelService($q, $log, _, systemConstants, UtilService, i18nService) {
		var nsPrefix = systemConstants.nsPrefix;
		var labels = i18nService.CustomLabel;

		function OptionModel(optionComponent, group, optionLineWrapper) {
			this.optionComponent = optionComponent;//TODO: rename .data
			this.group = group;
			this.lineItem = optionLineWrapper;
			//Check whether default selection should be made
			if (this.isDefault()) {
				var parent = this.lineItem.parentItem;
				var isParentSelected = parent ? parent.isSelected() && !parent.isPersisted() : true;
				if (isParentSelected) {
					this.lineItem.select();

				}
				
			}
			this.prices = [];
			return this;

		}

		OptionModel.prototype.toggleSelected = function() {
			var thisOption = this;
			return thisOption.group.toggleOption(thisOption).then(function(newItem) {
					if (newItem != thisOption.lineItem) {
						$log.debug('Toggle created new option item:', thisOption.lineItem, newItem);
						thisOption.lineItem = newItem;  
					}
					return thisOption;
				});
		};

		OptionModel.prototype.componentId = function() {
			//Component Id starts with uppercase "I".
			return this.optionComponent.Id;
		};

		OptionModel.prototype.isDefault = function() {
			return !!this.optionComponent[nsPrefix + 'Default__c'];
		};

		OptionModel.prototype.isRequired = function() {
			return !!this.optionComponent[nsPrefix + 'Required__c'];
		};

		OptionModel.prototype.isSelected = function() {
			return !!this.lineItem && this.lineItem.isSelected();
		};

		OptionModel.prototype.hasError = function() {
			if (this.isSelected()) {
				return !this.hasValidQuantity();

			}
			return this.isRequired();

		};

		OptionModel.prototype.hasValidQuantity = function() {
			var minQty = this.optionComponent[nsPrefix + 'MinQuantity__c'];
			var maxQty = this.optionComponent[nsPrefix + 'MaxQuantity__c'];
			return UtilService.isBetween(minQty, maxQty, this.lineItem.quantity());

		};

		OptionModel.prototype.getConfigurationMessages = function() {
			var configMessages = [];
			if (this.isSelected()) {
				var minQty = this.optionComponent[nsPrefix + 'MinQuantity__c'],
						maxQty = this.optionComponent[nsPrefix + 'MaxQuantity__c'],
						qty = this.lineItem.quantity();
				if (!UtilService.isBetween(minQty, maxQty, qty)) {
					var quantityMessage;
					if (angular.isDefined(minQty) && angular.isDefined(maxQty)) {
						quantityMessage = UtilService.stringFormat(labels.ForProductQtyIsBetween, [this.name(), minQty, maxQty]);

					} else if (angular.isDefined(minQty)) {
						quantityMessage = UtilService.stringFormat(labels.OptionMinimumQuantity, [this.name(), minQty]);
					
					} else {
						quantityMessage = UtilService.stringFormat(labels.OptionMinimumQuantity, [this.name(), minQty]);
						
					}
					configMessages.push(quantityMessage);

				}

			} else if (this.isRequired()) {
				var requiredMessage = UtilService.stringFormat(labels.OptionIsRequired, [this.name()]);
				configMessages.push(requiredMessage);

			}
			return configMessages;

		};

		OptionModel.prototype.optionField = function(fieldName) {
			return this.optionComponent[nsPrefix + 'ComponentProductId__r'][fieldName];
		};

		OptionModel.prototype.name = function() {
			return this.optionComponent[nsPrefix + 'ComponentProductId__r'].Name;
		};

		OptionModel.prototype.price = function() {
			var ref = this.optionComponent[nsPrefix + 'ComponentProductId__r'][nsPrefix + 'PriceLists__r'];
			if (ref) {
				return ref[0][nsPrefix + 'ListPrice__c'];

			}
			return void(0);

		};

		OptionModel.prototype.getPrices = function() {
			this.prices.length = 0;
			var priceLists = this.optionComponent[nsPrefix + 'ComponentProductId__r'][nsPrefix + 'PriceLists__r'];
			if (priceLists) {
				_.reduce(priceLists, function (prices, nextItem) {
					prices.push(nextItem[nsPrefix + 'ListPrice__c']);
					return prices;          
				}, this.prices);

			}
			return this.prices;

		};

		OptionModel.prototype.isEditable = function() {
			return !!this.optionComponent[nsPrefix + 'Modifiable__c'];
		};
		
		return OptionModel;

	}

}).call(this);
