/**
 * Service: ActionHandlerService
 * 	defines functions to handle custom action event
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQData').service('ActionHandlerService', ActionHandlerService); 
			
	ActionHandlerService.$inject = ['$q','$log','aptBase.RemoteService', 'ConfigurationDataService', 'CartDataService', 'ConfigureService', 'ConstraintRuleDataService', 'PageErrorDataService'];

	function ActionHandlerService($q, $log, RemoteService, ConfigurationDataService, CartDataService, ConfigureService, ConstraintRuleDataService, PageErrorDataService) {
		var service = this;
		var customActionDialogUrl;
		
		service.isCustomActionDialogOpen = false;
		service.isServerActionInProgress = false;
		
		/**
		 * perform action, some actions are navigational and some require submit to server
		 */
		service.performAction = function(actionInfo) {
			if (!actionInfo.IsEnabled) {
				return $q.when();

			}
			
			var actionName = actionInfo.ActionName;
			
			//TODO: issue save cart when there are changes on the page for every action
			if (actionName == 'AddMoreProducts' || actionName == 'CatalogProducts') {
				return $q.when({targetType: "state", path: "catalog"});
				
			} else if (actionName == 'InstalledProducts') {
				return $q.when({targetType: "state", path: "assets"});
				
			} else if (actionName == 'GoToPricing') {
				return $q.when({targetType: "state", path: "cart"});
				
			} else if (actionName == 'RemoveItem') {
				CartDataService.removeFromCart(ConfigureService.lineItem.data); 
				//do not wait for response
				return $q.when({targetType: "state", path: "catalog"}); //TODO: go back to cart or catalog, based on where user started
				
			} else if (actionName == 'EditPriceAgreement') {
				return $q.when({targetType: "dialog", path: "priceagrement"});
				
			} else if (actionName == 'Reprice') {
				service.isServerActionInProgress = true;
				return CartDataService.repriceCartLineItems().then(
					function (result) {
						service.isServerActionInProgress = false;
						return null;
					},
					function (reason) {
						$log.error('Reprice action failed:', reason);
						service.isServerActionInProgress = false;
					}
				);
				
			} else {
				var includeParams = ['cartLines', 'chargeLines', 'ruleActions'];
				
				return ConfigurationDataService.createCartRequestDO(null, null, null, null, includeParams).then(function(cartRequest) {
					cartRequest.displayAction = angular.copy(actionInfo);
					return RemoteService.performAction(cartRequest).then(
						function (result) {
							//TODO: update browser cached data
							PageErrorDataService.updatePageErrors(result.pageErrors);
							ConstraintRuleDataService.updateRuleActions(result.ruleActions);
							return {targetType: actionInfo.Behavior, path: result.targetPageReference};
							
						}
							
					);
					
				});
				
			} 
			
			
		}
		
		/**
		 * Set custom action dialog URL and set the flag to show dialog 
		 * @param {string} relative URL
		 */
		service.setCustomActionDialogUrl = function(url) {
			customActionDialogUrl = url;
			service.isCustomActionDialogOpen = true;

		}

		/**
		 * Return dialog URL for action dialog
		 */
		service.getCustomActionDialogUrl = function() {
			return customActionDialogUrl;
		}

		
		/**
		 * performs abandon cart action
		 */
		service.abandonCart = function() {
			var actionInfo = {
					ActionLabelName: "Abandon",
					ActionName: "Abandon",
					DisplayAs: "Action",
					IsEnabled: true,
					Sequence: 5
			};
			service.performAction(actionInfo).then(function (response) {
				if (!response) {
					return;
				}
				if (response.targetType == "page" && response.path != null) {
					window.location = response.path;
				}
			});
		}
		
		/**
		 * performs show help action
		 * TODO: show dialog
		 */
		service.showHelp = function() {
			$log.log('showHelp is not implemented');
		}
		
		
	}

})();