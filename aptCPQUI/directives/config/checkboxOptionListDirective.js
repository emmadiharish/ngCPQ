(function() {
	var CheckboxOptionList, CheckboxOptionListCtrl;

	CheckboxOptionListCtrl = function(ConfigureService) {
		this.getLevel = function() {
			return parseInt(this.level);
		};

		this.isOptionDisplayed = function(option) {
			var hideDisabled = ConfigureService.pageSettings.HideDisabledOptions;
			if (hideDisabled === false) {
				return true;

			}
			if (!option || option.isSelected()) {
				return true;

			}
			var optionId = option.optionField('Id');
			return ConfigureService.excludedOptionIds[optionId] !== true;

		};
		return this;

	};

	CheckboxOptionListCtrl.$inject = ['ConfigureService'];

	CheckboxOptionList = function(systemConstants) {
		return {
			scope: {
				group: '=',
				level: '@'
			},
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/checkbox-option-list.html",
			controller: CheckboxOptionListCtrl,
			controllerAs: 'list',
			bindToController: true
		};
	};

	CheckboxOptionList.$inject = ['systemConstants'];

	angular.module('aptCPQUI').directive('checkboxOptionList', CheckboxOptionList);

}).call(this);
