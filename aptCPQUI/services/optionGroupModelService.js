/**
 * Service: OptionGroupModelService
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').service('OptionGroupModelService', OptionGroupModelService);

	OptionGroupModelService.$inject = [
		'$q',
		'lodash',
		'systemConstants',
		'aptBase.i18nService',
		'OptionModelService',
		'aptBase.UtilService'
	];

	function OptionGroupModelService($q, _, systemConstants, i18nService, OptionModel, UtilService) {
		var nsPrefix = systemConstants.nsPrefix;
		var labels = i18nService.CustomLabel;
		var showTabView = !!systemConstants.customSettings.optionsPageSettings.TabViewInConfigureBundle;

		function OptionGroupModel(groupMetadata, lineItemWrapper) {
			var thisGroup = this;
			thisGroup.groupInfo = groupMetadata;
			thisGroup.lineItem = lineItemWrapper;
			thisGroup.options = [];
			thisGroup.childGroups = _.map(thisGroup.groupInfo.childGroups, function (childMetadata) {
				return new OptionGroupModel(childMetadata, thisGroup.lineItem);
			}); 
			return thisGroup;
		}

		OptionGroupModel.prototype.buildOptions = function() {
			var thisGroup = this;
			var optionPromises = _.map(thisGroup.groupInfo.options, function (optionMetadata) {
				return thisGroup.lineItem.findOptionLineForComponent(optionMetadata).then(function (optionLineModel) {
					return new OptionModel(optionMetadata, thisGroup, optionLineModel);
				});
			});	
			var subGroupPromises = _.map(thisGroup.childGroups, function (childGroup) {
				return childGroup.buildOptions();
			});
			//Fill in array of option models
			var attachOptionsPromise = $q.all(optionPromises).then(function (optionModels) {
				_.assign(thisGroup.options, optionModels);
			});
			//Wrap up all promises into one.
			var allPromises = [attachOptionsPromise, $q.all(subGroupPromises)];
			return $q.all(allPromises);
		};

		OptionGroupModel.prototype.optionLinesFromGroup = function() {
			var j, len, option, ref, selected;
			selected = [];
			ref = this.options;
			for (j = 0, len = ref.length; j < len; j++) {
				option = ref[j];
				if (option.isSelected()) {
					selected.push(option.lineItem);
				}
			}
			return selected;
		};

		OptionGroupModel.prototype.getConfigurationMessages = function() {
			var optionConfigInfo = this.getOptionConfigInfo();
			var configMessages = [];
			var minSelected = this.groupInfo.minOptions;    
			var maxSelected = this.groupInfo.maxOptions;  
			var isSelectValid = UtilService.isBetween(minSelected, maxSelected, optionConfigInfo.selected);
			if (!isSelectValid) {
				var selectMessage = UtilService.stringFormat(labels.TotalOptionsInBetween, [this.groupInfo.label, minSelected, maxSelected]);
				configMessages.push(selectMessage);
				
			}
			var minQty = this.groupInfo.minTotalQuantity;
			var maxQty = this.groupInfo.maxTotalQuantity;
			if (angular.isNumber(minQty) && optionConfigInfo.quantity < minQty) {
				var minMessage = UtilService.stringFormat(labels.TotalOptionMinimumQuantity, [this.groupInfo.label, minQty]);
				configMessages.push(minMessage);

			} else if (angular.isNumber(maxQty) && maxQty < optionConfigInfo.quantity) {
				var maxMessage = UtilService.stringFormat(labels.TotalOptionMaximumQuantity, [this.groupInfo.label, maxQty]);
				configMessages.push(maxMessage);

			}
			//Push other messages attached to options.
			configMessages = configMessages.concat(optionConfigInfo.messages);
			return configMessages;

		};

		OptionGroupModel.prototype.getOptionConfigInfo = function() {
			var totalQty = 0,
					numSelected = 0,
					optionMessages = [];
			_.forEach(this.options, function(nextOption) {
				optionMessages = optionMessages.concat(nextOption.getConfigurationMessages());
				if (nextOption.isSelected()) {
					numSelected += 1;
					totalQty += nextOption.lineItem.quantity();
				}
			});
			//TODO: store counts to optimize traversal.
			_.forEach(this.childGroups, function(nextChildGroup) {
				var childTotals = nextChildGroup.getOptionConfigInfo();
				numSelected += childTotals.selected ? childTotals.selected : 0;
				totalQty += childTotals.quantity ? childTotals.quantity : 0; 
			});
			return {
				selected: numSelected,
				quantity: totalQty,
				messages: optionMessages
			};

		};

		OptionGroupModel.prototype.selectNone = function() {
			var hadSelection = false;
			_.forEach(this.options, function(nextOption) {
				if (nextOption.isSelected()) {
					nextOption.lineItem.deselect();
					hadSelection = true;
				}
			});
			_.forEach(this.childGroups, function (nextGroup) {
				nextGroup.selectNone();
			});
			return hadSelection;
		};

		OptionGroupModel.prototype.toggleOption = function(option) {
			var thisGroup = this;
			var toggledComponent = option.optionComponent;
			if (thisGroup.isPicklist() || thisGroup.isRadio()) {
				//Always loop accross all to ensure unique selection.
				thisGroup.selectNone();
				return thisGroup.lineItem.findOptionLineForComponent(toggledComponent).then(function(newItem) {
					newItem.select();
					return newItem;
					
				});
			
			} else {
				if (option.isSelected()) {
					option.lineItem.deselect();
					return $q.when(option.lineItem);

				} else {
					return thisGroup.lineItem.findOptionLineForComponent(toggledComponent).then(function(newItem) {
						newItem.select();
						return newItem;

					});

				}

			}
		
		};

		OptionGroupModel.prototype.removeDefaults = function() {
			var thisGroup = this;
			_.forEach(thisGroup.options, function (option) {
				var optionLine = option.lineItem;
				if (optionLine && !optionLine.isPersisted()) {
					// optionLine.deselect();
					//Deselect w/o dirtying
					optionLine.lineItemDO.isSelected = false;
				}
			});

		};

		OptionGroupModel.prototype.applyDefault = function(optionLine) {
			var thisGroup = this;
			var hasPersisted = _.some(thisGroup.options, function (otherOption) {
				var otherOptionLine = otherOption.lineItem;
				return otherOptionLine && otherOptionLine.isPersisted();

			});
			if (!hasPersisted) {
				// optionLine.select();
				//Select w/o dirtying
				optionLine.lineItemDO.isSelected = true;
			}

		};

		OptionGroupModel.prototype.selectDefaults = function() {
			_.forEach(this.options, function (nextOption) {
				if (nextOption.isDefault()) {
					nextOption.lineItem.select();
				}
			});
			_.forEach(this.childGroups, function (nextGroup) {
				nextGroup.selectDefaults();
			});
		};


		OptionGroupModel.prototype.getHelpText = function() {
			//return this.groupInfo.LongDescription; //need to handle html rendering
			return this.groupInfo.LongDescription;
			//return this.groupInfo.id;
		};

		OptionGroupModel.prototype.isActive = function() {
			return (!!this.groupInfo.isActive || !showTabView) && !this.groupInfo.isHidden;
		}
		
		OptionGroupModel.prototype.isContentTypeOptions = function() {
			return !(this.groupInfo.contentType === 'Attributes' || this.groupInfo.contentType === 'Detail Page');
		}
		
		OptionGroupModel.prototype.isContentTypeAttributes = function() {
			return (this.groupInfo.contentType === 'Attributes');
		}

		OptionGroupModel.prototype.isContentTypeDetailPage = function() {
			return (this.groupInfo.contentType === 'Detail Page');
		}

		OptionGroupModel.prototype.getDetailPageUrl = function() {
			return this.groupInfo.detailPage;
		}		
		
		OptionGroupModel.prototype.isModifiable = function() {
			return this.groupInfo.modifiableType !== "Fixed";
		};
		
		OptionGroupModel.prototype.isLeaf = function() {
			return !!this.groupInfo.isLeaf;
		};
		
		OptionGroupModel.prototype.isTopLevel = function() {
			return !this.groupInfo.parentId;
		};
		
		OptionGroupModel.prototype.isHidden = function() {
			return !!this.groupInfo.isHidden;
		};

		OptionGroupModel.prototype.isPicklist = function() {
			return !!this.groupInfo.isPicklist;
		};

		OptionGroupModel.prototype.isRadio = function() {
			return (!this.isPicklist()) && (this.groupInfo.maxOptions === 1);
		};

		OptionGroupModel.prototype.isCheckbox = function() {
			return (!this.isPicklist()) && (this.groupInfo.maxOptions !== 1);
		};

		OptionGroupModel.prototype.hasNoneOption = function() {
			return this.groupInfo.minOptions === 0;
		};

		OptionGroupModel.prototype.hasNoneSelected = function(optionLines) {
			return this.optionLinesFromGroup().length === 0;
		};
		
		OptionGroupModel.prototype.attributeGroupId = function() {
			return this.groupInfo.attributeGroupId;
		};
		
		return OptionGroupModel;

	}

}).call(this);
