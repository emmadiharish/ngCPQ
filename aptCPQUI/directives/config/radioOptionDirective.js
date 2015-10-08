/**
 * Directive: radioOption
 * 	Used to display radio button bases selection of option products
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('radioOption', RadioOption);

	RadioOptionCtrl.$inject = ['systemConstants', 'ConfigureService', 'CatalogDataService'];

	function RadioOptionCtrl(systemConstants, ConfigureService, CatalogDataService) {
		var radioCtrl = this;
		var nsPrefix = systemConstants.nsPrefix;
		var showTabView = !!systemConstants.customSettings.optionsPageSettings.TabViewInConfigureBundle;

		radioCtrl.toggleOption = function() {
			if (!radioCtrl.option.isSelected()) {
				radioCtrl.option.toggleSelected().then(ConfigureService.updateBundle);

			}
		};
		radioCtrl.extraColumn = function(columnNumber) {
			if (ConfigureService.pageSettings) {
				var columnName = 'ExtraOptionProductColumn' + (columnNumber == 2 ? '2' : '1');
				var optionFieldName = ConfigureService.pageSettings[columnName];  
				return radioCtrl.option.optionField(optionFieldName);

			}
			return '';

		};

		radioCtrl.isOptionDisabled = function() {
			if (!radioCtrl.option.group.isModifiable()) {
				return true;
				
			}
			if (!radioCtrl.option || radioCtrl.option.isSelected()) {
				return false;

			}
			var optionId = radioCtrl.option.optionComponent[nsPrefix + 'ComponentProductId__c'];
			return ConfigureService.excludedOptionIds.indexOf(optionId) > -1;

		};

		radioCtrl.hasChildren = function() {
			var optionsOrAttrs = radioCtrl.option.lineItem.hasOptions() || radioCtrl.option.lineItem.hasAttrs();
			return (optionsOrAttrs && 
							radioCtrl.option.isSelected() && 
							radioCtrl.nextLevel() < 4);
		};
		
		radioCtrl.showConfigureIcon = function() {
			var optionsOrAttrs = radioCtrl.option.lineItem.hasOptions() || radioCtrl.option.lineItem.hasAttrs();
			return (showTabView && optionsOrAttrs && radioCtrl.option.isSelected());
			
		};

		radioCtrl.getLevel = function() {
			return parseInt(radioCtrl.level);
		};
		radioCtrl.nextLevel = function() {
			return radioCtrl.getLevel() + 1;
		};
		radioCtrl.price = function() {
			return radioCtrl.option.price() || '-';
		};
		radioCtrl.openProductSummary = function(productId) {
			return CatalogDataService.setProductSummaryId(productId);
		};


		radioCtrl.quantityField = nsPrefix + 'Quantity__c';
		return radioCtrl;

	}

	RadioOption.$inject = ['$compile', '$log', 'systemConstants'];

	function RadioOption($compile, $log, systemConstants) {
		function addSubGroup(scope, element) {
			var compiler, newElement;
			newElement = angular.element(document.createElement('option-groups'));
			newElement.attr('level', "" + (scope.radioCtrl.nextLevel()));
			newElement.attr('line-item', 'radioCtrl.option.lineItem');
			compiler = $compile(newElement);
			return compiler(scope, function(cloned, scope) {
				return element.append(cloned);
			});
		}
		function removeSubGroup(element) {
			return element.find('option-groups').remove();
		}
		function radioLink(scope, element, attrs) {
			return scope.$watch(radioWatch, radioListen);

			function radioWatch(scope) {
				return scope.radioCtrl.option.isSelected();

			}
			function radioListen(newValue, oldValue) {
				if (newValue) {
					if (scope.radioCtrl.hasChildren()) {
						// $log.debug('Listen adding sub-group');
						return addSubGroup(scope, element);
					}
				} else {
					// $log.debug('Listen removing sub-group');
					return removeSubGroup(element);
				}
			}

		}
		return {
			bindToController: true,
			controller: RadioOptionCtrl,
			controllerAs: 'radioCtrl',
			link: radioLink,
			scope: {
				option: '=',
				level: '@'
			},
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/radio-option.html"
		};

	}

})();
