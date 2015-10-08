;(function() {
	'use strict';	
	angular.module('aptCPQData')
		.service('CartDataService', CartDataService); 

	CartDataService.$inject = [
		'$http',
		'$q',
		'$log',
		'lodash',
		'systemConstants',
		'aptBase.RemoteService',
		'aptBase.ActionQueueService',
		'LineItemCache',
		'LineItemSupport',
		'LineItemModelService',
		'ConfigurationDataService',
		'ConstraintRuleDataService',
		'OptionDataService',
		'PageErrorDataService',
		'AttributesCache',
		'FieldExpressionCache'
	];

	function CartDataService($http, 
							 $q, 
							 $log, 
							 _, 
							 systemConstants, 
							 RemoteService, 
							 ActionQueueService, 
							 LineItemCache, 
							 LineItemSupport, 
							 LineItemModel, 
							 ConfigurationDataService, 
							 ConstraintRuleDataService, 
							 OptionDataService, 
							 PageErrorDataService, 
							 AttributesCache,
							 FieldExpressionCache) {
		var service = this;
		/** Init private service variables */
		var nsPrefix = systemConstants.nsPrefix;
		var lineItemArray = []; //This object is always returned by methods that modify the cart
		var totalItemsArray = [];
		var updateEvents;
		//Promises used to batch requests into single calls
		var cartPromise;
		var cartHeader;
		var cartHeaderPromise;
		var cartLineItemsPromise;
		var cartTotalsPromise;

		var cartLocations;
		var cartLocationsPromise;

		service.locationLineItems = {};
		service.lineItemsWithoutLocation = [];

		/** Init public service variables */
		service.inCartProductIds = {};
		/** Attach public methods */
		service.addCopyToCart = addCopyToCart;
		service.addToBundle = addToBundle;
		service.addToCart = addToCart;
		service.checkForPendingLineItems = checkForPendingLineItems;
		service.configureBundle = configureBundle;
		service.createLineItemModel = createLineItemModel;
		service.generatePendingAssetActions = generatePendingAssetActions;
		service.getCartColumns = getCartColumns;
		service.getCartHeader = getCartHeader;
		service.getCartLineItems = getCartLineItems;
		service.getCartLineItemsNew = getCartLineItems;
		service.getCartLocations = getCartLocations;
		service.getCartTotalLines = getCartTotalLines;
		service.getCartTotalSummaryColumns = getCartTotalSummaryColumns;
		service.getDisplayActions = getDisplayActions;
		service.getExcludedOptionIds = getExcludedOptionIds;
		service.getLineItem = getLineItem;
		service.getLineItemDetails = getLineItemDetails;
		service.getLineItems = getLineItems;
		service.getQuoteSummary = getQuoteSummary;
		service.isProductInCart = isProductInCart;
		service.removeFromBundle = removeFromBundle;
		service.removeFromCart = removeFromCart;
		service.repriceCartLineItems = repriceCartLineItems;
		service.resequenceLineItems = resequenceLineItems;
		service.resetCart = resetCart;
		service.submitAssetActions = submitAssetActions;
		service.updateBundle = updateBundle;
		service.updateCartLineItems = updateCartLineItems;
		service.updateTotalItemArray = updateTotalItemArray;
		/** Initialize the action queue with the relevent functions */
		registerAllActions();

		/**
		 * Update the object that is sync'd with the view.
		 * The variable lineItemArray maintians all changes to the line items.
		 *  
		 * @return {Array} reference to the single line item array object
		 */
		function refreshItemsFromCache() {
			lineItemArray.length = 0;
			var lineItemsWithoutLocation = [];

			_.forOwn(service.inCartProductIds, function(value, key) {
				service.inCartProductIds[key] = false;
			});

			_.forOwn(service.locationLineItems, function(value, key) {
				service.locationLineItems[key] = []; // reset values for locations
			});

			// reset inCartAssetIds
			service.inCartAssetIds = {};
			//Scan all line items and resequence, etc.
			var cachedItems = _.sortBy(LineItemCache.getLineItems(), function (lineModel) {
				return lineModel.primaryLine().sequence();

			});
			var sequenceValue = 1;

			_.forEach(cachedItems, function (lineModel) {
				var lineItemDO = lineModel.lineItemDO;
				lineModel.field(nsPrefix + 'LineSequence__c', sequenceValue);
				sequenceValue += 1;
				// maintain collection of products in cart
				service.inCartProductIds[lineModel.field(nsPrefix + 'ProductId__c')] = true;
				// maintain a map of asset lines in the cart
				var assetId = lineModel.field(nsPrefix + 'AssetLineItemId__c');
				var status = lineModel.field(nsPrefix + 'LineStatus__c');
				if (assetId && status != "Upgraded") {
					service.inCartAssetIds[assetId] = systemConstants.pendingStatusMap[status];
					
				}

				//TODO: support other group by attributes
				var primaryLineLocationField = lineModel.primaryLine().field(nsPrefix + 'LocationId__c');

				if (angular.isDefined(primaryLineLocationField)) {
					if (angular.isDefined(service.locationLineItems[primaryLineLocationField])) {
						service.locationLineItems[primaryLineLocationField].push(lineModel);
					
					} else {
						service.locationLineItems[primaryLineLocationField] = [lineModel];
					
					}
				
				} else {
					lineItemsWithoutLocation.push(lineModel);
 				
 				}

				// Hold on to model instead of DO
				lineItemArray.push(lineModel);

			});

			//TODO: merge with location line items.
			Array.prototype.splice.apply(service.lineItemsWithoutLocation, [0,service.lineItemsWithoutLocation.length].concat(lineItemsWithoutLocation));

			return lineItemArray;

		}
		function updateTotalItemArray(newTotalItems) {
			Array.prototype.splice.apply(totalItemsArray, [0,totalItemsArray.length].concat(newTotalItems));
			return totalItemsArray;

		}

		/**
		 * Create a line item model from DO
		 * @param lineItemDO the line item DO
		 * @return the line item model structure
		 */
		function createLineItemModel(lineItemDO) {
			return LineItemModel.create(lineItemDO);

		}
		
		/**
		 * returns list of option product excluded by rule for the context bundle 
		 */
		function getExcludedOptionIds(contextBundleNumber) {
			if (angular.isUndefined(contextBundleNumber) || contextBundleNumber > 10000) {//new line
				return $q.when([]);
			}
			return ConfigurationDataService.requestBasePromise.then(function(baseRequest) {
				return RemoteService.getExcludedOptionIds(baseRequest.cartId, contextBundleNumber).then(function(result) {
					return result;
				});

			});

		}

		/**
		 * get quote summary for business object id
		 */
		function getQuoteSummary(businessObjectId) {
			return ConfigurationDataService.getSObjectSummary(businessObjectId);
			
		}


		/**
		 * A single function for initially requesting the cart, its line items,
		 * 	and the total lines. Currently private, not exposed as a service method.
		 * @return {Promise} promise resolves with the result of the call
		 */
		function getCart() {
			if (angular.isDefined(cartPromise)) {
				return cartPromise;

			}
			var includeParams = [
				//The cart header object
				ConfigurationDataService.includeConstants.CART,
				//The pricing totals
				ConfigurationDataService.includeConstants.TOTAL_ITEMS,
				//The lines and charges of the cart
				ConfigurationDataService.includeConstants.CART_LINES,
				ConfigurationDataService.includeConstants.CHARGE_LINES, 
				ConfigurationDataService.includeConstants.PRICE_RAMPS,
				//Any oustanding rules
				ConfigurationDataService.includeConstants.RULE_ACTIONS,
				//The data objects needed for attributes
				ConfigurationDataService.includeConstants.ATTRIBUTE_VALUES,				
				ConfigurationDataService.includeConstants.ATTRIBUTE_RULES,
				ConfigurationDataService.includeConstants.ATTRIBUTE_MATRICES,
				//The field expressions
				ConfigurationDataService.includeConstants.FIELD_EXPRESSIONS,
				//The locations for the cart
				ConfigurationDataService.includeConstants.CART_LOCATIONS
			];
			//Construct a request that doesn't run constraint rules or pricing 
			cartPromise = ConfigurationDataService.createCartRequestDO(null, null, false, false, includeParams)
				.then(function (cartRequest) {
					return RemoteService.getCart(cartRequest);
				});

			return cartPromise;

		}

		/**
		 * Retrive the cart header object.
		 * @return {Promise} resolves with the cart header json
		 */
		function getCartHeader() {
			if (cartHeader) {
				return $q.when(cartHeader);

			} else if (cartHeaderPromise) {
				return cartHeaderPromise;

			}
			cartHeaderPromise = getCart().then(function (result) {
				cartHeader = result.cart;
				return cartHeader;

			});
			return cartHeaderPromise;

		}

		/*
		 * returns cartLocations
		 */
		function getCartLocations() {
			if (cartLocations) {
				return $q.when(cartLocations);
			
			} else if (cartLocationsPromise) {
				return cartLocationsPromise;
			
			}

			cartLocationsPromise = getCart().then(function (result) {
				cartLocations = result.cartLocations;
				return cartLocations;
			});

			return cartLocationsPromise;
		}

		/**
		 * Get the line items in the cart. If the cache items are valid,
		 * 	get those instead. Otherwise, call out to remote service for cart.
		 * 
		 * @return {promise}	promise that resolves with a shallow 
		 * 	                  copy of the array of cart line items.
		 */
		function getCartLineItems() {
			// Get cached items by default
			if (LineItemCache.isValid) {
				var lineItems = refreshItemsFromCache();
				return $q.when(lineItems);

			} else if (cartLineItemsPromise) {
				return cartLineItemsPromise;

			}
			cartLineItemsPromise = getCart().then(function (result) {
				//Cache various request details
				AttributesCache.putAttributeRules(result.attributeRules);
				AttributesCache.putAttributeMatrices(result.attributeMatrices);
				FieldExpressionCache.putFieldExpressions(result.appliedExpressionInfos);

				//Merge request lines with cache
				LineItemCache.putLineItemDOs(result.lineItems, createLineItemModel);				
				//update the constraint rule actions
				ConstraintRuleDataService.updateRuleActions(result.ruleActions);
				//Schedule a check for repricing
				ActionQueueService.scheduleAction('finish');
				//Load cached items and return the array
				return refreshItemsFromCache();

			});
			return cartLineItemsPromise;

		}

		/**
		 *	Get the totals items. 
		 * @return {[type]} [description]
		 */
		function getCartTotalLines() {
			if (totalItemsArray && totalItemsArray.length) {
				return $q.when(totalItemsArray);

			} else if (cartTotalsPromise) {
				return cartTotalsPromise;

			}
			cartTotalsPromise = getCart().then(function (result) {
				return updateTotalItemArray(result.totalItems);

			});
			return cartTotalsPromise;

		}

		/**
		 * Get a line item by its id, i.e. must be an existing line item.
		 * Will resolve with undefined if id is not found.
		 * @param  {string} lineItemId 
		 * @return {promise} resolves with a lineItemDO
		 */
		function getLineItem(txnPLN) {
			return getCartLineItems().then(function(result) {
				return getLineItemDetails(txnPLN);
			});

		}

		/**
		 * Get line items for primary line numbers.
		 */
		function getLineItems(txnPLNs) {
			var lineItemsPromise = [];
			
			_.each(txnPLNs, function(txnPLN) {
				lineItemsPromise.push(getLineItem(txnPLN));
			}); 
			
			return $q.all(lineItemsPromise);

		}

		function getLineItemDetails(txnPLN) {
			if (!txnPLN) {
				$log.error('Could not get details: txnPrimaryLineNumber undefined.');
				return $q.reject('Could not get details: txnPrimaryLineNumber undefined.');

			}
			var lineItem = LineItemCache.getLineItem(txnPLN);
			if (lineItem == null) {
				return $q.reject('No Line Item for txnPrimaryLineNumber: ' + txnPLN);

			}
			var lineItemDO = lineItem.lineItemDO;
			if (LineItemSupport.getIsItemDetailed(lineItemDO)) {
				return $q.when(lineItem);

			}

			var lineItems = [LineItemSupport.cloneDeep(lineItemDO)];
			var includeParams = [
				ConfigurationDataService.includeConstants.CART_LINES,
				ConfigurationDataService.includeConstants.OPTION_LINES,
				ConfigurationDataService.includeConstants.ATTRIBUTE_VALUES,
				ConfigurationDataService.includeConstants.ATTRIBUTE_RULES,
				ConfigurationDataService.includeConstants.FIELD_EXPRESSIONS,
				ConfigurationDataService.includeConstants.PRICE_RAMPS
					
			];
			return ConfigurationDataService
					.createCartRequestDO(lineItems, null, false, false, includeParams)
					.then(function(detailRequst) {
						return RemoteService.getLineItemDetails(detailRequst);
					})
					.then(function(result) {
						var responseDO = result.lineItems[0];
						//update attribute rule cache
						AttributesCache.putAttributeRules(result.attributeRules);
						//update expression cache
						FieldExpressionCache.putFieldExpressions(result.appliedExpressionInfos);
						//Merge in the line item data
						if (responseDO) {
							lineItem.mergeLineItemDO(responseDO);

						} 
						// else {
						// 	return $q.reject('No Line Item for txnPrimaryLineNumber: ' + txnPLN);

						// }
						return lineItem;

					});

		}


		/**
		 * Check whether a particular product exists in a top-level line item.
		 * ToDo: Check against cache.
		 * 
		 * @param  {String}  productId Id of the product.
		 * @return {Boolean}           True if product is in cart.
		 */
		function isProductInCart(productId) {
			return false;

		}

		/**
		 * Get the columns to display for a cart line item.
		 * @return {[type]} [description]
		 */
		function getCartColumns() {
			return ConfigurationDataService.getDisplayColumns().then(function (result) {
				var columnData = angular.copy(result.cartLineItemColumns);
				return columnData;

			});

		}
		
		/**
		 * 
		 * @return {[type]} [description]
		 */
		function getCartTotalSummaryColumns() {
			return ConfigurationDataService.getDisplayColumns().then(function (result) {
				var columnData = angular.copy(result.cartTotalItemColumns);
				return columnData;

			});

		}


		/**
		 * Get the action buttons to display 
		 * @return {[type]} [description]
		 */
		function getDisplayActions() {
			return ConfigurationDataService.getDisplayActions().then(function (result) {
				var columnData = angular.copy(result.cartPageActions);
				return columnData;

			});

		}

		/**
		 * Add one or more products to the cart and return the new line items.
		 * A product wrapper just needs the properties "productSO" and "quantity",
		 * 	which is made to fit with how products are wrapped by the category directive.
		 * If the input is exactly one product object instead of an array, the promise
		 * 	resolves with one line item instead of an array of line items. May change
		 * 	this for consistency.
		 * 	
		 * @param {object/array} 		productWrappers 
		 * @return {promise}	promise that resolves with the collection of new line items
		 */
		function addToCart(productWrappers) {
			//Ensure array structure
			var allProductWrappers = [].concat(productWrappers);
			//Use helper method to wrap product in line item
			var lineItemPromises = [];
			var nextProductWrapper, nextPromise;
			for (var  productIndex = allProductWrappers.length - 1;   productIndex >= 0;   productIndex--) {
				nextProductWrapper = allProductWrappers[productIndex];
				nextPromise = LineItemSupport.newLineItemForProduct(nextProductWrapper.productSO, nextProductWrapper.quantity);
				lineItemPromises.push(nextPromise);

			}
			return $q.all(lineItemPromises).then(addLineItemsToCart);

		}

		function addLineItemsToCart(lineItems) {
			LineItemCache.putLineItemDOs(lineItems, createLineItemModel);
			refreshItemsFromCache();
			return ActionQueueService
							.scheduleAction(['update', 'finish'])
							.then(function (result) {
								if (angular.isArray(lineItems) && lineItems.length == 1) {
									return lineItems[0];
								}
								return lineItems;
							});
		
		}

		function addCopyToCart(lineItems) {
			var lineItemsToClone = [].concat(lineItems);
			var clones = _.map(lineItemsToClone, function (nextLine) {
				return nextLine.getLineItemDOClone();
			});
			return addLineItemsToCart(clones);

		}
		
		/**
		 * Add option line items to bundle based on product id.
		 * @param targetBundleNumber primary line number of the target bundle
		 * @param productDO productSO wrapper which is an option
		 */
		function addToBundle(targetBundleNumber, productDO) {
			//Ensure array of product DOs
			var bundleLine = LineItemCache.getLineItem(targetBundleNumber);
			var optionLines = bundleLine.findOptionLinesForProducts(productDO);
			_.forEach(optionLines, function (nextOptionLine) {
				nextOptionLine.select();
			});
			return updateBundle(bundleLine);

		}
		
		/**
		 * Remove an option on a particluar bundle. 
		 * @param targetBundleNumber primary line number of the target bundle
		 * @param productDO productSO wrapper which is an option
		 * @return {[type]}                    [description]
		 */
		function removeFromBundle(targetBundleNumber, productDO) {
			//Ensure array of product DOs
			var bundleLine = LineItemCache.getLineItem(targetBundleNumber);
			var optionLines = bundleLine.findOptionLinesForProducts(productDO);
			_.forEach(optionLines, function (nextOptionLine) {
				nextOptionLine.deselect();
			});
			return updateBundle(bundleLine);

		}

		/**
		 * Submit an action on Assets to obtain cart line items corresponding to those actions.
		 * @param {array}	LineItems
		 * @return {promoise} promise that resolves with newly created line items
		 */
		function submitAssetActions(assetLines) {
			LineItemCache.putAssetActions(assetLines);
			return ActionQueueService.scheduleAction('assetAction');

		}

		/** Managing asset actions */			
		function generatePendingAssetActions() {
			var tempAssetActions = LineItemCache.getAssetActions();
			if (tempAssetActions.length === 0) {
				return undefined;
			}
			var hashKey = LineItemCache.getAssetKey();
			LineItemCache.setAssetKey(hashKey + 1); //increment asset key

			// clone temp actions array
			LineItemCache.putPendingAssetAction(hashKey, LineItemSupport.cloneDeep(tempAssetActions));
			LineItemCache.clearAssetActions();
			return hashKey;
		}

		/**
		 * Experimenting with putting a temporary bundle together.
		 * @param {object} product wrapper w/ productSO and quantity properties
		 */
		function configureBundle(product) {
			//Use helper method to wrap product in line item
			return LineItemSupport.newLineItemForProduct(product.productSO, product.quantity)
				.then(function (lineItem) {
					LineItemCache.putLineItemDOs(lineItem, createLineItemModel);
					refreshItemsFromCache();
					return ActionQueueService
									.scheduleAction(['update', 'finish'])
									.then(function(result) {
										return lineItem;
									});

				});

		}

		function updateBundle(lineItem) {
			//Should lineItemModel have a function for this?
			lineItem.checkOptionConfiguration();
			return ActionQueueService.scheduleAction(['update', 'finish']);

		}

		/**
		 * Remove an array of line items from cart. These items can be
		 * 	from the server or temporary items -- the cache handles 
		 * 	organizing what to delete.
		 * 	
		 * @param  {array} 	lineItems 
		 * @return {promise}	promise that resolves with the cart line
		 *                    items either immediately or after the 
		 *                    delete has ben sync'd
		 */
		function removeFromCart(lineItems) {
			lineItems = [].concat(lineItems);
			//Set line action
			//Remove all items that haven't been sync'd
			var needSync = LineItemCache.removeLineItems(lineItems);
			FieldExpressionCache.updateCacheAfterItemDelete(LineItemCache.getLineItemsByPrimaryLineNumber());
			refreshItemsFromCache();
			if (needSync) {
				return ActionQueueService.scheduleAction(['update', 'finish']);

			}
			return $q.when(lineItemArray);

		}

		/**
		 * Schedule update action which will submit any pending line item changes
		 * 	to the server for persistence. Does not check for updates to pricing
		 *
		 * @param  {[type]} lineItems 
		 * @return {promise} promise that will resolve with the cart line
		 *                   items after sync has finished.
		 */
		function updateCartLineItems() {
			return ActionQueueService
							.scheduleAction('update')
							.then(refreshItemsFromCache);

		}

		function resequenceLineItems() {
			var sequenceValue = 1;
			_.forEach(lineItemArray, function (lineModel) {
				lineModel.field(nsPrefix + 'LineSequence__c', sequenceValue);
				sequenceValue += 1;

			});
			return $q.when(lineItemArray);

		}


		/**
		 * Check whether any line items have unsaved changes.
		 * @return {[type]} [description]
		 */
		function checkForPendingLineItems() {
			return _.some(lineItemArray, function (lineModel) {
				return lineModel.checkForPendingChanges();

			});

		}

		/**
		 * Reprice cart. By defualt, submits all cart lines for update, but 
		 * 	can be set to only reprice with parameter
		 * @param  {Boolean} repriceWithoutUpdate
		 * @return {promise}                      
		 */
		function repriceCartLineItems(repriceWithoutUpdate) {
			var actionsToSchedule = ['reprice', 'finish'];
			if (repriceWithoutUpdate !== true) {
				actionsToSchedule.push('update');

			}
			return ActionQueueService.scheduleAction(actionsToSchedule);

		}

		/**
		 * Marks the cache as invalid so that a call to getCartLineItems
		 * 	will perform a remote call
		 * 	 
		 * @return {boolen} whether the cache was valid before
		 */
		function resetCart() {
			var wasValid = LineItemCache.isValid;
			LineItemCache.isValid = false;
			return wasValid;

		}

		/**
		 * 
		 * Register the functions used to sync the cache with the server. 
		 * Each action checks if a request is necessary and returns a promise that
		 * 	resolves when its request is complete.
		 * 	
		 * If another action should be executed, add it here.
		 * 
		 * Standad queue of actions:
		 * 	1: Extract and submit all pending changes to line item models. This may be any
		 * 			number of updates, additions, or deletions. This will run constraint rules.
		 * 	2: Check the cache of asset actions that need to be submitted. When complete,
		 * 			add the resulting line items to the cache.
		 * 	3: If there is an indication that pricing is pending, make a call
		 * 			to the server to reprice.
		 * 	4: A "finish" 
		 * 			
		 */
		function registerAllActions() {
			//Going to have an action that combines update, add, and remove
			ActionQueueService.registerAction(update, 100, 'update');
			ActionQueueService.registerAction(assetAction, 90, 'assetAction');
			ActionQueueService.registerAction(reprice, 60, 'reprice');
			ActionQueueService.registerAction(finish, 0, 'finish');

			/**
			 * For now, just pass the rejected promise up.
			 */
			function onRejection(reason) {
				PageErrorDataService.add([reason]);
				return $q.reject(reason);

			}

			function update() {
				var pendingLineItemDOs = LineItemCache.getLineItemDOChanges();
				if (!pendingLineItemDOs || pendingLineItemDOs.length === 0) {
					//Return immediately if no pending changes detected.
					return $q.when(lineItemArray);

				}

				//May want to leave out TOTAL_ITEMS and just let reprice action handle that
				var includeParams = [
					ConfigurationDataService.includeConstants.CART_LINES,
					ConfigurationDataService.includeConstants.CHARGE_LINES,
					ConfigurationDataService.includeConstants.ATTRIBUTE_VALUES,
					ConfigurationDataService.includeConstants.ATTRIBUTE_RULES,
					ConfigurationDataService.includeConstants.FIELD_EXPRESSIONS,
					ConfigurationDataService.includeConstants.OPTION_LINES,
					ConfigurationDataService.includeConstants.RULE_ACTIONS,
					ConfigurationDataService.includeConstants.TOTAL_ITEMS,
					ConfigurationDataService.includeConstants.PRICE_RAMPS
				];
				var actionPromise = ConfigurationDataService.createCartRequestDO(pendingLineItemDOs, totalItemsArray, true, false, includeParams)
					.then(function (cartRequest) {
						return RemoteService.performAction(cartRequest);
					});
				
				return actionPromise.then(
						function(result) {
							ConstraintRuleDataService.updateRuleActions(result.ruleActions);							
							PageErrorDataService.clear().add(result.pageErrors.errorMessages);
							updateTotalItemArray(result.totalItems);
							
							AttributesCache.putAttributeRules(result.attributeRules);
							FieldExpressionCache.putFieldExpressions(result.appliedExpressionInfos);
							LineItemCache.putPricePendingInfo(result.pricePendingInfo);
							//!--uses info from various caches to init the line item model
							LineItemCache.putLineItemDOs(result.lineItems, createLineItemModel); 
							LineItemCache.removeLineItems(result.deletedPrimaryLineNumbers, true);

							return refreshItemsFromCache();

						}, 
						onRejection
				);

			}

			function assetAction() {
				var pendingAssetActionsKey = generatePendingAssetActions();
				if (pendingAssetActionsKey) {
					var reqObj = {};
					reqObj.lineItems = LineItemCache.getPendingAssetActions(pendingAssetActionsKey);
					//Assets may want more
					reqObj.responseIncludes = [ConfigurationDataService.includeConstants.CART_LINES];
					var actionRequest = ConfigurationDataService.createAssetActionRequest(reqObj);
					var requestPromise = RemoteService.performAssetActions(actionRequest);

					return requestPromise.then(
							function(result) {
								if (!result.lineItems) {
									// ERROR!
									return result;

								} else {
									var lineItemData = result.lineItems;
									PageErrorDataService.add(result.pageErrors.errorMessages);
									LineItemCache.clearPendingAssetActions(pendingAssetActionsKey);
									LineItemCache.putLineItemDOs(lineItemData, createLineItemModel);
									return refreshItemsFromCache();

								}

							},
							onRejection
					);
				} 
			}

			/**
			 * Make a call to the server to reprice the cart lines. When the remote action is finished:
			 * 		- Resulting changes to line items are merged into the cache. 
			 * 		- A call to finish() is made to check whether another round of pricing is needed.
			 * 		
			 * @return {Promise} resolves with cart lines when pricing is done
			 */
			function reprice() {
				var includeParams = [
					ConfigurationDataService.includeConstants.CART_LINES,
					ConfigurationDataService.includeConstants.OPTION_LINES,
					ConfigurationDataService.includeConstants.CHARGE_LINES,
					ConfigurationDataService.includeConstants.RULE_ACTIONS,
					ConfigurationDataService.includeConstants.TOTAL_ITEMS,
					ConfigurationDataService.includeConstants.PRICE_RAMPS

				];
				var actionPromise = ConfigurationDataService.createCartRequestDO(null, null, false, true, includeParams)
					.then(function (cartRequest) {
						return RemoteService.updatePrice(cartRequest);
					});

				return actionPromise.then(
						function(result) {

							var lineItemData = result.lineItems;
							var totalsData = result.totalItems;
							updateTotalItemArray(totalsData);
							LineItemCache.putLineItemDOs(lineItemData, createLineItemModel);
							PageErrorDataService.add(result.pageErrors.errorMessages);
							LineItemCache.putPricePendingInfo(result.pricePendingInfo);
							return finish();

						}, 
						onRejection
				);

			}

			/**
			 * Check whether there is still price pending. If there is, execute
			 * 	another pricing call with reprice(). Otherwise, just return the
			 * 	final collection of line items. Checking for pricing has been pulled
			 * 	out of the cache service for clarity
			 * 	
			 * @return {Promise} resolves with cart lines when pricing is done.
			 */
			function finish() {
				refreshItemsFromCache();
				if (LineItemCache.getIsPricePending()) {
					return reprice();

				}
				return $q.when(lineItemArray);

			}

		}

	}

})();