/**
 * Directive: constraintDialog
 * 	used to display constraint rule prompt
 */
;(function() {
	'use strict';
	angular.module('aptCPQUI').directive('constraintDialog', ConstraintDialog);

	ConstraintDialog.$inject = ['systemConstants'];

	ConstraintDialogCtrl.$inject = [
	                           '$log',                            
	                           '$scope',
	                           'lodash',
	                           'systemConstants',
	                           'aptBase.i18nService',
	                           'ConstraintRuleDataService',
	                           'CatalogDataService',
	                           'CartDataService'
	                           ];

	
	/**
	 * Modal Dialog Directive
	 */	
	function ConstraintDialog(systemConstants) {
		return {
			restrict: 'AE',
			controller: ConstraintDialogCtrl,
			controllerAs: 'ctrl',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + "/templates/directives/common/constraint-dialog.html"
		};

	}

	/**
	 * Constraint Dialog controller
	 */ 
	function ConstraintDialogCtrl($log, $scope, _, systemConstants, i18nService, ConstraintRuleDataService, CatalogDataService, CartDataService) {
		var nsPrefix = systemConstants.nsPrefix;
		var ctrl = this;
		ctrl.labels = i18nService.CustomLabel;
		ctrl.visible = false;
		ctrl.selectedProducts = [];
		ctrl.promptItems = [];
		ctrl.addedItems = {};
		// ctrl.promptMessage;

		ctrl.close = function() {
			ctrl.visible = false;
			ctrl.promptItems.length = 0;
			ctrl.selectedProducts.length = 0;			
			ctrl.addedItems = {};
			ctrl.activePrompt = ConstraintRuleDataService.getNextPrompt();
			if (angular.isDefined(ctrl.activePrompt)) {
				ctrl.visible = true;
			}
			return ctrl.activePrompt;
		};

		/** Perform rule action based on action type */
		ctrl.performRuleAction = function() {
			var actionType = ctrl.activePrompt[nsPrefix + 'ConstraintRuleActionId__r'][nsPrefix + 'ActionType__c'];
			if (actionType === ConstraintRuleDataService.ACTIONTYPE_INCLUDE) {
				ctrl.addSelectedProducts();

			} else if (actionType === ConstraintRuleDataService.ACTIONTYPE_EXCLUDE) {
				ctrl.removeSelectedProducts();

			}

		}; 

		ctrl.addSelectedProducts = function() {
			var targetBundleNumber = ctrl.activePrompt[nsPrefix + 'TargetBundleNumber__c'];
			if (!targetBundleNumber) { //add as primary line
				CartDataService.addToCart(angular.copy(ctrl.selectedProducts));
				
			} else { //add to bundle
				CartDataService.addToBundle(targetBundleNumber, ctrl.selectedProducts);
				
			}
			
			if (ctrl.minSelected()) {
				ConstraintRuleDataService.markAsProcessed(ctrl.activePrompt);

			}
			//TODO: keep it open until min-required is met, refresh the dialog content
			ctrl.close();
			
		};

		ctrl.removeSelectedProducts = function() {
			var targetBundleNumber = ctrl.activePrompt[nsPrefix + 'TargetBundleNumber__c'];
			if (!targetBundleNumber) {
				//Find affected primary lines with matching products and remove them.
				var selectedProductIds = {};
				_.forEach(ctrl.selectedProducts, function(product) {
					selectedProductIds[product.productSO.Id] = true;
				});

				var affectedPrimaryNumbers = ctrl.activePrompt[nsPrefix + 'AffectedPrimaryNumbers__c'].split(/,\W*/);
				CartDataService.getLineItems(affectedPrimaryNumbers).then(function(result) {
					//Filter to find only lines with matching products
					lineItemsToDelete = _.filter(result, function(nextLineItem) {
						return selectedProductIds[nextLineItem.productId()];

					});
					CartDataService.removeFromCart(lineItemsToDelete);
					
				});	

			} else {
				//Handle remove of options from bundle
				CartDataService.removeFromBundle(targetBundleNumber, ctrl.selectedProducts);
				
			}

			if (ctrl.minSelected()) {
				ConstraintRuleDataService.markAsProcessed(ctrl.activePrompt);

			}
			//TODO: keep it open until min-required is met, refresh the dialog content
			ctrl.close();

		};

		ctrl.ignoreRuleAction = function() {
			ConstraintRuleDataService.ignoreRuleAction(ctrl.activePrompt);
			ctrl.close();
		};

		ctrl.open = function() {
			ctrl.visible = true;
			return ctrl.visible;
		};

		ctrl.prompt = function() {
			ctrl.addedItems = {};
			//ctrl.selectedProducts.length = 0;
			ctrl.activePrompt = ConstraintRuleDataService.getNextPrompt();
			return ctrl.activePrompt;
		};

		ctrl.minSelected = function() {
			if (ctrl.activePrompt) {
				return ctrl.selectedProducts.length >= ctrl.activePrompt[nsPrefix + 'RequiredMin__c'];

			} else {
				return false;

			}

		};

		ctrl.selectProduct = function(product) {
			if (_.includes(ctrl.selectedProducts, product)) {
				return _.pull(ctrl.selectedProducts, product);

			} else {
				return ctrl.selectedProducts.push(product);

			}
		};

		function dialogWatchExpression() {
			return ctrl.prompt();

		}

		function dialogWatchListener(newValue, oldValue) {
			if (newValue) {
				var activePrompt = ctrl.prompt();
				if (activePrompt == null) {
					return ctrl.close();

				}
				ctrl.promptMessage = activePrompt[nsPrefix + 'Message__c'];
				var actionType = activePrompt[nsPrefix + 'ConstraintRuleActionId__r'][nsPrefix + 'ActionType__c'];
				var promptProductIds = [];
				
				if (actionType == ConstraintRuleDataService.ACTIONTYPE_INCLUDE) {
					//Inclusion type rules
					var suggestedIdString = activePrompt[nsPrefix + 'SuggestedProductIds__c'];
					var suggestedProductIds = suggestedIdString != null ? suggestedIdString.split(/,\W*/) : [];
					promptProductIds = suggestedProductIds;
					
					var affectedIdString = activePrompt[nsPrefix + 'AffectedProductIds__c'];
					if (affectedIdString != null) {
						var affectedProductIds = affectedIdString.split(/,\W*/);
						promptProductIds = _.difference(suggestedProductIds, affectedProductIds);

					}
					if (activePrompt[nsPrefix + 'TargetBundleNumber__c']) {
						ctrl.ruleActionLabel = ctrl.labels.AddToBundle;
					
					} else {
						ctrl.ruleActionLabel = ctrl.labels.AddToCart;	

					}
					
				} else if (actionType == ConstraintRuleDataService.ACTIONTYPE_EXCLUDE) {
					//Exclusion type rules
					var actionIdString = activePrompt[nsPrefix + 'ActionProductIds__c'];
					var actionProductIds = actionIdString != null ? actionIdString.split(/,\W*/) : [];
					promptProductIds = actionProductIds;

					if (activePrompt[nsPrefix + 'TargetBundleNumber__c']) {
						ctrl.ruleActionLabel = ctrl.labels.RemoveOption;
					
					} else {
						ctrl.ruleActionLabel = ctrl.labels.RemoveFromCart;	
						
					}
				
				}
				
				return CatalogDataService.getProductsByIds(promptProductIds).then(function(resp) {
					angular.forEach(resp.products, function(value, key){
						//TODO: check why we get a number, also make sure we only get array not array of array
						if (angular.isObject(value)) { 
							if (angular.isArray(value)) {
								angular.forEach(value, function(value2, key2){
									if (ctrl.addedItems[value2.productSO.Id] !== true) {
										ctrl.promptItems.push(value2);
										ctrl.addedItems[value2.productSO.Id] = true;
									}	
								});
							} else {
								if (ctrl.addedItems[value.productSO.Id] !== true) {
									ctrl.promptItems.push(value);
									ctrl.addedItems[value.productSO.Id] = true;
								}
							}
						}

					});
					return ctrl.open();

				});
			} else {
				return ctrl.close();

			}

		}

		$scope.$watch(dialogWatchExpression, dialogWatchListener);

		return ctrl;

	}

}).call(this);
