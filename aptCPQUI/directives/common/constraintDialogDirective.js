/**
 * Directive: constraintDialog
 * 	used to display constraint rule prompt
 */
;(function() {
	'use strict';

	ModalDialog.$inject = ['systemConstants'];
	angular.module('aptCPQUI').directive('constraintDialog', ModalDialog);

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
	 * Modal Dialog controller, used by the directive
	 */ 
	function ConstraintDialogCtrl($log, $scope, _, systemConstants, i18nService, ConstraintRuleDataService, CatalogDataService, CartDataService) {
		var nsPrefix = systemConstants.nsPrefix;
		var ctrl = this;
		ctrl.labels = i18nService.CustomLabel;
		ctrl.visible = false;
		ctrl.selectedProducts = [];
		ctrl.promptMessage;
		ctrl.promptItems = [];
		ctrl.addedItems = {};

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

		ctrl.addToCart = function() {
			var targetBundleNumber = ctrl.activePrompt[nsPrefix + 'TargetBundleNumber__c'];
			if (targetBundleNumber === 0 || targetBundleNumber === '') { //add as primary line
				CartDataService.addToCart(angular.copy(ctrl.selectedProducts));
				
			} else { //add to bundle
				CartDataService.addToBundle(targetBundleNumber, angular.copy(ctrl.selectedProducts));
				
			}
			
			if (ctrl.minSelected()) {
				ConstraintRuleDataService.markAsProcessed(ctrl.activePrompt);
			}
			
			ctrl.close(); //TODO: keep it open until min-required is met, refresh the dialog content
			
		};

		ctrl.removeFromCart = function() {
			var selectedProductIds = [];
			var lineItemsToDelete = [];

			_.each(ctrl.selectedProducts, function(product) {
				selectedProductIds.push(product.productSO.Id);
			});

			var affectedPrimaryNumbers = ctrl.activePrompt[nsPrefix + 'AffectedPrimaryNumbers__c'].split(/,\W*/);
			
			CartDataService.getLineItems(affectedPrimaryNumbers).then(function(result) {
				_.each(result, function(lineItem) {
					if (_.contains(selectedProductIds, lineItem.lineItemSO[nsPrefix + 'ProductId__c'])) {
						lineItemsToDelete.push(lineItem);
					}
				});

				CartDataService.removeFromCart(lineItemsToDelete);
				
			});
			
			ctrl.close(); //TODO: keep it open until min-required is met, refresh the dialog content

		};

		ctrl.ignoreRuleAction = function() {
			ConstraintRuleDataService.ignoreRuleAction(ctrl.activePrompt);
			ctrl.close();
		};

		ctrl.open = function() {
			return ctrl.visible = true;
		};

		ctrl.prompt = function() {
			ctrl.addedItems = {};
			//ctrl.selectedProducts.length = 0;
			ctrl.activePrompt = ConstraintRuleDataService.getNextPrompt();
			return ctrl.activePrompt;
		};

		ctrl.isActionTypeInclusion = function() {
			if(ctrl.activePrompt) {
				if(ctrl.activePrompt[nsPrefix + 'ConstraintRuleActionId__r'][nsPrefix + 'ActionType__c'] === 'Inclusion') {
					return true;
				} else {
					return false;
				}	
			}
			
		};

		ctrl.promptMessage = function() {
			if(ctrl.activePrompt) {
				return ctrl.activePrompt[nsPrefix + 'Message__c'];
			}
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

		$scope.$watch((function(_this) {
			return function() {
				return _this.prompt();
			};

		})(ctrl), (function(_this) {
			return function(newValue, oldValue) {
				if (newValue) {
					var ref = _this.prompt();
					if (ref == null) {
						return _this.close();
					}
					
					_this.promptMessage = ref[nsPrefix + 'Message__c'];
					
					var actionType = ref[nsPrefix + 'ConstraintRuleActionId__r'][nsPrefix + 'ActionType__c'];
					var promptProductIds = [];
					
					//Inclusion type rules
					if (actionType == 'Inclusion') {
						var ref1 = ref[nsPrefix + 'SuggestedProductIds__c'];
						var suggestedProductIds = ref1 != null ? ref1.split(/,\W*/) : [];
						promptProductIds = suggestedProductIds;
						
						var ref2 = ref[nsPrefix + 'AffectedProductIds__c'];
						if (ref2 != null) {
							var affectedProductIds = ref2.split(/,\W*/);
							promptProductIds = _.difference(suggestedProductIds, affectedProductIds);
						}
						
					}
					
					//Exclusion type rules
					if (actionType == 'Exclusion') {
						var ref3 = ref[nsPrefix + 'ActionProductIds__c'];
						var actionProductIds = ref3 != null ? ref3.split(/,\W*/) : [];
						promptProductIds = actionProductIds;
					
					}
					
					return CatalogDataService.getProductsByIds(promptProductIds).then(function(resp) {
						angular.forEach(resp.products, function(value, key){
							//TODO: check why we get a number, also make sure we only get array not array of array
							if (angular.isObject(value)) { 
								if (angular.isArray(value)) {
									angular.forEach(value, function(value2, key2){
										if (_this.addedItems[value2.productSO.Id] !== true) {
											_this.promptItems.push(value2);
											_this.addedItems[value2.productSO.Id] = true;
										}	
									});
								} else {
									if (_this.addedItems[value.productSO.Id] !== true) {
										_this.promptItems.push(value);
										_this.addedItems[value.productSO.Id] = true;
									}
								}
							}

						});
						return _this.open();

					});
				} else {
					return _this.close();

				}
			};
		})(ctrl));

		return ctrl;

	};

	/**
	 * Modal Dialog Directive
	 */	
	function ModalDialog(systemConstants) {
		return {
			restrict: 'AE',
			templateUrl: systemConstants.baseUrl + "/templates/directives/common/constraint-dialog.html",
			controller: ConstraintDialogCtrl,
			controllerAs: 'ctrl',
			bindToController: true
		};
	};


}).call(this);
