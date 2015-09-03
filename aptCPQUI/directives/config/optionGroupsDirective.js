(function() {
	angular.module('aptCPQUI')
		.directive('optionGroups', OptionGroups);
	
	OptionGroups.$inject = ['systemConstants'];

	OptionGroupsCtrl.$inject = [
		'$sce',
		'aptBase.i18nService',
		'ConfigureService'
	];

	function OptionGroups(systemConstants) {
		return {
			scope: {
				lineItem: '=',
				level: '@'
			},
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/option-groups.html",
			controller: OptionGroupsCtrl,
			controllerAs: 'groupsCtrl',
			bindToController: true,
			restrict: 'E'
		};
		
	}

	function OptionGroupsCtrl($sce, i18nService, Configure) {
		var groupsCtrl = this;
		groupsCtrl.config = Configure;
		groupsCtrl.labels = i18nService.CustomLabel;
		groupsCtrl.getLevel = getLevel;
		groupsCtrl.hasAttrConfig = hasAttrConfig;
		groupsCtrl.renderHTML = renderHTML;

		return groupsCtrl;

		function getLevel() {
			return parseInt(groupsCtrl.level);

		}

		function hasAttrConfig() {
			return groupsCtrl.lineItem.hasAttrs() && !groupsCtrl.lineItem.isTopLevel();

		}
		
		function renderHTML(html_code) {
			return $sce.trustAsHtml(html_code);
		}

	}

})();
