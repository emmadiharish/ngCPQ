/**
 * Directive: optionGroups
 * 	Option Group display
 */
;(function() {
	angular.module('aptCPQUI').directive('optionGroups', OptionGroups);

	OptionGroups.$inject = ['systemConstants'];
	
	function OptionGroups(systemConstants) {
		return {
			restrict: 'E',
			scope: {
				lineItem: '=',
				level: '@'
			},
			controller: OptionGroupsCtrl,
			controllerAs: 'groupsCtrl',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/option-groups.html"
		};

	}

	OptionGroupsCtrl.$inject = [
	                            '$sce',
	                            'systemConstants',
	                            'aptBase.i18nService',
	                            'ConfigureService'
	                            ];

	function OptionGroupsCtrl($sce, systemConstants, i18nService, ConfigureService) {
		var groupsCtrl = this;
		var showTabView = !!systemConstants.customSettings.optionsPageSettings.TabViewInConfigureBundle;
		
		groupsCtrl.labels = i18nService.CustomLabel;
		groupsCtrl.customSettings = systemConstants.customSettings;
		groupsCtrl.getLevel = getLevel;
		groupsCtrl.showAttributesInline = showAttributesInline;
		groupsCtrl.showDetailsInline = showDetailsInline;
		groupsCtrl.showTabView = showTabView;
		groupsCtrl.hasAttrConfig = hasAttrConfig;
		groupsCtrl.getPageUrl = getPageUrl;
		groupsCtrl.renderHTML = renderHTML;
		
		
		function showAttributesInline() {
			return !showTabView && groupsCtrl.lineItem.hasAttrs() && !groupsCtrl.lineItem.isTopLevel();

		}

		function showDetailsInline() {
			return !showTabView && !groupsCtrl.lineItem.isTopLevel();

		}
				
		function getLevel() {
			return parseInt(groupsCtrl.level);

		}

		function hasAttrConfig() {
			return groupsCtrl.lineItem.hasAttrs() && !groupsCtrl.lineItem.isTopLevel();

		}
		
		function getPageUrl(optionGroup) {
			var pageUrl = ConfigureService.formatPageUrl(optionGroup);
			return $sce.trustAsResourceUrl(pageUrl);
		
		}

		function renderHTML(html_code) {
			return $sce.trustAsHtml(html_code);
		}
		
		return groupsCtrl;

	}

})();
