/**
 * Directive: configureProductNav
 * 	handles attributes and options tabs 
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('configureProductNav', ConfigureProductNav);

	ConfigureProductNav.$inject = ['systemConstants'];
	function ConfigureProductNav(systemConstants) {
		return {
			scope: {
				view: '='
			},
			controller: ConfigureProductNavCtrl,
			controllerAs: 'nav',
			bindToController: true,
			link: configureProductNavLink,
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/configure-product-nav.html"
		};
	};

	var configureProductNavLink = function(scope, elem, attrs) {}; //TODO: remove this

	ConfigureProductNavCtrl.$inject = ['$state', '$stateParams', 'aptBase.i18nService', 'systemConstants', 'ConfigureService'];

	function ConfigureProductNavCtrl($state, $stateParams, i18nService, systemConstants, ConfigureService) {
		var ctrl = this;
		var showTabView = !!systemConstants.customSettings.optionsPageSettings.TabViewInConfigureBundle;

		ctrl.labels = i18nService.CustomLabel;
		
		ctrl.showAttributesTab = function() {
			return ConfigureService.lineItem.hasAttrs() && showTabView == false;
		};
		
		ctrl.showOptionsTab = function() {
			return ConfigureService.lineItem.hasOptions() && showTabView == false;
		};

		ctrl.showTabView = function() {
			return showTabView;
		};

		ctrl.changeView = function(newView) {
			var tpln = $stateParams.txnPrimaryLineNumber;

			return $state.go('configure', {
				txnPrimaryLineNumber: tpln,
				step: newView
			});
		};
		
		ctrl.showGroup = function(optionGroup) {
			//$log.debug('showGroup', optionGroup);
			if (ConfigureService.lastActiveGroup) {
				ConfigureService.lastActiveGroup.isActive = false;
			}
			optionGroup.isActive = true;
			ConfigureService.lastActiveGroup = optionGroup;
			ConfigureService.activeOptionGroup = optionGroup; 
		};
		
		ctrl.getTopOptionGroups = function() {
			if (ctrl.optionGroups) {
				return ctrl.optionGroups;
				
			} else {
				return ConfigureService.getOptionGroups().then(function(result) {
					ctrl.optionGroups = result;
					var firstGroup;
					angular.forEach(ctrl.optionGroups, function(optionGroup, key) {
						if (angular.isUndefined(firstGroup) && optionGroup.isHidden == false) {
							firstGroup = optionGroup;
							
						} else {
							optionGroup.isActive = false;
							
						}
					});
					
					if (firstGroup) {
						ctrl.showGroup(firstGroup); //first option group active by default
					}
					
					return ctrl.optionGroups;
				});
				
			}
		}
		
		return ctrl;
		
	};

}).call(this);
