(function() {
	angular.module('aptCPQUI')
		.service('OptionGroupModelService', OptionGroupModelService);

	OptionGroupModelService.$inject = [
		'$q',
		'lodash',
		'systemConstants',
		'OptionModelService',
		'aptBase.UtilService',
		'aptBase.i18nService'
	];

	function OptionGroupModelService($q, _, systemConstants, OptionModel, UtilService, i18nService) {
		var nsPrefix = systemConstants.nsPrefix;
		var labels = i18nService.CustomLabel;

		function OptionGroupModel(groupMetadata, lineItemWrapper) {
			var j, len, newOption, optionComponent, ref, existingOptionLine;
			var thisGroup = this;
			thisGroup.data = groupMetadata;
			thisGroup.lineItem = lineItemWrapper;
			thisGroup.options = [];
			thisGroup.childGroups = [];
			ref = thisGroup.data.options;
			for (j = 0, len = ref.length; j < len; j++) {
				optionComponent = ref[j];
				//existingOptionLine = thisGroup.findOptionSelection(optionComponent);
				newOption = new OptionModel(optionComponent, thisGroup, existingOptionLine);
				thisGroup.options.push(newOption);
			}
			_.forEach(thisGroup.data.childGroups, function (childMetadata) {
				var newGroup = new OptionGroupModel(childMetadata, thisGroup.lineItem);
				thisGroup.childGroups.push(newGroup);
			}); 
			return thisGroup;
		}

		OptionGroupModel.prototype.getHelpText = function() {
			//return this.data.LongDescription; //need to handle html rendering
			return this.data.LongDescription;
			//return this.data.id;
		};

		OptionGroupModel.prototype.groupId = function() {
			//Group id property starts with lowercase "i".
			return this.data.id;
		};

		OptionGroupModel.prototype.isLeaf = function() {
			return !!this.data.isLeaf;
		};

		OptionGroupModel.prototype.isPicklist = function() {
			return !!this.data.isPicklist;
		};

		OptionGroupModel.prototype.isRadio = function() {
			return (!this.isPicklist()) && (this.data.maxOptions === 1);
		};

		OptionGroupModel.prototype.isCheckbox = function() {
			return (!this.isPicklist()) && (this.data.maxOptions !== 1);
		};

		OptionGroupModel.prototype.hasNoneOption = function() {
			return this.data.minOptions === 0;
		};

		OptionGroupModel.prototype.hasNoneSelected = function(optionLines) {
			return this.optionLinesFromGroup().length === 0;
		};

		//This is where the binding is decided
		OptionGroupModel.prototype.findOptionSelection = function(optionWrapper) {
			var thisGroup = this;
			return this.lineItem.addOption(optionWrapper).then(function (newOptionLine) {
				if (newOptionLine.isPersisted) {
					thisGroup.removeDefaults();
				
				} else if (optionWrapper.isDefault()) {
					thisGroup.applyDefault(newOptionLine);
				
				}
				return newOptionLine;
			});
		};

		OptionGroupModel.prototype.optionLinesFromGroup = function() {
			var j, len, option, ref, selected;
			selected = [];
			ref = this.options;
			for (j = 0, len = ref.length; j < len; j++) {
				option = ref[j];
				if (option.isSelected()) {
					selected.push(option.optionLine);
				}
			}
			return selected;
		};

		OptionGroupModel.prototype.getConfigurationMessages = function() {
			var configMessages = [];
			var optionTotals = this.getOptionTotals();
			var minSelected = this.data.minOptions;    
			var maxSelected = this.data.maxOptions;  
			var isSelectValid = UtilService.isBetween(minSelected, maxSelected, optionTotals.selected);
			if (!isSelectValid) {
				var selectMessage = UtilService.stringFormat(labels.TotalOptionsInBetween, [this.data.label, minSelected, maxSelected]);
				configMessages.push(selectMessage);
				
			}
			var minQty = this.data.minTotalQuantity;
			var maxQty = this.data.maxTotalQuantity;
			if (angular.isNumber(minQty) && optionTotals.quantity < minQty) {
				var minMessage = UtilService.stringFormat(labels.TotalOptionMinimumQuantity, [this.data.label, minQty]);
				configMessages.push(minMessage);

			} else if (angular.isNumber(maxQty) && maxQty < optionTotals.quantity) {
				var maxMessage = UtilService.stringFormat(labels.TotalOptionMaximumQuantity, [this.data.label, maxQty]);
				configMessages.push(maxMessage);

			}
			//Push other messages attached to options.
			return configMessages;

		};

		OptionGroupModel.prototype.getOptionTotals = function() {
			var totalQty = 0,
					numSelected = 0;
			_.forEach(this.options, function(nextOption) {
				if (nextOption.isSelected()) {
					numSelected += 1;
					totalQty += nextOption.optionLine.quantity();   
				}
			});
			//TODO: store counts to optimize traversal.
			_.forEach(this.childGroups, function(nextChildGroup) {
				var childTotals = nextChildGroup.getOptionTotals();
				numSelected += childTotals.selected ? childTotals.selected : 0;
				totalQty += childTotals.quantity ? childTotals.quantity : 0; 
			});
			return {
				selected: numSelected,
				quantity: totalQty
			};

		};

		OptionGroupModel.prototype.selectNone = function() {
			var hadSelection = false;
			_.forEach(this.options, function(nextOption) {
				if (nextOption.isSelected()) {
					hadSelection = true;
					nextOption.optionLine.deselect();
					
				}
			});
			_.forEach(this.childGroups, function(nextGroup) {
				hadSelection = nextGroup.selectNone() || hadSelection;
			});
			return hadSelection;
		};

		OptionGroupModel.prototype.toggleOption = function(option) {
			var thisGroup = this;
			var j, len, otherOption, ref;
			if (thisGroup.isPicklist() || thisGroup.isRadio()) {
				//Always loop accross all to ensure unique selection.
				thisGroup.selectNone();
				return thisGroup.lineItem.addOption(option).then(function(newItem) {
					return newItem.select();
				});
			
			} else {
				if (option.isSelected()) {
					return $q.when(option.optionLine.deselect());
				} else {
					return thisGroup.lineItem.addOption(option).then(function(newItem) {
						return newItem.select();
					});
				}
			}
		
		};

		OptionGroupModel.prototype.removeDefaults = function() {
			var thisGroup = this;
			_.forEach(thisGroup.options, function (option) {
				var optionLine = option.optionLine;
				if (optionLine && !optionLine.isPersisted()) {
					// optionLine.deselect();
					//Deselect w/o dirtying
					optionLine.data.isSelected = false;
				}
			});

		};

		OptionGroupModel.prototype.applyDefault = function(optionLine) {
			var thisGroup = this;
			var hasPersisted = _.some(thisGroup.options, function (otherOption) {
				var otherOptionLine = otherOption.optionLine;
				return otherOptionLine && otherOptionLine.isPersisted();

			});
			if (!hasPersisted) {
				// optionLine.select();
				//Select w/o dirtying
				optionLine.data.isSelected = true;
			}

		};

		return OptionGroupModel;

	}

}).call(this);
