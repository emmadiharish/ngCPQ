;(function() {
	angular.module('aptCPQData')
		.service('LineItemCache', LineItemCache); 

	LineItemCache.$inject = ['LineItemSupport'];

	/**
	 * Structure for maintaining available line items in cart.
	 * Importantly, used to keep line items in three states:
	 * 		- tempLineItems: have been added locally, but not submitted to server
	 * 		- pendingLineItems: have been submitted but their response has not come back  
	 * 		- lineItems: have been retrieved from server
	 *
	 *  Has been broken into its own service.
	 */
	function LineItemCache(LineItemSupport) {
		var hashCount = 0; 
		var pendingAdditionsSize = 0;
		var pendingDeletionsSize = 0;
		var lineItemTotal = 0;
		var isPricePending = true;
		var isAllItemsValid = false;
		var isItemsModified = false;

		var allItemsList = [];
		var mainLineItemSet = LineItemSupport.newLineItemSet();
		var tempAssetLineItems = [];
		var tempLineItemsSet = LineItemSupport.newLineItemSet();
		var modifiedSet = LineItemSupport.newLineItemSet();
		var tempDeletionsSet = LineItemSupport.newLineItemSet();
		//Maps: hashKey => lineItemDO
		var pendingAdditionsMap = {};
		var pendingDeletionsMap = {};
		var pendingUpdatesMap = {};
		var pendingAssetActionsMap = {};

		//Cach interface
		var cache = {
			isValid: false,
			getLineItems: getLineItems,
			getLineItem: getLineItem,
			getSize: getSize,
			getIsPricePending: getIsPricePending,
			putLineItems: putLineItems,
			putLineItem: putLineItem,
			putTempLineItems: putTempLineItems,
			putTempAssetItems: putTempAssetItems,

			putModifiedLineItems: putModifiedLineItems,
			removeLineItems: removeLineItems,
			generatePendingAdditions: generatePendingAdditions,
			generatePendingDeletions: generatePendingDeletions,
			generatePendingUpdates: generatePendingUpdates,
			generatePendingAssetActions: generatePendingAssetActions,
			getPendingAdditions: getPendingAdditions,
			getPendingDeletions: getPendingDeletions,
			getPendingUpdates: getPendingUpdates,
			getPendingAssetActions: getPendingAssetActions
			
		};
		return cache;

		/* - Method declarations - */

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
		/** Get a line item in the cache by id */
		function getLineItem(lineItemId) {
			var mockItem = {
				"txnPrimaryLineNumber": lineItemId
			};
			return mainLineItemSet.getItem(mockItem);

		}
		/**
		 * Concat line items from all states into a list for display
		 * Does not perform a deep copy -- i.e. modifications elsewhere
		 *  change the cache. Upside is that this won't use extra space,
		 *  except the size of the arrray.
		 * Modifications to lineItems and pendingLineItems will not be submitted to server
		 * @return {list of line items} 
		 */
		function refreshAllItemsList() {
			if (!cache.isValid) {
				allItemsList = [];
				return allItemsList;

			}
			allItemsList = mainLineItemSet.getAllItems();
			isAllItemsValid = true;
			allItemsList.total = lineItemTotal;
			return allItemsList;

		}
		function getSize() {
			if (!cache.isValid) {
				return 0;

			}
			return mainLineItemSet.size;

		}
		function getIsPricePending() {
			return isPricePending;

		}
		function putLineItems(items, pendingHashKey) {
			cache.isValid = !!items;
			isAllItemsValid = false;
			isItemsModified = false;
			// lineItems = items;
			//Should this merge them?
			// mainLineItemSet = LineItemSupport.newLineItemSet(items);
			mainLineItemSet.mergeAllItems(items);
			//Need do an overwrite instead of a merge because charge lines are coming
			// back at the wrong level. 
			if (pendingHashKey && pendingAdditionsMap[pendingHashKey]) {
				pendingAdditionsSize -= pendingAdditionsMap[pendingHashKey].length;
				delete pendingAdditionsMap[pendingHashKey];

			} else if (pendingHashKey && pendingDeletionsMap[pendingHashKey]) {
				delete pendingDeletionsMap[pendingHashKey];

			} else if (pendingHashKey && pendingUpdatesMap[pendingHashKey]) {
				delete pendingUpdatesMap[pendingHashKey];

			} else if (pendingHashKey && pendingAssetActionsMap[pendingHashKey]) {
				delete pendingAssetActionsMap[pendingHashKey];
			}
			processLineItems();

		}
		function putLineItem(item) {
			isAllItemsValid = false;
			mainLineItemSet.mergeItem(item);

		}
		function putTempLineItems(items) {
			isAllItemsValid = false;
			items = (items || []);
			// tempLineItems = (tempLineItems || []).concat(items);
			tempLineItemsSet.addAllItems(items);
			mainLineItemSet.mergeAllItems(items);

		}
		function putTempAssetItems(items) {
			isAllItemsValid = false;
			items = (items || []);
			tempAssetLineItems = (tempAssetLineItems || []).concat(items);
			mainLineItemSet.mergeAllItems(items);

		}
		//TODO: track the modified in a set
		function putModifiedLineItems(items) {
			isItemsModified = true;
			modifiedSet.addAllItems(items);

		}
		function removeLineItems(itemsToRemove) {
			isAllItemsValid = false;
			// itemsToRemove = removeTempLineItems(itemsToRemove);
			var realItemToDelete = false;
			var nextItem;
			for (var i = 0; i < itemsToRemove.length; i++) {
				nextItem = itemsToRemove[i];
				LineItemSupport.deselectLineItem(nextItem);
				if (mainLineItemSet.hasItem(nextItem)) {
					mainLineItemSet.deleteItem(nextItem);

				}
				if (tempLineItemsSet.hasItem(nextItem)) {
					tempLineItemsSet.deleteItem(nextItem);

				} else {
					realItemToDelete = true;
					tempDeletionsSet.addItem(nextItem);

				}

			}
			return realItemToDelete;

		}
		function generatePendingAssetActions() {
			var hashKey;
			if (tempAssetLineItems.length === 0) {
				return hashKey;
			}
			hashKey = generateHash();
			pendingAssetActionsMap[hashKey] = LineItemSupport.cloneDeep(tempAssetLineItems); // clone temp actions array
			tempAssetLineItems = []; // clear the temp actions array
			return hashKey;
			
		}
		function generatePendingAdditions() {
			var hashKey;
			var itemsToAdd = tempLineItemsSet.getAllItems();
			if (itemsToAdd.length === 0) {
				return hashKey;

			}
			hashKey = generateHash();
			pendingAdditionsMap[hashKey] = LineItemSupport.cloneDeep(itemsToAdd);
			tempLineItemsSet = LineItemSupport.newLineItemSet();
			return hashKey;

		}
		function generatePendingDeletions() {
			var hashKey;
			var itemsToDelete = tempDeletionsSet.getAllItems();
			if (itemsToDelete.length === 0) {
				return hashKey;

			}
			hashKey = generateHash();
			pendingDeletionsMap[hashKey] = LineItemSupport.cloneDeep(itemsToDelete);
			tempDeletionsSet = LineItemSupport.newLineItemSet();
			return hashKey;

		}
		function generatePendingUpdates() {
			var hashKey;
			var itemsToUpdate = modifiedSet.getAllItems();
			if (itemsToUpdate.length === 0) {
				return hashKey;

			}
			hashKey = generateHash();
			pendingUpdatesMap[hashKey] = LineItemSupport.cloneDeep(itemsToUpdate);
			modifiedSet = LineItemSupport.newLineItemSet();
			return hashKey;

		}
		function getPendingAssetActions(hashKey) {
			if (hashKey && pendingAssetActionsMap[hashKey]) {
				return pendingAssetActionsMap[hashKey];
			}
			return [];
		}
		//TODO: get only those items which have changes.
		function getPendingUpdates(hashKey) {
			if (hashKey && pendingUpdatesMap[hashKey]) {
				return pendingUpdatesMap[hashKey];

			}
			return [];

		}
		function getPendingAdditions(hashKey) {
			if (hashKey && pendingAdditionsMap[hashKey]) {
				return pendingAdditionsMap[hashKey];

			}
			return [];

		}
		function getPendingDeletions(hashKey) {
			if (hashKey && pendingDeletionsMap[hashKey]) {
				return pendingDeletionsMap[hashKey];

			}
			return [];

		}
		//Used for giving unique hash code to items in pending items map
		//Originally the system time string + random int, now just a count.
		function generateHash() {
			return String(hashCount ++);
			// var dateStr = (new Date()).toISOString();
			// var randInt = (Math.random() * 100000).toFixed();
			// return (dateStr + randInt);

		}	

		/**
		 *	--- Going to remove this processing to keep cached copy clean ---
		 * 
		 * Any repeat processing of all line items should be handled here.
		 * Modifies the line items in-place.
		 */
		function processLineItems() {
			var nextItem;
			var isPending = false;
			var lineItems = mainLineItemSet.getAllItems();
			for (var itemIndex = lineItems.length - 1; itemIndex >= 0; itemIndex--) {
				nextItem = lineItems[itemIndex];
				if (!(nextItem && nextItem.chargeLines && nextItem.chargeLines[0])) {
					continue;
					
				}
				//Check if item has been marked for deletion
				if (tempDeletionsSet.hasItem(nextItem)) {
					// nextItem.lineAction = "delete";
					mainLineItemSet.deleteItem(nextItem);
					continue;

				}
				//Get pricing information
				if (LineItemSupport.getIsPricePending(nextItem)) {
					isPending = true;

				} 

			}
			isPricePending = isPending;

		}

	}
})();