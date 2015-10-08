/**
 * Service: ActionHandlerService
 * 	defines functions to handle custom action event
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQData').service('ActionHandlerService', ActionHandlerService); 
			
	ActionHandlerService.$inject = [
		'$q',
		'$log',
		'aptBase.RemoteService',
		'aptBase.ActionQueueService',
		'ConfigurationDataService', 
		'LineItemCache', 
		'CartDataService', 
		'ConfigureService', 
		'ConstraintRuleDataService', 
		'PageErrorDataService'
	];

	function ActionHandlerService($q, 
									$log, 
									RemoteService, 
									ActionQueueService, 
									ConfigurationDataService, 
									LineItemCache, 
									CartDataService, 
									ConfigureService, 
									ConstraintRuleDataService, 
									PageErrorDataService) {
		/** Init private variables */
		var service = this;
		var customActionDialogUrl;
		var pendingDisplayActions = [];
		/** Init public variables */
		service.isCustomActionDialogOpen = false;
		service.isServerActionInProgress = false;
		/** Ensure calls to display action follow queue */
		ActionQueueService.registerAction(submitDisplayAction, 40, 'submitDisplayAction');

		/**
		 * Function for enqueing execution of display action(s)
		 * @param  {Object} previousResult whatever came out of the queue last
		 * @return {Object}                Action result with Behavior and a page reference
		 */
		function submitDisplayAction(previousResult) {
			if (!pendingDisplayActions.length) {
				return previousResult;

			}
			var nextAction = pendingDisplayActions.shift();
			var includeParams = [
				// ConfigurationDataService.includeConstants.CART_LINES,
				// ConfigurationDataService.includeConstants.CHARGE_LINES,
				// ConfigurationDataService.includeConstants.TOTAL_ITEMS,
				ConfigurationDataService.includeConstants.RULE_ACTIONS
			];
			
			return ConfigurationDataService.createCartRequestDO(null, null, null, null, includeParams).then(
				function (cartRequest) {
					cartRequest.displayAction = angular.copy(nextAction);
					return RemoteService.performAction(cartRequest).then(
						function (result) {
							// LineItemCache.putLineItemDOs(result.lineItems, CartDataService.createLineItemModel);
							// LineItemCache.removeLineItems(result.deletedPrimaryLineNumbers, true);
							ConstraintRuleDataService.updateRuleActions(result.ruleActions);
							PageErrorDataService.add(result.pageErrors.errorMessages);
							return {
								targetType: nextAction.Behavior,
								path: result.targetPageReference
							};
						}
					);
				}
			);

		}


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
				CartDataService.removeFromCart(ConfigureService.lineItem.lineItemDO); 
				//do not wait for response
				return $q.when({targetType: "state", path: "catalog"}); //TODO: go back to cart or catalog, based on where user started
				
			} else if (actionName == 'EditPriceAgreement') {
				return $q.when({targetType: "dialog", path: "priceagrement"});
				
			} else if (actionName == 'Reprice') {
				service.isServerActionInProgress = true;
				return CartDataService
								.repriceCartLineItems()
								.finally(function () {
									service.isServerActionInProgress = false;
								});
				
			} else {
				pendingDisplayActions.push(actionInfo);
				service.isServerActionInProgress = true;
				//Have cart data service schedule update action.
				CartDataService.updateCartLineItems();
				return ActionQueueService
								.scheduleAction('submitDisplayAction')
								.finally(function () {
									service.isServerActionInProgress = false;
								});
				
			}
			
		};
		
		/**
		 * Set custom action dialog URL and set the flag to show dialog 
		 * @param {string} relative URL
		 */
		service.setCustomActionDialogUrl = function(url) {
			customActionDialogUrl = url + '&a1a1=' + Math.random();
			service.isCustomActionDialogOpen = true;

		};

		/**
		 * Return dialog URL for action dialog
		 */
		service.getCustomActionDialogUrl = function() {
			return customActionDialogUrl;
		};

		
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
				if (response.path != null) {
					window.location = response.path;
				}
			});

		};
		
		/**
		 * performs show help action
		 * TODO: show dialog
		 */
		service.showHelp = function() {
			$log.log('showHelp is not implemented');
		};
		
	}

})();