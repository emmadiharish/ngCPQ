(function() {
	angular.module('aptCPQUI')
		.directive('picklistOptionList', PicklistOptionList);
	
	PicklistOptionList.$inject = ['systemConstants', '$compile'];

	PicklistOptionListCtrl.$inject = [
		'$q',
		'systemConstants',
		'ConfigureService'
	];

	function PicklistOptionListCtrl($q, systemConstants, ConfigureService) {
		var picklistCtrl = this;
		var nsPrefix = systemConstants.nsPrefix;

		picklistCtrl.hasChildren = function() {
			var selectedLine = picklistCtrl.selected.lineItem;
			var optionsOrAttrs = selectedLine.hasOptions() || selectedLine.hasAttrs();
			return (optionsOrAttrs && picklistCtrl.nextLevel() < 4);
		};
		picklistCtrl.getLevel = function() {
			return parseInt(picklistCtrl.level);
		};
		picklistCtrl.nextLevel = function() {
			return picklistCtrl.getLevel() + 1;
		};
		picklistCtrl.price = function() {
			var ref;
			return ((ref = picklistCtrl.selected) != null ? ref.price() : void 0) || '-';
		};
		picklistCtrl.extraColumn = function(columnNumber) {
			if (ConfigureService.pageSettings && picklistCtrl.selected) {
				var columnName = 'ExtraOptionProductColumn' + (columnNumber == 2 ? '2' : '1');
				var optionFieldName = ConfigureService.pageSettings[columnName];	
				return picklistCtrl.selected.optionField(optionFieldName);
			
			}
			return '';

		};
		
		picklistCtrl.selectOption = function(option) {
			//Check to make sure option is defined.
			if (!option) {
				return option;

			}
			return option.toggleSelected().then(function() {
				picklistCtrl.selected = option; //with ng-model this should be unncecessary
				ConfigureService.updateBundle();
				return option;
			});
		};
		function init() {
			var optionWrappers = picklistCtrl.group.options;
			var wrapperPromises = [];
			for (var i = 0, len = optionWrappers.length; i < len; i++) {
				var optionWrapper = optionWrappers[i];
				wrapperPromises.push(optionWrapper);
			}
			$q.all(wrapperPromises).then(function (resultOptions) {
				for (var i = 0, len = resultOptions.length; i < len; i++) {
					var optionWrapper = resultOptions[i];
					if (optionWrapper.isSelected()) {
						picklistCtrl.selected = optionWrapper; 
						break;
					}
				}

			});

		}
		picklistCtrl.quantityField = nsPrefix + 'Quantity__c';
		init();
		return picklistCtrl;

	}


	function PicklistOptionList(systemConstants, $compile) {
		function addSubGroup(scope, element) {
			var compiler, newElement;
			newElement = angular.element(document.createElement('option-groups'));
			newElement.attr('level', "" + (scope.picklistCtrl.nextLevel()));
			newElement.attr('line-item', 'picklistCtrl.selected.optionLine');
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
		function picklistLink(scope, element, attrs) {
			return scope.$watch(picklistWatch, picklistListen);

			function picklistWatch(scope) {
				// return scope.picklistCtrl.selected.isSelected();
				return scope.picklistCtrl.selected;

			}
			function picklistListen(newValue, oldValue) {
				removeSubGroup(element);
				if (newValue) {
					if (scope.picklistCtrl.hasChildren()) {
						return addSubGroup(scope, element);
					}
				}
			}

		}
		return {
			scope: {
				group: '=',
				optionLines: '=',
				level: '@'
			},
			link: picklistLink,
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/picklist-option-list.html",
			controller: PicklistOptionListCtrl,
			controllerAs: 'picklistCtrl',
			bindToController: true
		};

	}

})();
