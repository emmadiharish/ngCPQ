/**
 * Directive: mainCart 
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('mainCart', MainCart);

	MainCart.$inject = ['systemConstants'];

	function MainCart(systemConstants) {
		return {
			link: MainCartLink,
			controller: MainCartCtrl,
			controllerAs: 'mainCart',
			bindToController: true
		};

	}

	MainCartCtrl.$inject = [
	                        '$q',
	                        '$log',
	                        '$state',
	                        '$stateParams',
	                        'aptBase.i18nService',
	                        'systemConstants',
	                        'CartService',
	                        'ActionHandlerService',
	                        'CatalogDataService'
	                        ];

	function MainCartCtrl($q, $log, $state, $stateParams, i18nService, systemConstants, CartService, ActionHandlerService, CatalogDataService) {
		var mainCart = this;
		mainCart.view = $stateParams.view;
		mainCart.dateFormat = systemConstants.dateFormat;
		mainCart.itemsPerPage = systemConstants.customSettings.systemProperties.LineItemsPerPage;
		mainCart.labels = i18nService.CustomLabel;
		mainCart.cartState;

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
		mainCart.isLineSelected = function(lineItem) {
			return lineItem.isSelected ? lineItem.isSelected() : false;
		};
		mainCart.isFieldEditable = function(chargeLine, column) {
			var isReadOnly = angular.isDefined(chargeLine.readOnlyFields) && chargeLine.readOnlyFields.indexOf(column.FieldName) > -1;
			return column.IsEditable && !isReadOnly;
		};
		mainCart.isFieldHidden = function(chargeLine, column) {
			return chargeLine.hiddenFields && chargeLine.hiddenFields.indexOf(column.FieldName) > -1;
		};
		mainCart.isDynamicField = function(fieldType) {
			return angular.isUndefined(fieldType) || String(fieldType).toUpperCase() !== "GUIDANCE";
		};
		mainCart.isGuidanceField = function(fieldType) {
			return angular.isDefined(fieldType) && String(fieldType).toUpperCase() === "GUIDANCE";
		};
		mainCart.getLineItemSequence = function(lineItem) {
			var primaryChargeLine = lineItem.chargeLines[0].lineItemSO;
			return primaryChargeLine[nsPrefix + 'LineSequence__c'];
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
		mainCart.changeCartState = function() {
            if(mainCart.cartState == 'Location') {
                $state.go('location-cart');
            } 
        };
        mainCart.hasGroupByFieldsValues = function() {
        	return mainCart.groupByColumnFields.length > 1; // return true if groupByValues available other than product.
        };

		function activate() {
			return $q.all([CartService.getCartLineItems(), CartService.getCartColumns(), CartService.getCheckboxModels(), CartService.getCartLocations()]).then(function(res) {
				var columns;
				mainCart.cartLineItems = res[0];
				columns = res[1];
				mainCart.checkBoxes = CartService.cartCheckBoxModels;
				mainCart.groupByColumnFields = [];
				mainCart.cartLocations = res[3];

				mainCart.columnTypes = columns.map(function(column) {
					var replace_r;
					if (column.FieldType === 'REFERENCE') {
						replace_r = column.FieldName.replace('__c', '__r');
						column.FieldName = replace_r;
						//TODO: support modifying reference fields
						column.IsEditable = false;
					}
					if (column.FieldName.indexOf('ProductId__r') > -1) {
						column.FieldType = 'DETAIL';
						mainCart.groupByColumnFields.push(column.Label);
						mainCart.cartState = column.Label;
					} else if (column.FieldName.indexOf('ChargeType') > -1) {
						column.FieldType = 'CHARGETYPE';
						mainCart.chargeKey = column.FieldName;
					} else if (column.FieldName.indexOf('Quantity') > -1) {
						column.FieldType = 'QUANTITY';
					} else if(column.FieldName.indexOf('LocationId__r') > -1 && mainCart.cartLocations.length > 0) {
						mainCart.groupByColumnFields.push(column.Label);
                    } else if (column.FieldName.indexOf('Guidance__c') > -1) {
                        column.FieldType = 'GUIDANCE';
                    }
					return column;
				});
				mainCart.tableColumns = mainCart.columnTypes.filter(function(column) {
					if (column.FieldName.indexOf('ChargeType') <= -1) {
						return true;
					}
				});
				return mainCart.columns;
			});
		};

		//initialize
		activate();

	}

	//link function for the directive
	function MainCartLink(scope, elem, attr) {
		var body = elem[0];
		var header = body.querySelector('cart-header');
		var globalHeader = document.querySelector('.header-global');
		var processTrail = document.querySelector('.process-trail');
		var mainCart = document.querySelector('.main-cart-container');

		var scrollHandler = function(ev) {
			var bodyRect = body.getBoundingClientRect();
			var headerRect = header.getBoundingClientRect();
			var globalHeaderRect = globalHeader.getBoundingClientRect();
			var processTrailRect = processTrail.getBoundingClientRect();
			var cartColumnHeaderHeight = document.querySelector(".cart-label-row").getBoundingClientRect().height;
			var mainCartRect = mainCart.getBoundingClientRect();

			if (mainCartRect.top - globalHeaderRect.height <= 1) {
				if(Math.abs(mainCartRect.top - (globalHeaderRect.height + cartColumnHeaderHeight)) <= mainCartRect.height){
					body.classList.add('main-cart-wrapper--header-fixed');
					// 97 = Cart Header Height
					angular.element(mainCart).css("marginTop", "97px");
				}
				else{
					body.classList.remove('main-cart-wrapper--header-fixed');
					angular.element(mainCart).css("marginTop","-17px");
				}
			} else {
				body.classList.remove('main-cart-wrapper--header-fixed');
				angular.element(mainCart).css("marginTop","0px");
			}
		};

		return window.addEventListener('scroll', scrollHandler);

	}

})();
