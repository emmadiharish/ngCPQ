/**
 * Service: CartService
 * 	invokes functions from CartDataService
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQUI').service('CartService', CartService);

	CartService.$inject = [
	                       '$http',  
	                       'systemConstants',
	                       'aptBase.UtilService', 
	                       'CartDataService',
	                       'CategoryService',
	                       'LineItemSupport'
	                       ];

	function CartService($http, systemConstants, UtilService, CartDataService, CategoryService, LineItemSupport) {
		var nsPrefix, _cartColumnDetailAsFirstNode, _cartColumnsWithTypeClassNames, _checkBoxIdsToModels, _flattenOpts, _getLineItemIds, _getLineItemOptionLines, _getOptionsIds, _getlineItemsWithOptions, _setNullFieldTypes, _removeDetailNode;
		var service = this;
		nsPrefix = systemConstants.nsPrefix;

		service.isRampDialogOpen = false;

		service.ramp = {
			"lineItem": null,
		};

		service.setRampDetails = function(lineItem) {
			service.ramp.lineItem = angular.copy(lineItem);
			service.isRampDialogOpen = true;

		};

		service.addRampLine = function(rampLine) {
			var currentRampIndex = service.ramp.lineItem.rampLines.indexOf(rampLine);
			var clonedRampLine = LineItemSupport.newLineItemsFromClone(rampLine);

			if(angular.isDefined(clonedRampLine.lineItemSO[nsPrefix + 'EndDate__c'])) {
				var endDate = new Date(clonedRampLine.lineItemSO[nsPrefix + 'EndDate__c']);
				var newStartDate = endDate.setDate(endDate.getDate() + 1);
				clonedRampLine.lineItemSO[nsPrefix + 'StartDate__c'] = newStartDate;
			}

			if(angular.isDefined(clonedRampLine.lineItemSO[nsPrefix + 'StartDate__c'])) {
				if(clonedRampLine.lineItemSO[nsPrefix + 'PriceType__c'] === UtilService.priceTypesConstants.PRICETYPE_RECURRING) {
					clonedRampLine.lineItemSO[nsPrefix + 'EndDate__c'] = UtilService.computeEndDate(clonedRampLine.lineItemSO[nsPrefix + 'StartDate__c'], 
																						 			clonedRampLine.lineItemSO[nsPrefix + 'SellingTerm__c'], 
																						 			clonedRampLine.lineItemSO[nsPrefix + 'SellingFrequency__c']);	
				} else {
					var newEndDate = new Date(clonedRampLine.lineItemSO[nsPrefix + 'StartDate__c']);
					clonedRampLine.lineItemSO[nsPrefix + 'EndDate__c'] = newEndDate.setDate(newEndDate.getDate() + 1);
				}
			} 

			service.ramp.lineItem.rampLines.splice(currentRampIndex + 1, 0, clonedRampLine);

		};

		service.removeRampLine = function(rampLine) {
			var rampLineIndex = service.ramp.lineItem.rampLines.indexOf(rampLine);
			service.ramp.lineItem.rampLines.splice(rampLineIndex, 1);
		};	

		service.saveRamp = function() {
			return CartDataService.updateBundle([service.ramp.lineItem]);
		}

		service.getCartHeader = function() {
			return CartDataService.getCartHeader();
		};

		service.getQuoteSummary = function(id) {
			return CartDataService.getQuoteSummary(id);
		};

		service.getCartLineItems = function() {
			return CartDataService.getCartLineItems();
		};

		service.getCartLocations = function() {
			return CartDataService.getCartLocations();
		};

		//TODO: Remove this function once its merged with location line items.
		service.getLineItemsWithoutLocation = function() {
			return CartDataService.lineItemsWithoutLocation;
		};

		service.getLocationLineItems = function() {
			return CartDataService.locationLineItems;
		}

		service.getLineItem = function(lineItemId) {
			return CartDataService.getLineItem(lineItemId);
		};

		service.getDisplayActions = function(type) {
			return CartDataService.getDisplayActions(type);
		};

		service.getCartTotalLines = function() {
			return CartDataService.getCartTotalLines();
		};

		service.addToCart = function(lineItemList) {
			return CartDataService.addToCart(lineItemList).then((function(_this) {
				return function(lineItems) {
					CategoryService.getExcludedProductsInContext();
					return lineItems;
				};
			})(this));
		};

		service.configureBundle = function(bundleProduct) {
			return CartDataService.configureBundle(bundleProduct);
		};

		service.updateCartLineItems = function() {
			return CartDataService.updateCartLineItems();
		};

		service.resequenceLineItems = function(movedItem, oldIndex, newIndex) {
			return CartDataService.resequenceLineItems(movedItem, oldIndex, newIndex);
		};

		service.removeFromCart = function(lineItemList) {
			return CartDataService.removeFromCart(lineItemList).then(function(lineItems) {
				CategoryService.getExcludedProductsInContext();
				return lineItems;
			});
		};

		service.addCopyToCart = function(lineItemList) {
			return CartDataService.addCopyToCart(lineItemList);
		};

		service.getCartColumns = function() {
			return CartDataService.getCartColumns().then((function(_this) {
				return function(cartColumns) {
					return _setNullFieldTypes(_cartColumnDetailAsFirstNode(cartColumns));
				};
			})(this));
		};

		service.getRampColumns = function() {
			return CartDataService.getCartColumns().then(function(cartColumns) {
				return _setNullFieldTypes(_removeDetailNode(cartColumns));
			});
		}

		service.getCartTotalSummaryColumns = function() {
			return CartDataService.getCartTotalSummaryColumns();
		};

		service.selectAllLineItems = function() {
			return console.log('selecting all products');
		};

		service.getCheckboxModels = function() {
			return CartDataService.getCartLineItems().then(function (cartLineItems) {
				if (!service.cartCheckBoxModels) {
					service.cartCheckBoxModels =  {
							lineItems: [],
							all: {}
					};

				}
				return service.cartCheckBoxModels;

			});

		};

		service.getLocationCartCheckBoxModels = function() {
			return CartDataService.getCartLineItems().then(function (cartLineItems) {
				if (!service.locationCartCheckBoxModels) {
					service.locationCartCheckBoxModels =  {
							lineItems: [],
							all: {}
					};

				}
				return service.locationCartCheckBoxModels;

			});			
		}

		_setNullFieldTypes = function(columns) {
			var removedNulls;
			removedNulls = columns.map(function(elem) {
				if (!elem.FieldType) {
					elem.FieldType = 'UNDEFINED';
				}
				return elem;
			});
			return removedNulls;
		};

		_cartColumnsWithTypeClassNames = function(columns) {
			var columnsWithClassNames;
			columnsWithClassNames = columns.map(function(elem) {
				if (elem.FieldName.indexOf('ProductId') > -1) {
					elem.columnClassName = 'detail';
				} else if (elem.FieldType) {
					elem.columnClassName = elem.FieldType.toLowerCase();
				} else {
					elem.columnClassName = 'undefined';
				}
				return elem;
			});
			return columnsWithClassNames;
		};

		_cartColumnDetailAsFirstNode = function(columns) {
			var detailColumnObj;
			columns = _cartColumnsWithTypeClassNames(columns);
			detailColumnObj = columns.filter(function(elem, index, columns) {
				if (elem.FieldName && elem.FieldName.indexOf('ProductId') > -1) {
					columns.splice(index, 1);
					return elem;
				}
			});
			columns.unshift(detailColumnObj[0]);
			return columns;
		};

		_removeDetailNode = function(columns) {
			columns.filter(function(elem, index, columns) {
				if (elem.FieldName && elem.FieldName.indexOf('ProductId') > -1) {
					columns.splice(index, 1);
				}
			});

			columns.filter(function(elem, index, columns) {
				if(elem.FieldName && elem.FieldName.indexOf('ChargeType') > -1) {
					columns.splice(index, 1);
				}
			});
			return columns;
		}

		_getlineItemsWithOptions = function(lineItem) {
			return lineItem.optionLines;
		};

		_getLineItemOptionLines = function(lineItem) {
			return lineItem.optionLines;
		};

		//Used to create unique DOM id's so items can be selected.
		_getLineItemIds = function(lineItem) {
			// return lineItem.lineItemSO[nsPrefix + 'ProductId__r'].Id + lineItem.txnPrimaryLineNumber;
			return lineItem.txnPrimaryLineNumber;
		};

		_flattenOpts = function(a, b) {
			return a.concat(b);
		};

		_getOptionsIds = function(options) {
			var ids, recurseOptions;
			ids = [];
			recurseOptions = function(options) {
				var option, remOpts;
				if (!(options != null ? options.length : void 0)) {
					return;
				}
				option = options[0];
				remOpts = options.slice(1);
				// ids.push(option.lineItemSO[nsPrefix + 'OptionId__r'].Id + option.txnPrimaryLineNumber);
				ids.push(option.txnPrimaryLineNumber);
				if (option.optionLines) {
					return recurseOptions(option.optionLines);
				}
				if (remOpts.length > 0) {
					return recurseOptions(remOpts);
				} else {
					return ids;
				}
			};
			return recurseOptions(options);
		};

		_checkBoxIdsToModels = function(ids) {
			var model, setupModels;
			model = {};
			setupModels = function(ids) {
				var id, remainIds;
				id = ids[0];
				remainIds = ids.slice(1);
				model[id] = {};
				model[id].selected = false;
				if (remainIds.length > 0) {
					return setupModels(remainIds);
				} else {
					return model;
				}
			};
			return setupModels(ids);
		};

		return this;

	}

}).call(this);
