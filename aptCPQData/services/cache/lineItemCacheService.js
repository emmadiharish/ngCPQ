;(function() {
	angular.module('aptCPQData').service('LineItemCache', LineItemCache); 

	LineItemCache.$inject = [
		'$q',
		'$log',
		'lodash'
	];

	/**
	 * Structure for maintaining available line items in cart.
	 * Importantly, used to keep line items in three states:
	 * 		- tempLineItems: have been added locally, but not submitted to server
	 * 		- pendingLineItems: have been submitted but their response has not come back  
	 * 		- lineItems: have been retrieved from server
	 *
	 *  Has been broken into its own service.
	 */
	function LineItemCache($q, $log, _) {
		var cache = this;
		cache.isValid = false;
		var isAllItemsValid = false;

		var allItemsList = [];
		var allPrimaryItemsList = [];
		var allItemsByPrimaryLineNumber = {};
		var allItemSOsByPrimaryLineNumber = {};
		
		var mainLineItemCollection = new LineItemCollection();

		var assetKey = 1;
		var tempAssetActions = [];
		var pendingAssetActions = {};
		var pricePendingInfo = {
			IsPricePending: true
		};

		cache.getLineItems = getLineItems;
		cache.getLineItem = getLineItem;
		cache.getLineItemSOsByPrimaryLineNumber = getLineItemSOsByPrimaryLineNumber;
		cache.getLineItemsByPrimaryLineNumber = getLineItemsByPrimaryLineNumber;
		cache.getChargePrimaryLines = getChargePrimaryLines;
		cache.getLineItemDOChanges = getLineItemDOChanges;
		cache.refreshAllItemsList = refreshAllItemsList;
		cache.getSize = getSize;
		cache.putLineItemDOs = putLineItemDOs;
		cache.removeLineItems = removeLineItems;
		cache.putAssetActions = putAssetActions;
		cache.getAssetActions = getAssetActions;
		cache.clearAssetActions = clearAssetActions;
		cache.getAssetKey = getAssetKey;
		cache.setAssetKey = setAssetKey;
		cache.putPendingAssetAction = putPendingAssetAction;
		cache.getPendingAssetActions = getPendingAssetActions;
		cache.clearPendingAssetActions = clearPendingAssetActions;
		cache.putPricePendingInfo = putPricePendingInfo;
		cache.getIsPricePending = getIsPricePending;

		/* - Method declarations - */

		/**
		 * Return the map of primary lines by their primary line number
		 * includes option lines also.
		 * @return {map of line items}
		 */
		function getLineItemsByPrimaryLineNumber() {
			if (!isAllItemsValid) {
				refreshAllItemsList();

			}
			return allItemsByPrimaryLineNumber;

		}

		/**
		 * Return the array of items in all states. 
		 * If called multiple times, this will only have to concat
		 * 	all the items into a list once.
		 * @return {array of line items}
		 */
		function getLineItemSOsByPrimaryLineNumber() {
			if (!isAllItemsValid) {
				refreshAllItemsList();

			}
			return allItemSOsByPrimaryLineNumber;

		}

		/**
		 * Return the array of items in all states. 
		 * If called multiple times, this will only have to concat
		 * 	all the items into a list once.
		 * @return {array of line items}
		 */
		function getLineItems() {
			if (!isAllItemsValid) {
				refreshAllItemsList();

			}
			return allItemsList;

		}

		/**
		 * Return the array of primary lines
		 * @return {array of line items}
		 */
		function getChargePrimaryLines () {
			if (!isAllItemsValid) {
				refreshAllItemsList();

			}
			return allPrimaryItemsList;

		}

		/** Get a line item in the cache by PLN */
		function getLineItem(primaryLineNumber) {
			return mainLineItemCollection.getLineItem(primaryLineNumber);

		}
		/** Return a deep copy of pending changes */
		function getLineItemDOChanges() {
			var lines = mainLineItemCollection.getLineItems(true);
			var linesWithChanges = [];
			_.forEach(lines, function (nextLineModel) {
				var changeResult = nextLineModel.getLineItemDOChanges();
				if (changeResult) {
					linesWithChanges.push(changeResult);

				}

			});
			return linesWithChanges;

		}

		/**
		 * Pull line items into flat array from map collection.
		 * @return {list of line items} 
		 */
		function refreshAllItemsList() {
			if (!cache.isValid) {
				allItemsList = [];
				allPrimaryItemsList = [];
				allItemsByPrimaryLineNumber = {};
				allItemSOsByPrimaryLineNumber = {};
				return allItemsList;

			}
			allItemsList = mainLineItemCollection.getLineItems();
			//store items by primary line #
			(function populatePrimaryLineMap(items) {
				_.forEach(items, function (chargeLine) {
					if(chargeLine.isSelected()) {
						var lineItemSO = chargeLine.lineItemSO();	
						var primaryLineNumber = chargeLine.primaryLineNumber();
						allItemSOsByPrimaryLineNumber[primaryLineNumber] = lineItemSO;
						allItemsByPrimaryLineNumber[primaryLineNumber] = chargeLine;
						allPrimaryItemsList.push(chargeLine);

						if(chargeLine.optionLines.length) {
							populatePrimaryLineMap(chargeLine.optionLines);
						}
					}
				});
			})(allItemsList);

			return allItemsList;
		}

		function getSize() {
			if (!cache.isValid) {
				return 0;

			}
			return mainLineItemCollection.size;

		}
		function putLineItemDOs(lineItemDOArray, createModelFn) {
			isAllItemsValid = false;
			lineItemDOArray = [].concat(lineItemDOArray);
			cache.isValid = cache.isValid || !!lineItemDOArray;
			mainLineItemCollection.putLineItemDOs(lineItemDOArray, createModelFn);
			return cache;

		}
		function removeLineItems(itemArray, forceDelete) {
			if (angular.isUndefined(itemArray)) {
				return false;
			}
			isAllItemsValid = false;
			itemArray = [].concat(itemArray);
			var anyItem = false;
			_.forEach(itemArray, function (nextItem) {
				//mark item for delete
				anyItem = mainLineItemCollection.deleteItem(nextItem, forceDelete) || anyItem; 
			});
			return anyItem;

		}
		function putPricePendingInfo(pendingInfoObject) {
			if (pendingInfoObject) {
				pricePendingInfo = pendingInfoObject;
				
			} else {
				pricePendingInfo = null;

			}
			return pricePendingInfo;

		}
		function getIsPricePending() {
			if (pricePendingInfo) {
				return pricePendingInfo.IsPricePending;

			} else {
				//If price pending info isn't valid, check line items
				return _.some(getLineItems(), function (nextItem) {
					return nextItem && nextItem.isPricePending();

				});

			}

		}

		/** Managing asset actions */

		function putAssetActions(actions) {
			tempAssetActions = (tempAssetActions || []).concat(actions);
		}
		
		function getAssetActions() {
			return tempAssetActions;
		}

		function clearAssetActions() {
			tempAssetActions = [];
		}
		
		function getAssetKey() {
			return assetKey;
		}

		function setAssetKey(value) {
			assetKey = value;
		}

		function putPendingAssetAction(hashKey, actions) {
			pendingAssetActions[hashKey] = actions;
		}


		function getPendingAssetActions(hashKey) {
			return pendingAssetActions[hashKey];
		}

		function clearPendingAssetActions(hashKey) {
			delete pendingAssetActions[hashKey];
		}
	
		/** --------------------------------------------------------------------- */
		/** --------------------------------------------------------------------- */

		/**
		 * Constructor for making a set specifically for line items. This lets
		 * 	us try out different ways of hashing and merging line items to keep
		 * 	the DO's on the client side in sync with the server responses.
		 * 	
		 * @param {array} initItems [items to add to the set immediately.]
		 */

		function LineItemCollection(initItems) {
			var itemCollection = this;
			var items = new Object(null);
			var txnPrimaryLineNumberMap = new Object(null);
			var hash = hashLineNumber;
			
			itemCollection.size = 0;

			itemCollection.getLineItem = getLineItem;
			itemCollection.getLineItems = getLineItems;
			itemCollection.hasLineItem = hasLineItem;
			itemCollection.putLineItemDO = putLineItemDO;
			itemCollection.putLineItemDOs = putLineItemDOs;
			itemCollection.deleteItem = deleteItem;

			putLineItemDOs(initItems);

			/**
			 * Maintain a consistent hash that identifies each line item. To do this,
			 * 		a mapping between the line item's primary line number and it's txn
			 * 		primary line number is maintained.
			 * 		
			 * @param  {[type]} lineItemDO item
			 * @return {number}            hash value
			 */
			function hashLineNumber(lineItemOrNumber) {
				var itemKey = isValidKey(lineItemOrNumber) ? lineItemOrNumber : lineItemOrNumber.txnPrimaryLineNumber;
				var mappedVal = txnPrimaryLineNumberMap[itemKey];
				return mappedVal ? mappedVal : itemKey;

			}

			function mergeLineItemWithDO(lineItemModel, lineItemDO) {
				lineItemModel.mergeLineItemDO(lineItemDO);
				var actualPLN = lineItemModel.primaryLineNumber();
				if (lineItemModel.txnPrimaryLineNumber != actualPLN) {
					txnPrimaryLineNumberMap[lineItemModel.txnPrimaryLineNumber] = actualPLN;
					// lineItemModel.txnPrimaryLineNumber = actualPLN;
					return actualPLN;
					
				}
				return lineItemModel.txnPrimaryLineNumber;

			}

			function hasLineItem(itemOrKey) {
				var itemKey;
				if (isValidKey(itemOrKey)) {
					var mappedVal = txnPrimaryLineNumberMap[txnPLN];
					itemKey =  mappedVal ? mappedVal : itemOrKey;

				} else {
					itemKey = hash(itemOrKey);
				
				}
				return !!(items[itemKey]);

			}
			function getLineItem(itemOrKey) {
				var itemKey = hash(itemOrKey);
				var lineItem = items[itemKey];
				if (!lineItem) {
					//Loop accross item until matching child is found
					_.some(items, function (nextItem) {
						lineItem = nextItem.getOptionLine(itemKey);
						return !!lineItem;						

					});

				}
				return lineItem;

			}
			function getLineItems(includeUnselected) {
				var nextItem;
				var allItems = [];
				_.forOwn(items, function (nextItem, key) {
					if (includeUnselected || nextItem.isSelected()) {
						allItems.push(nextItem);
						
					}

				});
				// allItems.sort(compareLineItemSequence);
				return allItems;

			}

			/**
			 * Add the line item DO to the cache. 
			 * Use callback function to return Line Item Model representation
			 * @param lineItemDO the line item DO
			 * @return the line item model structure
			 */
			function putLineItemDO(lineItemDO, createModelFn) {
				var itemHash;
				if (lineItemDO) {
					itemHash = hash(lineItemDO);

				}
				if (isValidKey(itemHash)) {
					var existingModel = items[itemHash];
					if (!angular.isDefined(existingModel)) {
						items[itemHash] = createModelFn(lineItemDO);
						itemCollection.size += 1;

					} else {
						mergeLineItemWithDO(existingModel, lineItemDO);
						var newHash = hash(existingModel);
						if (isValidKey(newHash) && newHash != itemHash) {
							$log.debug('Merge rehash: ', newHash, existingModel);
							// What if there is already a value at items[newHash]?
							items[newHash] = existingModel;
							delete items[itemHash];

						}
						
					}
					
				} else {
					$log.error('Failed to hash', lineItemDO);

				}
				return itemCollection;

			}
			function putLineItemDOs(allItems, createModelFn) {
				if (allItems) {
					for (var i = 0; i < allItems.length; i += 1) {
						putLineItemDO(allItems[i], createModelFn);

					}

				}
				return itemCollection;

			}
			function deleteItem(itemOrKey, forceDelete) {
				var itemKey = isValidKey(itemOrKey) ? itemOrKey : hash(itemOrKey);
				var hasPendingItem = false;
				if (isValidKey(itemKey) && items[itemKey]) {
					if (forceDelete) {
						items[itemKey].deselect();
						itemCollection.size --;
						delete items[itemKey];

					} else if (items[itemKey].deselect()) {
						itemCollection.size --;
						hasPendingItem = true;

					} else {
						//If item was already deslected, remove it from collection
						delete items[itemKey];

					}
					
				} 
				return hasPendingItem;

			}

			function isValidKey(potentialKey) {
				var keyType = typeof potentialKey;
				return keyType === 'string' || keyType === 'number';

			}

		}

	}
})();