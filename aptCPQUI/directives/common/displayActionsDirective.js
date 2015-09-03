/**
 * Directive: DisplayActions
 *   this directive handles display of each left, center, right section of action bars 
 *   DisplayActionsCtrl is used as a controller
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI')
		.directive('displayActions', DisplayActions);

	DisplayActionsCtrl.$inject = ['$log', 
	                              '$state', 
	                              '$stateParams', 
	                              'aptBase.i18nService', 
	                              'CartService', 
	                              'DisplayActionDataService', 
	                              'ActionHandlerService',
	                              'ConfigureService'];
	//controller definition
	function DisplayActionsCtrl($log, $state, $stateParams, i18nService, CartService, DisplayActionDataService, ActionHandlerService, ConfigureService) {
		var displayType;
		var ctrl = this;
		ctrl.labels = i18nService.CustomLabel;
		ctrl.position = 'bottom'; //default
		ctrl.align = 'left'; //default
		
		//TODO: track state change and submit to server only if data is modified since last submit to server
		ctrl.doAction = function(action) {

			if($stateParams.txnPrimaryLineNumber) {
				ConfigureService.updateBundle();
			}
			
			ActionHandlerService.performAction(action).then(function (response) {
				if (!response) {
					return;

				}
				if (response.targetType == "state") {
					$state.go(response.path);
					
				} else if (response.targetType == "IFrame" && response.path != null) {
					ActionHandlerService.setCustomActionDialogUrl(response.path);
					
				} else if (response.targetType == "New Window" && response.path != null) {
					window.open(response.path);

				} else if (response.path != null) { //response.targetType == "Self" || response.targetType == undefined 
					window.location = response.path;
	
				}
			});

		};

		ctrl.actionLabel = function(labelName){
			return ctrl.labels[labelName] || labelName; //custom buttons would not be translated
		};

		ctrl.doInit = function(element) {
			// $log.log('initialize controller, position: ' + ctrl.position +', align: ' + ctrl.align);
			var displayAs = 'Action';
			var actionArea = 'Center';

			if (ctrl.align === 'left') {
				actionArea = 'Left';
			} else if (ctrl.align === 'right') {
				actionArea = 'Right';
			}

			displayType = DisplayActionDataService.setDisplayType($state);
			// console.log('displayType: ' + displayType);

			if (ctrl.position === 'top') {
				displayAs = 'Task';

			} else if (ctrl.position === 'side') {
				displayAs = 'Sidebar Action';

			}

			// $log.log('displayAs:', displayAs);
		    DisplayActionDataService.getDisplayActions(displayType, displayAs, actionArea).then(function(actions) {
			    ctrl.actions = actions;
			    if (element) {
				    var actionBar =  ctrl.getTopParent(element);
				    if (actionBar) {
			    		if (!actions || (actions && actions.length == 0)) {      
			       			actionBar.addClass("no-action-"+ctrl.align);
			      		} else {
			       			actionBar.removeClass("no-action-"+ctrl.align); 
			      		}
			     	}
			    }
			});
		}

		//find Parent node which is Immediate Child of ng-app
		ctrl.getTopParent = function(node){
			if (node && node.parent() && node.parent().attr("ng-app")) {
				return node;
				
			} else if(node && node.parent()) {
				return ctrl.getTopParent(node.parent());	
				
			}
		}


	};
	
	//directive definition
	DisplayActions.$inject = ['systemConstants'];
	function DisplayActions(systemConstants) {
		var directive;
		directive = {
				scope: {
					position: '@',
					align: '@'
				},
				templateUrl: systemConstants.baseUrl + '/templates/directives/common/display-actions-block.html',
				controller: DisplayActionsCtrl,
				controllerAs: 'displayAction',
				bindToController: true,
				link: function (scope, element, attr, controller) {
					controller.position = attr.position;
					if (angular.isDefined(attr.align)) {
						controller.align = attr.align;  
					}
					controller.doInit(element);
				}
		};
		return directive;
	};

}).call(this);
