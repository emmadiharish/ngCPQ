/**
 * Directive: checkboxOption
 *   used to display checkbox based selection for options page
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').directive('checkboxOption', CheckboxOption);

	CheckboxOptionCtrl.$inject = ['systemConstants', 'ConfigureService', 'CatalogDataService'];

	function CheckboxOptionCtrl(systemConstants, ConfigureService, CatalogDataService) {
		var checkboxCtrl = this;
		var nsPrefix = systemConstants.nsPrefix;
		var showTabView = !!systemConstants.customSettings.optionsPageSettings.TabViewInConfigureBundle;

		checkboxCtrl.config = ConfigureService;
		checkboxCtrl.quantityField = nsPrefix + 'Quantity__c';
		checkboxCtrl.showAllPrices = false;
		
		checkboxCtrl.toggleOption = function () {
			checkboxCtrl.option.toggleSelected().then(function () {
				ConfigureService.updateBundle();
			});

		};

		checkboxCtrl.extraColumn = function(columnNumber) {
			if (ConfigureService.pageSettings) {
				var columnName = 'ExtraOptionProductColumn' + (columnNumber == 2 ? '2' : '1');
				var optionFieldName = ConfigureService.pageSettings[columnName];	
				return checkboxCtrl.option.optionField(optionFieldName);
				
			}
			return '';

		};

		checkboxCtrl.hasChildren = function() {
			var optionsOrAttrs = checkboxCtrl.option.lineItem.hasOptions() || checkboxCtrl.option.lineItem.hasAttrs();
			return (optionsOrAttrs && 
							checkboxCtrl.option.isSelected() && 
							checkboxCtrl.nextLevel() < 4);
		};
		
		checkboxCtrl.showConfigureIcon = function() {
			var optionsOrAttrs = checkboxCtrl.option.lineItem.hasOptions() || checkboxCtrl.option.lineItem.hasAttrs();
			return (showTabView && optionsOrAttrs && checkboxCtrl.option.isSelected());
			
		};
		
		checkboxCtrl.getLevel = function() {
			return parseInt(checkboxCtrl.level);
		};
		
		checkboxCtrl.nextLevel = function() {
			return checkboxCtrl.getLevel() + 1;
		};
		
		checkboxCtrl.price = function() {
			return checkboxCtrl.option.price() || '-';
		};

		checkboxCtrl.isOptionDisabled = function() {
			if (!checkboxCtrl.option.group.isModifiable()) {
				return true;

			}
			if (!checkboxCtrl.option || checkboxCtrl.option.isSelected()) {
				return false;

			}
			var optionId = checkboxCtrl.option.optionComponent[nsPrefix + 'ComponentProductId__c'];
			return ConfigureService.excludedOptionIds.indexOf(optionId) > -1;

		};

		checkboxCtrl.openProductSummary = function(productId) {
			return CatalogDataService.setProductSummaryId(productId);
		};
		
		return checkboxCtrl;
		
	}

	
	CheckboxOption.$inject = ['$compile', '$log', 'systemConstants'];
	
	function CheckboxOption($compile, $log, systemConstants) {
		function addSubGroup(scope, element) {
			var compiler, newElement;
			newElement = angular.element(document.createElement('option-groups'));
			newElement.attr('level', "" + (scope.checkboxCtrl.nextLevel()));
			newElement.attr('line-item', 'checkboxCtrl.option.lineItem');
			compiler = $compile(newElement);
			
			return compiler(scope, (function(_this) {
				return function(cloned, scope) {
					return element.append(cloned);
				};
			})(this));
		}
		
		function removeSubGroup(element) {
			return element.find('option-groups').remove();
			
		}
		
		function checkboxLink(scope, element, attrs) {
			
			function checkboxWatch(scope) {
				return scope.checkboxCtrl.option.isSelected();

			}
			
			function checkboxListen(newValue, oldValue) {
				if (newValue) {
					if (scope.checkboxCtrl.hasChildren()) {
						// $log.debug('Listen adding sub-group');
						return addSubGroup(scope, element);
					}
					
				} else {
					// $log.debug('Listen removing sub-group');
					return removeSubGroup(element);
					
				}
				
			}
			
			return scope.$watch(checkboxWatch, checkboxListen);
			
		}
		
		return {
			scope: {
				option: '=',
				level: '@'
			},
			link: checkboxLink,
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/checkbox-option.html",
			controller: CheckboxOptionCtrl,
			controllerAs: 'checkboxCtrl',
			bindToController: true
		};
	};

}).call(this);
