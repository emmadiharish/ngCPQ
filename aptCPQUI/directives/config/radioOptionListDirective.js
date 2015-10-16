(function() {
	angular.module('aptCPQUI')
		.directive('radioOptionList', RadioOptionList);
	
	RadioOptionListCtrl.$inject = ['aptBase.i18nService', 'ConfigureService'];
	RadioOptionList.$inject = ['systemConstants'];

	function RadioOptionListCtrl(i18nService, ConfigureService) {
		this.labels = i18nService.CustomLabel;
		this.selectNone = function() {
			if (this.group.selectNone()) {
				ConfigureService.updateBundle();
			}
		};
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

	}

	function RadioOptionList(systemConstants) {
		return {
			scope: {
				group: '=',
				level: '@'
			},
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/radio-option-list.html",
			controller: RadioOptionListCtrl,
			controllerAs: 'list',
			bindToController: true
		};
	}

})();
