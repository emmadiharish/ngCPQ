/**
 * Directive: mainCart 
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('mainCart', MainCart);

	MainCartCtrl.$inject = [
	                        '$q',
	                        '$log',
	                        '$stateParams',
	                        'systemConstants',
	                        'CartService',
	                        'ActionHandlerService',
	                        'CatalogDataService'
	                        ];

	function MainCartCtrl($q, $log, $stateParams, systemConstants, CartService, ActionHandlerService, CatalogDataService) {
		var mainCart = this;
		mainCart.view = $stateParams.view;
		mainCart.dateFormat = systemConstants.dateFormat;
		var nsPrefix = systemConstants.nsPrefix;

		mainCart.sortableSettings = { 
				handle: '.line-item-row--draggable',
				scroll: true,
				scrollSensitivity: 80,
				group: 'lineItem',
				onEnd: function (endEvent) {
					//Should show spinner until event finishes?
					CartService.resequenceLineItems(endEvent.model, endEvent.oldIndex, endEvent.newIndex);
				}
		};

		mainCart.getIsPricingComplete = function (chargeLine) {
			var status = chargeLine.lineItemSO[nsPrefix + 'PricingStatus__c'];
			return  status && status !== 'Pending';
		};
		mainCart.getIsItemConfigurable = function (lineItem) {
			var primaryChargeLine = lineItem.chargeLines[0].lineItemSO;
			return primaryChargeLine[nsPrefix + 'HasAttributes__c'] || primaryChargeLine[nsPrefix + 'HasOptions__c'];
		};
		mainCart.isFieldEditable = function(chargeLine, column) {
			var isReadOnly = angular.isDefined(chargeLine.readOnlyFields) && chargeLine.readOnlyFields.indexOf(column.FieldName) > -1;
			return column.IsEditable && !isReadOnly;
		};
		mainCart.isFieldHidden = function(chargeLine, column) {
			return chargeLine.hiddenFields && chargeLine.hiddenFields.indexOf(column.FieldName) > -1;
		};
		mainCart.getOptionDomId = function (optionLineItem) {
			// var primaryChargeLine = optionLineItem.chargeLines[0].lineItemSO;
			// return primaryChargeLine[nsPrefix + 'OptionId__r'].Id + optionLineItem.txnPrimaryLineNumber;
			return optionLineItem.txnPrimaryLineNumber;
		};
		mainCart.getOptionName = function (optionLineItem) {
			var primaryChargeLine = optionLineItem.chargeLines[0].lineItemSO;
			return primaryChargeLine[nsPrefix + 'OptionId__r'].Name;
		};
		mainCart.getColumnData = function(columnField) {
			return mainCart.item.lineItemSO[columnField];
		};
		mainCart.getLineItemSequence = function(lineItem) {
			var primaryChargeLine = lineItem.chargeLines[0].lineItemSO;
			return primaryChargeLine[nsPrefix + 'LineSequence__c'];
		};
		mainCart.checkBoxSelected = function() {
			return $log.debug('checked');
		};
		mainCart.millisToDateString = function(millisVal) {
			return (millisVal ? new Date(millisVal).toUTCString() : null);
		};
		mainCart.checkLineItem = function(lineItem) {
			// CartService.checkLineItem(lineItem);
		};
		mainCart.isServerActionInProgress = function() {
			return ActionHandlerService.isServerActionInProgress;

		};
		mainCart.openProductSummary = function(productId) {
			return CatalogDataService.setProductSummaryId(productId);

		};
		mainCart.openRamp = function(lineItem) {
    		return CartService.setRampDetails(lineItem);
  	
	    };
		mainCart.getIsRampEnabled = function(lineItem) {
			var priceListItem = lineItem.chargeLines[0].lineItemSO[nsPrefix+ 'PriceListItemId__r'];

			if(angular.isDefined(priceListItem)) {
				return priceListItem[nsPrefix + 'EnablePriceRamp__c'];	
			}
		
		};


		var activate = function() {
			return $q.all([CartService.getCartLineItems(), CartService.getCartColumns(), CartService.getCheckboxModels()]).then(function(res) {
				var columns;
				mainCart.cartLineItems = res[0];
				columns = res[1];
				mainCart.checkBoxes = CartService.cartCheckBoxModels;
				mainCart.columnTypes = columns.map(function(element) {
					var replace_r;
					if (element.FieldType === 'REFERENCE') {
						replace_r = element.FieldName.replace('__c', '__r');
						element.FieldName = replace_r;
					}
					if (element.FieldName.indexOf('ProductId__r') > -1) {
						element.FieldType = 'DETAIL';
					} else if (element.FieldName.indexOf('ChargeType') > -1) {
						element.FieldType = 'CHARGETYPE';
						mainCart.chargeKey = element.FieldName;
					} else if (element.FieldName.indexOf('Quantity') > -1) {
						element.FieldType = 'QUANTITY';
					}
					return element;
				});
				mainCart.tableColumns = mainCart.columnTypes.filter(function(element) {
					if (element.FieldName.indexOf('ChargeType') <= -1) {
						return true;
					}
				});
				return mainCart.columns;
			});
		};

		//initialize
		activate();

	};

	//link function for the directive
	function MainCartLink(scope, elem, attr) {
		var body = elem[0];
		var header = body.querySelector('cart-header');
		var globalHeader = document.querySelector('.header-global');
		var processTrail = document.querySelector('.process-trail');
		
		var scrollHandler = function(ev) {
			var bodyRect, globalHeaderRect, headerRect, processTrailRect;
			bodyRect = body.getBoundingClientRect();
			headerRect = header.getBoundingClientRect();
			globalHeaderRect = globalHeader.getBoundingClientRect();
			processTrailRect = processTrail.getBoundingClientRect();

			if (bodyRect.top <= 1) {
				body.classList.add('main-cart-wrapper--header-fixed');
			} else {
				return body.classList.remove('main-cart-wrapper--header-fixed');
			}
		};
		return window.addEventListener('scroll', scrollHandler);
	};

	MainCart.$inject = ['systemConstants'];

	function MainCart(systemConstants) {
		var directive;
		directive = {
				link: MainCartLink,
				controller: MainCartCtrl,
				controllerAs: 'mainCart',
				bindToController: true
		};
		return directive;
	};

}).call(this);
