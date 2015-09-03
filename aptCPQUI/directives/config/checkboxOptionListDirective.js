(function() {
	var CheckboxOptionList, CheckboxOptionListCtrl;

	CheckboxOptionListCtrl = function() {
		this.getLevel = function() {
			return parseInt(this.level);
		};
		return this;
	};

	CheckboxOptionListCtrl.$inject = [];

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
