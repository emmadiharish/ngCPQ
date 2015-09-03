;(function() {
	
	angular.module('aptCPQData')
		.service('CartDataService', CartDataService); 

	CartDataService.$inject = [
		'lodash',
		'$http',
		'$q',
		'$log',
		'systemConstants',
		'aptBase.RemoteService',
		'aptBase.ActionQueueService',
		'LineItemCache',
		'LineItemSupport',
		'ConfigurationDataService',
		'ConstraintRuleDataService',
		'OptionDataService',
		'PageErrorDataService'
	];

	function CartDataService(_, $http, $q, $log, systemConstants, RemoteService, ActionQueueService, LineItemCache, LineItemSupport, ConfigurationDataService, ConstraintRuleDataService, OptionDataService, PageErrorDataService) {
		var service = this;
		/** Init private service variables */
		var nsPrefix = systemConstants.nsPrefix;
		var lineItemArray = []; //This object is always returned by methods that modify the cart
		var totalItemsArray = [];
		var updateEvents;
		var cartHeader;
		var cartHeaderPromise;
		var cartLineItemsPromise;
		/** Init public service variables */
		service.inCartProductIds = {};
		/** Attach public methods */
		service.addToBundle = addToBundle;
		service.addToCart = addToCart;
		service.addCopyToCart = addCopyToCart;
		service.configureBundle = configureBundle;
		service.configureCartLineItems = configureCartLineItems;
		service.getCartColumns = getCartColumns;
		service.getCartHeader = getCartHeader;
		service.getCartLineItems = getCartLineItems;
		service.getCartLineItemsNew = getCartLineItems;
		service.getCartTotal = getCartTotal;
		service.getCartTotalsDisplayData = getCartTotalsDisplayData;
		service.getCartTotalSummaryColumns = getCartTotalSummaryColumns;
		service.getDisplayActions = getDisplayActions;
		service.getExcludedOptionIds = getExcludedOptionIds;
		service.getLineItem = getLineItem;
		service.getLineItemDetails = getLineItemDetails;
		service.getQuoteSummary = getQuoteSummary;
		service.isProductInCart = isProductInCart;
		service.removeFromCart = removeFromCart;
		service.repriceCartLineItems = repriceCartLineItems;
		service.resequenceLineItems = resequenceLineItems;
		service.resetCart = resetCart;
		service.submitAssetActions = submitAssetActions;
		service.updateBundle = updateBundle;
		service.updateCartLineItems = updateCartLineItems;
		service.getLineItems = getLineItems;
		/** Initialize the action queue with the relevent functions */
		registerAllActions();

		/**
		 * Update the object that is sync'd with the view.
		 * The variable lineItemArray maintians all changes to the line items.
		 *  
		 * @return {Array} reference to the single line item array object
		 */
		function updateLineItemArray() {
			Array.prototype.splice.apply(lineItemArray, [0,lineItemArray.length].concat(LineItemCache.getLineItems()));
			resequenceLineItems();
			_.forOwn(service.inCartProductIds, function(value, key){
				service.inCartProductIds[key] = false;
				
			});

			// reset inCartAssetIds
			service.inCartAssetIds = {};

			for(var lineIndex = 0; lineIndex < lineItemArray.length; lineIndex ++) {
				service.inCartProductIds[lineItemArray[lineIndex].lineItemSO[nsPrefix + 'ProductId__c']] = true;

				// maintain a map of asset lines in the cart
				if ( lineItemArray[lineIndex].chargeLines[0].lineItemSO[nsPrefix + 'AssetLineItemId__c'] &&
						 (lineItemArray[lineIndex].chargeLines[0].lineItemSO[nsPrefix + 'LineStatus__c'] != "Upgraded") ) {
					var assetId = lineItemArray[lineIndex].chargeLines[0].lineItemSO[nsPrefix + 'AssetLineItemId__c'];
					var status = lineItemArray[lineIndex].chargeLines[0].lineItemSO[nsPrefix + 'LineStatus__c'];
					service.inCartAssetIds[assetId] = systemConstants.pendingStatusMap[status];
				}
			}

			return lineItemArray;

		}
		function updateTotalItemArray(newTotalItems) {
			Array.prototype.splice.apply(totalItemsArray, [0,totalItemsArray.length].concat(newTotalItems));
			return totalItemsArray;

		}
		
		/**
		 * returns list of option product excluded by rule for the context bundle 
		 */
		function getExcludedOptionIds(contextBundleNumber) {
			if (angular.isUndefined(contextBundleNumber) || contextBundleNumber > 10000) { //new line
				return $q.when([]);
			}
			return ConfigurationDataService.requestBasePromise.then(function(baseRequest) {
				return RemoteService.getExcludedOptionIds(baseRequest.cartId, contextBundleNumber).then(function(result) {
					return result;
				});

			});

		}


		function getCartHeader() {
			if (cartHeader) {
				return $q.when(cartHeader);

			} else if (cartHeaderPromise) {
				return cartHeaderPromise;

			}
			var includeParams = [ConfigurationDataService.includeConstants.CART];
			var requestPromise = ConfigurationDataService.createCartRequestDO(null, null, null, null, includeParams).then(function(cartRequest){
				return RemoteService.getCart(cartRequest);
			});

			cartHeaderPromise = requestPromise.then(function(result) {
				cartHeader = result.cart;
				return cartHeader;

			});
			return cartHeaderPromise;

		}

		/**
		 * get quote summary for business object id
		 */
		function getQuoteSummary(businessObjectId) {
			return ConfigurationDataService.getSObjectSummary(businessObjectId);
			
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
				var lineItems = updateLineItemArray();
				return $q.when(lineItems);

			} else if (cartLineItemsPromise) {
				return cartLineItemsPromise;

			}
			var includeParams = [
				ConfigurationDataService.includeConstants.CART_LINES,
				ConfigurationDataService.includeConstants.CHARGE_LINES, 
				ConfigurationDataService.includeConstants.RULE_ACTIONS,
				ConfigurationDataService.includeConstants.PRICE_RAMPS
					
			];
			var requestPromise = ConfigurationDataService.createCartRequestDO(null, null, null, null, includeParams).then(function(cartRequest) {
				return RemoteService.getCartLineItems(cartRequest);
			});

			cartLineItemsPromise = requestPromise.then(function(result) {
				var lineItemData = result.lineItems;
				LineItemCache.putLineItems(lineItemData);
				ConstraintRuleDataService.updateRuleActions(result.ruleActions);				
				return updateLineItemArray();
			});
			return cartLineItemsPromise;

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
				// 	return LineItemCache.getLineItem(txnPLN);
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
			var lineItemDO = LineItemCache.getLineItem(txnPLN);
			//ToDo: fix this awful conditional (also, namespace issues)
			if (LineItemSupport.getIsItemDetailed(lineItemDO)) {
				return $q.when(lineItemDO);

			}
			var lineItems = [LineItemSupport.cloneDeep(lineItemDO)];

			var includeParams = [
				ConfigurationDataService.includeConstants.CART_LINES,
				ConfigurationDataService.includeConstants.OPTION_LINES,
				ConfigurationDataService.includeConstants.ATTRIBUTE_VALUES,
				ConfigurationDataService.includeConstants.PRICE_RAMPS
					
			];
			var requestPromise = ConfigurationDataService.createCartRequestDO(lineItems, null, false, false, includeParams).then(function(detailRequst){
				return RemoteService.getLineItemDetails(detailRequst);
			});			
			
			return requestPromise.then(function(response) {
				var responseLineItem = response.lineItems[0];
				if (responseLineItem) {
					LineItemCache.putLineItem(responseLineItem);

				} else {
					return $q.reject('No Line Item for txnPrimaryLineNumber: ' + txnPLN);

				}
				var resultItem = LineItemCache.getLineItem(txnPLN);
				if (!resultItem.optionLines) {
					resultItem.optionLines = [];

				}
				if (!resultItem.chargeLines[0].lineItemSO[nsPrefix + 'AttributeValueId__r']) {
					resultItem.chargeLines[0].lineItemSO[nsPrefix + 'AttributeValueId__r'] = {};

				}
				return resultItem;

				// }
				// return lineItemDO;

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
		function getCartTotalsDisplayData() {
			if (totalItemsArray && totalItemsArray.length) {
				return $q.when(totalItemsArray);

			}
			var includeParams = [ConfigurationDataService.includeConstants.TOTAL_ITEMS];
			
			return ConfigurationDataService.createCartRequestDO(null, null, null, true, includeParams).then(function(cartRequest){
				return RemoteService.getCart(cartRequest).then(function (result) {
					return updateTotalItemArray(result.totalItems);

				});
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
			//Cache maintains item structure
			LineItemCache.putTempLineItems(lineItems);
			updateLineItemArray();
			ActionQueueService.scheduleAction('add');
			return ActionQueueService.scheduleAction('finish').then(function (result) {
				if (lineItems.length == 1) {
					return lineItems[0];
				}
				return lineItems;
			});
		
		}

		function addCopyToCart(lineItems) {
			var lineItemArr = [].concat(lineItems);
			var clones = LineItemSupport.newLineItemsFromClone(lineItemArr);
			$log.debug('Line item copies: ', clones);
			return addLineItemsToCart(clones);

		}
		
		/**
		 * Add option line items to bundle based on product id.
		 * @param targetBundleNumber primary line number of the target bundle
		 * @param productDO productSO wrapper which is an option
		 */
		function addToBundle(targetBundleNumber, productDO) {
			//Ensure array of product DOs
			var allProductDOs = [].concat(productDO);
			// $log.debug(' -- Performing addToBundle -- ');
			// $log.debug('Bundle Number: ', targetBundleNumber);
			// $log.debug('Products: ', allProductDOs);

			//Get the top-level bundle by PLN/txnPLN
			//TODO: Support finding within sub-bundles.
			return getLineItem(targetBundleNumber).then(function (bundleDO) {
				if (!bundleDO) {
					return $q.reject('No bundle found for bundle number: ', targetBundleNumber);

				}
				//Need to retrieve option groups to establish option component to product mapping.
				var productId = LineItemSupport.getLineItemSO(bundleDO)[nsPrefix + 'ProductId__c'];
				return OptionDataService.getOptionGroups(productId).then(function (optionGroups) {
					//Group products by Id for fast lookup.
					var groupedProducts = _.groupBy(allProductDOs, 'productSO.Id');
					// $log.debug('Option groups', optionGroups);
					// $log.debug('Grouped products', groupedProducts);
					
					//Loop across all option components within all groups.
					//TODO: search through sub groups
					var optionLinePromises = [];
					_.forEach(optionGroups, function (nextGroup) {
						_.forEach(nextGroup.options, function (nextOptionComponent) {
							var componentProductId = nextOptionComponent[nsPrefix + 'ComponentProductId__c'];
							if (groupedProducts[componentProductId]) {
								//Create option line and ensure it gets seledted.
								var newOptionPromise = LineItemSupport.newOptionLineItemForComponent(nextOptionComponent)
									.then(function (newOptionLine) {
										LineItemSupport.selectLineItem(newOptionLine);
										return newOptionLine;
									});
								optionLinePromises.push(newOptionPromise);
								delete groupedProducts[componentProductId]; //add just once
							}
						});
					});
					// $log.debug('Remaining grouped products (should be none)', groupedProducts);
					//Wait for all option lines to be completed
					return $q.all(optionLinePromises);

				}).then(function (newOptionLines) {
					LineItemSupport.mergeOptionLines(bundleDO.optionLines, newOptionLines, false);
					return updateBundle(bundleDO);

				});

			});

		}

		/**
		 * Submit an action on Assets to obtain cart line items corresponding to those actions.
		 * @param {array}	LineItems
		 * @return {promoise} promise that resolves with newly created line items
		 */
		function submitAssetActions(lineItems) {
			LineItemCache.putTempAssetItems(lineItems);
			updateLineItemArray();
			return ActionQueueService.scheduleAction('assetAction').then(function(result){
				return result;
			});
		}

		/**
		 * Experimenting with putting a temporary bundle together.
		 * @param {object} product wrapper w/ productSO and quantity properties
		 */
		function configureBundle(product) {
			//Use helper method to wrap product in line item
			return LineItemSupport.newLineItemForProduct(product.productSO, product.quantity)
				.then(function (lineItem) {
					LineItemCache.putTempLineItems([lineItem]);
					updateLineItemArray();
					ActionQueueService.scheduleAction('add');
					ActionQueueService.scheduleAction('finish');
					return lineItem;

				});

		}

		function updateBundle(lineItem) {
			var itemArr = [].concat(lineItem);
			// LineItemSupport.setLineAction(itemArr, 'update');

			// Mark pricing pending for line items.
			itemArr = LineItemSupport.markPricingPending(itemArr);

			//Cache maintains item structure
			LineItemCache.putModifiedLineItems(itemArr);

			//return ActionQueueService.scheduleSync();
			ActionQueueService.scheduleAction('update');
			return ActionQueueService.scheduleAction('finish');

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
			// LineItemSupport.setLineAction(lineItems, 'delete');
			//Remove all items that haven't been sync'd
			var needSync = LineItemCache.removeLineItems(lineItems);
			updateLineItemArray();
			if (needSync) {
				// return ActionQueueService.scheduleSync();
				ActionQueueService.scheduleAction('remove');
				return ActionQueueService.scheduleAction('finish');

			}
			return $q.when(lineItemArray);

		}

		/**
		 * Set one or more line items to have the action 'update' then put them
		 * 	in the modified in cache, then schedule a sync action
		 * 	to make sure the update runs.
		 *
		 * @param  {[type]} lineItems 
		 * @return {promise} promise that will resolve with the cart line
		 *                   items after sync has finished.
		 */
		function updateCartLineItems(lineItems) {
			lineItems = [].concat(lineItems);
			// LineItemSupport.setLineAction(lineItems, 'update');
			LineItemCache.putModifiedLineItems(lineItems);
			// return ActionQueueService.scheduleSync();
			ActionQueueService.scheduleAction('update');
			return ActionQueueService.scheduleAction('finish');

		}

		function resequenceLineItems() {
			var firstIndex, lastIndex, sequenceValue, primaryLineSO;
			sequenceValue = 1;
			firstIndex = 0;
			lastIndex = lineItemArray.length - 1;
			for (var itemIndex = firstIndex; itemIndex <= lastIndex; itemIndex += 1) {
				primaryLineSO = LineItemSupport.getLineItemSO(lineItemArray[itemIndex]);
				if (primaryLineSO) {
					primaryLineSO[nsPrefix + 'LineSequence__c'] = sequenceValue;
					sequenceValue += 1; //increment sequence
					
				}

			}
			// Need equivalent call for resequence action.
			// ActionQueueService.scheduleAction('update');
			// return ActionQueueService.scheduleAction('finish');
			return $q.when(lineItemArray);

		}

		// function resequenceLineItems(movedItem, oldIndex, newIndex) {
		// 	var firstIndex, lastIndex, sequenceValue, primaryLineSO;
		// 	if (!(angular.isDefined(movedItem) && angular.isDefined(oldIndex) && angular.isDefined(newIndex)) || newIndex == oldIndex) {
		// 		return $q.when(lineItemArray);

		// 	}
		// 	if (oldIndex < newIndex) {
		// 		primaryLineSO = LineItemSupport.getLineItemSO(movedItem);
		// 		sequenceValue = primaryLineSO[nsPrefix + 'LineSequence__c'];
		// 		firstIndex = oldIndex;
		// 		lastIndex = newIndex;

		// 	} else {
		// 		primaryLineSO = LineItemSupport.getLineItemSO(lineItemArray[newIndex + 1]);
		// 		sequenceValue = primaryLineSO[nsPrefix + 'LineSequence__c'];
		// 		firstIndex = newIndex;
		// 		lastIndex = oldIndex;

		// 	}
		// 	sequenceValue = sequenceValue ? sequenceValue : firstIndex + 1; //ensure positive sequence
		// 	for (var itemIndex = firstIndex; itemIndex <= lastIndex; itemIndex++) {
		// 		primaryLineSO = LineItemSupport.getLineItemSO(lineItemArray[itemIndex]);
		// 		primaryLineSO[nsPrefix + 'LineSequence__c'] = sequenceValue;
		// 		sequenceValue++; //increment sequence
		// 		LineItemCache.putModifiedLineItems(lineItemArray[itemIndex]); //mark item as modified

		// 	}
		// 	// Need equivalent call for resequence action.
		// 	// ActionQueueService.scheduleAction('update');
		// 	// return ActionQueueService.scheduleAction('finish');
		// 	return $q.when(lineItemArray);

		// }

		/**
		 * Reprice cart. By defualt, submits all cart lines for update, but 
		 * 	can be set to only reprice with parameter
		 * @param  {Boolean} repriceWithoutSubmit
		 * @return {promise}                      
		 */
		function repriceCartLineItems(repriceWithoutSubmit) {
			if (repriceWithoutSubmit === true) {
				ActionQueueService.scheduleAction('reprice');

			} else {
				LineItemCache.putModifiedLineItems(lineItemArray);
				ActionQueueService.scheduleAction('update');
				ActionQueueService.scheduleAction('reprice');

			}
			return ActionQueueService.scheduleAction('finish');

		}

		/**
		 * Set one or more line items to have the action 'configure' then put them
		 * 	in the modified in cache, then schedule a sync action
		 * 	to make sure the update runs.
		 *
		 * @param  {[type]} lineItems 
		 * @return {promise} promise that will resolve with the cart line
		 *                   items after sync has finished.
		 */
		function configureCartLineItems(lineItems) {
			lineItems = [].concat(lineItems);
			// LineItemSupport.setLineAction(lineItems, 'update');
			LineItemCache.putModifiedLineItems(lineItems);
			// return ActionQueueService.scheduleSync();
			ActionQueueService.scheduleAction('update');
			return ActionQueueService.scheduleAction('finish');

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
		 * Get the javscript-calculated total price. 
		 * 
		 * @return {number} total
		 */
		function getCartTotal() {
			return LineItemCache.getLineItems().total;

		}

		/**
		 * If another action should be executed, add it here.
		 * 
		 * Builds a queue of functions for synchronizing the cache with 
		 * 	the server. Each action checks if a request should be made,
		 * 	and returns a promise that resolves when its request is complete.
		 * Actions that may 
		 * 	
		 * Order of actions:
		 * 	1: If there are modified items, send them in an update action.
		 * 	2: If there are temporary additions, the temp line
		 * 			items are made pending and a request to add them is
		 * 			submitted. 
		 * 	3: If there are temp deletions, those are made pending 
		 * 			and a request to remove them is submitted.
		 *  ?: TODO: Constraint rules go here
		 * 	4: If there are items with price pending, a request 
		 * 			is sumbmitted to continue processing pricing.
		 * 	5: A final action is always added. This may schedule
		 * 			another sync event (if price is pending), and it
		 * 			resolves by getting items from the cart. 
		 * 			
		 * @return {Array of Functions} the actions in the order to execute.
		 */
		function registerAllActions() {
			//Going to have an action that combines update, add, and remove
			// ActionQueueService.registerAction(processLineItems, 110, 'processLineItems');
			ActionQueueService.registerAction(update, 100, 'update');
			ActionQueueService.registerAction(assetAction, 90, 'assetAction');
			ActionQueueService.registerAction(add, 80, 'add');
			ActionQueueService.registerAction(remove, 70, 'remove');
			ActionQueueService.registerAction(reprice, 60, 'reprice');
			ActionQueueService.registerAction(finish, 50, 'finish');

			/**
			 * For now, just pass the rejected promise up.
			 */
			function onRejection(reason) {
				return $q.reject(reason);

			}

			function update() {
				var pendingUpdatesKey = LineItemCache.generatePendingUpdates();
				if (pendingUpdatesKey) {
					var pendingUpdates = LineItemCache.getPendingUpdates(pendingUpdatesKey);
					LineItemSupport.setLineAction(pendingUpdates, 'update');
					//May want to leave out TOTAL_ITEMS and just let reprice action handle that
					var includeParams = [
						ConfigurationDataService.includeConstants.CART_LINES,
						ConfigurationDataService.includeConstants.CHARGE_LINES,
						ConfigurationDataService.includeConstants.ATTRIBUTE_VALUES,
						ConfigurationDataService.includeConstants.OPTION_LINES,
						ConfigurationDataService.includeConstants.RULE_ACTIONS,
						ConfigurationDataService.includeConstants.TOTAL_ITEMS,
						ConfigurationDataService.includeConstants.PRICE_RAMPS
					];
					var actionPromise = ConfigurationDataService.createCartRequestDO(pendingUpdates, totalItemsArray, true, false, includeParams).then(function(cartRequest){
						return RemoteService.performAction(cartRequest);
					});
					
					return actionPromise.then(
							function(result) {
								var lineItemData = result.lineItems;
								LineItemCache.putLineItems(lineItemData, pendingUpdatesKey);
								ConstraintRuleDataService.updateRuleActions(result.ruleActions);
								PageErrorDataService.updatePageErrors(result.pageErrors);
								updateTotalItemArray(result.totalItems);
								return updateLineItemArray();

							}, 
							onRejection
					);

				}

			}

			function assetAction() {
				var pendingAssetActionsKey = LineItemCache.generatePendingAssetActions();
				if(pendingAssetActionsKey) {
					var reqObj = {};
					reqObj.lineItems = LineItemCache.getPendingAssetActions(pendingAssetActionsKey);
					//Assets may want more
					reqObj.responseIncludes = [ConfigurationDataService.includeConstants.CART_LINES];
					var actionRequest = ConfigurationDataService.createAssetActionRequest(reqObj);
					var requestPromise = RemoteService.performAssetActions(actionRequest);

					return requestPromise.then(
							function(result) {
								if(!result.lineItems) {
									// ERROR!
									return result;
								} else {
									var lineItemData = result.lineItems;
									LineItemCache.putLineItems(lineItemData, pendingAssetActionsKey);
									return updateLineItemArray();
								}
							},
							onRejection
					);
				} 
			}

			function add() {
				var pendingAdditionsKey = LineItemCache.generatePendingAdditions();
				if (pendingAdditionsKey) {
					var pendingAdditionItems = LineItemCache.getPendingAdditions(pendingAdditionsKey);
					LineItemSupport.setLineAction(pendingAdditionItems, 'add');
					var includeParams = [
						ConfigurationDataService.includeConstants.CART_LINES,
						ConfigurationDataService.includeConstants.CHARGE_LINES,
						ConfigurationDataService.includeConstants.ATTRIBUTE_VALUES,
						ConfigurationDataService.includeConstants.OPTION_LINES,
						ConfigurationDataService.includeConstants.RULE_ACTIONS,
						ConfigurationDataService.includeConstants.TOTAL_ITEMS,
						ConfigurationDataService.includeConstants.PRICE_RAMPS
					];
					var actionPromise = ConfigurationDataService.createCartRequestDO(pendingAdditionItems, null, true, false, includeParams).then(function(cartRequest){
						return RemoteService.addToCart(cartRequest);
					});
					
					return actionPromise.then(
							function(result) {
								var lineItemData = result.lineItems;
								LineItemCache.putLineItems(lineItemData, pendingAdditionsKey);
								ConstraintRuleDataService.updateRuleActions(result.ruleActions);
								PageErrorDataService.updatePageErrors(result.pageErrors);
								updateTotalItemArray(result.totalItems);
								return updateLineItemArray();

							}, 
							onRejection
					);

				}

			}

			function remove() {
				var pendingDeletionsKey = LineItemCache.generatePendingDeletions();
				if (pendingDeletionsKey) {
					var pendingDeletionItems = LineItemCache.getPendingDeletions(pendingDeletionsKey);
					LineItemSupport.setLineAction(pendingDeletionItems, 'delete');
					var includeParams = [
						ConfigurationDataService.includeConstants.CART_LINES,
						ConfigurationDataService.includeConstants.CHARGE_LINES,
						ConfigurationDataService.includeConstants.RULE_ACTIONS,
						ConfigurationDataService.includeConstants.TOTAL_ITEMS
					];

					var actionPromise = ConfigurationDataService.createCartRequestDO(pendingDeletionItems, null, true, false, includeParams).then(function(cartRequest){
						return RemoteService.deleteLineItems(cartRequest);
					});
					 
					return actionPromise.then(
							function(result) {
								var lineItemData = result.lineItems;
								LineItemCache.putLineItems(lineItemData, pendingDeletionsKey);
								ConstraintRuleDataService.updateRuleActions(result.ruleActions);
								PageErrorDataService.updatePageErrors(result.pageErrors);
								updateTotalItemArray(result.totalItems);
								return updateLineItemArray();

							}, 
							onRejection
					);

				}

			}

			function reprice() {
				var includeParams = [
					ConfigurationDataService.includeConstants.CART_LINES,
					ConfigurationDataService.includeConstants.OPTION_LINES,
					ConfigurationDataService.includeConstants.CHARGE_LINES,
					ConfigurationDataService.includeConstants.RULE_ACTIONS,
					ConfigurationDataService.includeConstants.TOTAL_ITEMS,
					ConfigurationDataService.includeConstants.PRICE_RAMPS

				];
				var actionPromise = ConfigurationDataService.createCartRequestDO(null, null, false, true, includeParams).then(function(cartRequest){
					return RemoteService.updatePrice(cartRequest);
				});

				return actionPromise.then(
						function(result) {
							var lineItemData = result.lineItems;
							var totalsData = result.totalItems;
							updateTotalItemArray(totalsData);
							LineItemCache.putLineItems(lineItemData);
							PageErrorDataService.updatePageErrors(result.pageErrors);
							return updateLineItemArray();

						}, 
						onRejection
				);

			}

			function finish() {
				if (LineItemCache.getIsPricePending()) {
					ActionQueueService.scheduleAction('reprice');
					ActionQueueService.scheduleAction('finish');


				}
				return updateLineItemArray();

			}

		}

	}

})();