/**
 * Directive: customActionDialog
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('customActionDialog', CustomActionDialog);

	CustomActionDialog.$inject = ['systemConstants', 'ActionHandlerService'];

	/**
	 * Custom Action Dialog Directive
	 */	
	function CustomActionDialog(systemConstants, ActionHandlerService) {

		return {
			restrict: 'E',
			controller: CustomActionDialogCtrl,
			controllerAs: 'customAction',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + "/templates/directives/common/custom-action-dialog.html"
		};
	}

	CustomActionDialogCtrl.$inject = [
	                                  'lodash',                            
	                                  '$scope',
	                                  '$sce',
	                                  'systemConstants',
	                                  'aptBase.i18nService',
	                                  'ActionHandlerService'
	                                  ];

	/**
	 * Custom Action Dialog controller, used by the directive
	 */ 
	function CustomActionDialogCtrl(_, $scope, $sce, systemConstants, i18nService, ActionHandlerService) {
		var nsPrefix = systemConstants.nsPrefix;
		var ctrl = this;
		ctrl.labels = i18nService.CustomLabel;
		ctrl.pageUrl = '';

		ctrl.close = function() {
			ActionHandlerService.isCustomActionDialogOpen = false;

		};

		ctrl.visible = function() {
			if (ActionHandlerService.isCustomActionDialogOpen) {
				ctrl.pageUrl = $sce.trustAsResourceUrl(ActionHandlerService.getCustomActionDialogUrl());
			}
			return ActionHandlerService.isCustomActionDialogOpen;

		};

		ctrl.open = function() {
			ActionHandlerService.isCustomActionDialogOpen = true;

		};

		return ctrl;

	}

}).call(this);
