(function() {
	var MainAsset, mainAssetCtrl;

	mainAssetCtrl = function($scope, $q, $log, $stateParams, systemConstants, _, UtilService, i18nService, AssetService, CartDataService) {
		// get line items and column metadata
		var activate, mainAssetRef;
		mainAssetRef = this;
		mainAssetRef.view = $stateParams.view;

		// mainAssetRef.linesPerPage = systemConstants.customSettings.systemProperties.LineItemsPerPage;
		mainAssetRef.linesPerPage = 10;
		mainAssetRef.loading = false;
		mainAssetRef.globalLineSelection = false;
		mainAssetRef.disableActions = true;
		mainAssetRef.disableActionsObj = AssetService.disableActionsObj; // refer to the same obj

		mainAssetRef.currentPage = 1;
		mainAssetRef.assetsInCurrentPage = [];
		mainAssetRef.contextProductIds = [];
		mainAssetRef.nsPrefix = systemConstants.nsPrefix;
		mainAssetRef.assetLineItems = [];

		mainAssetRef.labels = i18nService.CustomLabel;

		// display toggles
		mainAssetRef.showChargeLines = true;
		mainAssetRef.showOptionLines = true;
		// var currLineSelection = null; // to keep line item selection mutually exclusive

		activate = function() {
			// mainAssetRef.loading = true;
			AssetService.loadingDiv = true;
			return $q.all([
				AssetService.getAssetLineItems(), 
				AssetService.getColumnMetadata()
			]).then(function (res){
				// mainAssetRef.assetLineItems = res[0];
				// Match asset status to any items that may be in the cart.
				mainAssetRef.assetLineItems = AssetService.assetLineItems; // use the service variable instead

				// update status
				updateAssetLineItemStatus(CartDataService.inCartAssetIds);

				// Set checkboxes (in case user hit back-button from another state)
				setCheckBoxes();

				// console.log("Asset Lines: " + res[0].length)
				var assetDisplayCols = AssetService.assetColumnMetadata;

				// reorder the assetItemColumn metadata so Product__r is at the start of the array
				UtilService.reorderArray(assetDisplayCols.assetItemColumns, function (elem){
					return (elem.FieldName.indexOf('ProductId__c') > -1);
				});

				// console.log("Display Columns: " + res[1].displayColumns.assetItemColumns.length)
				// this should be a reusable utility method - mparikh
				mainAssetRef.columnTypes = assetDisplayCols.assetItemColumns.map(function(element){
					var replace_r;
					if (element.FieldType === 'REFERENCE') {
						replace_r = element.FieldName.replace('__c', '__r');
						element.FieldName = replace_r;
					}
					if (element.FieldName.indexOf('ProductId__r') > -1) {
						element.FieldType = 'DETAIL';
					} else if (element.FieldName.indexOf('ChargeType') > -1) {
						element.FieldType = 'CHARGETYPE';
						mainAssetRef.chargeKey = element.FieldName; // why?
					} else if (element.FieldName.indexOf('Quantity') > -1) {
						element.FieldType = 'QUANTITY';
					} else if (element.FieldName.indexOf('AssetStatus') > -1) {
						element.FieldType = 'STRING';
					} else if (element.FieldName.indexOf('LocationId') > -1) {
						element.FieldType = 'STRING';
					}
					return element;
				});
				mainAssetRef.tableColumns = mainAssetRef.columnTypes.filter(function(element){
					if(element.FieldName.indexOf('ChargeType') <= -1) {
						return true; // all elements that are NOT ChargeType
					}
				});

				mainAssetRef.tableColumns = _.reject(mainAssetRef.tableColumns, function (element){
					return element.FieldName.indexOf('AllowedActions') > -1; // remove Allowed Actions
				});

				// return mainAssetRef.assetDisplayCols;
			}, function (res) {
    		$log.error("mainAssetController:: unable to retrieve backend data");
  		}).finally(function() {
				AssetService.loadingDiv = false;
			});
		};
		
		activate();

		// chargeLine Status
		var updateChargeLineStatus = function(status, chargeLines) {
			// if (!Array.isArray(chargeLines) || status == undefined) {
			// 	return;
			// }

			chargeLines.forEach(function (chargeLine){
				if (status === null) {
					chargeLine.assetLineItemSO['@@PendingStatus'] = chargeLine.assetLineItemSO[mainAssetRef.nsPrefix + 'AssetStatus__c'];	
				} else {
					chargeLine.assetLineItemSO['@@PendingStatus'] = status;
				}
			});

			return;
		};

		// recursively update status within options
		var updateOptionLineStatus = function(status, optionLines) {
			// if (!Array.isArray(optionLines) || status == undefined) {
			// 	return;
			// }

			optionLines.forEach(function (optionLine){
				// update status of chargelines
				if (optionLine.hasOwnProperty('chargeLines')) {
					updateChargeLineStatus(status, optionLine.chargeLines);
				}

				// update status of sub-optionLines (recursive)
				if(optionLine.hasOwnProperty('optionLines')) {
					updateOptionLineStatus(status, optionLine.optionLines);
				}

				if (status === null) {
					optionLine.assetLineItemSO['@@PendingStatus'] = optionLine.assetLineItemSO[mainAssetRef.nsPrefix + 'AssetStatus__c'];
				} else {
					optionLine.assetLineItemSO['@@PendingStatus'] = status;	
				}
				
			});

			return;
		};

		// update pending status for assets if needed
		var updateAssetLineItemStatus = function(inCartAssetIdMap) {
			if (!Array.isArray(mainAssetRef.assetLineItems) || 
					inCartAssetIdMap == undefined ||
					mainAssetRef.assetLineItems.length == 0) 
			{
				return;
			}

			mainAssetRef.assetLineItems.forEach(function (assetLine){
				if (inCartAssetIdMap.hasOwnProperty(assetLine.assetLineItemSO.Id)) {
					var status = inCartAssetIdMap[assetLine.assetLineItemSO.Id];
					assetLine.assetLineItemSO['@@PendingStatus'] = status;
					assetLine.assetLineItemSO['@@uiSelection'] = false; // force unselect
					if (assetLine.hasOwnProperty('chargeLines')) {
						updateChargeLineStatus(status, assetLine.chargeLines);
					}
					if (assetLine.hasOwnProperty('optionLines')) {
						updateOptionLineStatus(status, assetLine.optionLines);
					}
				} else {
					assetLine.assetLineItemSO['@@PendingStatus'] = assetLine.assetLineItemSO[mainAssetRef.nsPrefix + 'AssetStatus__c'];
					if (assetLine.hasOwnProperty('chargeLines')) {
						updateChargeLineStatus(null, assetLine.chargeLines);
					}
					if (assetLine.hasOwnProperty('optionLines')) {
						updateOptionLineStatus(null, assetLine.optionLines);
					}
				}
			});
			return;
		};

		// add checkboxes
		var setCheckBoxes = function() {
			if (Object.keys(AssetService.currLineSelectionMap).length > 0) {
				mainAssetRef.assetLineItems.forEach(function(lineItem) {
					if (AssetService.currLineSelectionMap[lineItem.assetLineItemSO.Id] != undefined) {
						lineItem.assetLineItemSO['@@uiSelection'] = true;
					}
				});
			}
		};

    var initProductsInCurrentPage = function() {
      mainAssetRef.productsInCurrentPage = getContextProductsForCurrentPage();
    };

    var setContextProductsForCurrentPage = function() {
      var Start = (mainAssetRef.currentPage - 1) * mainAssetRef.linesPerPage;
      var End = Start + mainAssetRef.linesPerPage;
      mainAssetRef.currentPageLineItems = mainAssetRef.assetLineItems.slice(Start, End);
  		// return mainAssetRef.currentPageLineItems;
    }

		// maintain current page number
		mainAssetRef.pageChanged = function(newPage) {
			$log.debug("Asset Listing Page Changed: " + newPage);
      mainAssetRef.currentPage = newPage;
    };

    // open the Asset Summary Dialog
    mainAssetRef.openSummaryDialog = function(assetDetails) {
    	$log.debug(JSON.stringify(assetDetails));
    	AssetService.setSelectedSummaryAsset(assetDetails);
    }

    // Clear All Selected
    var clearAllSelected = function(){
    	$log.debug("Clearing all selected items");
    	(Object.keys(AssetService.currLineSelectionMap)).forEach( function (key){
    		AssetService.currLineSelectionMap[key].assetLineItemSO['@@uiSelection'] = false;
    		delete AssetService.currLineSelectionMap[key];
    	});
    };

    // select all line items on the page that are not already in the cart or in Cancelled state
    mainAssetRef.handleGlobalPageSelect = function(checked) {
    	$log.debug("handleGlobalPageSelect: " + checked);
    	clearAllSelected();
    	if (checked) {
    		// setContextProductsForCurrentPage();
    		var Start = (mainAssetRef.currentPage - 1) * mainAssetRef.linesPerPage;
      	var End = Math.min((Start + mainAssetRef.linesPerPage), mainAssetRef.assetLineItems.length);
      	// for all the items on this page, set checkboxes
      	for (var i = Start; i < End; i++) {
      		var lineItem = mainAssetRef.assetLineItems[i];
      		if ((lineItem.assetLineItemSO['@@PendingStatus']).indexOf('Pending') < 0 && 
      				(lineItem.assetLineItemSO['@@PendingStatus']).indexOf('Cancelled') < 0) {
      			lineItem.assetLineItemSO['@@uiSelection'] = true;
      			AssetService.currLineSelectionMap[lineItem.assetLineItemSO.Id] = lineItem;
      		}
      	}
    	} 
    	enableDisableActions();
   	};

   	var enableDisableActions = function() {
   		//enable disable actions:
			if (Object.keys(AssetService.currLineSelectionMap).length > 1) {
				AssetService.disableActionsObj.Change = 
				AssetService.disableActionsObj.Cancel = false;
				AssetService.disableActionsObj.Swap = 
				AssetService.disableActionsObj.Manage = 
				AssetService.disableActionsObj.New = true;
			} else if (Object.keys(AssetService.currLineSelectionMap).length == 1) {
				AssetService.disableActionsObj.Cancel = 
				AssetService.disableActionsObj.Swap = 
				AssetService.disableActionsObj.Change = false;
				// AssetService.disableActionsObj.Manage =
				// AssetService.disableActionsObj.New = false;
			} else {
				AssetService.disableActionsObj.Cancel = 
				AssetService.disableActionsObj.Swap = 
				AssetService.disableActionsObj.Change = true;
				// AssetService.disableActionsObj.Manage = 
				// AssetService.disableActionsObj.New = true;
			}

			AssetService.disableActions = !(Object.keys(AssetService.currLineSelectionMap).length > 0);
   	};

		// handle line selection
		mainAssetRef.handleSelectionChange = function(lineItem){
			var key = (lineItem.assetLineItemSO[mainAssetRef.nsPrefix + 'AssetLineItemId__c']) ? 
				lineItem.assetLineItemSO[mainAssetRef.nsPrefix + 'AssetLineItemId__c'] : lineItem.assetLineItemSO.Id;
			var checked = lineItem.assetLineItemSO['@@uiSelection']; // checked or unchecked
			if (checked && (AssetService.currLineSelectionMap[key] == undefined)) {
				// newly checked
				AssetService.currLineSelectionMap[key] = lineItem;
			} 
			else if (!checked && AssetService.currLineSelectionMap[key]) {
				// unchecked
				mainAssetRef.globalLineSelection = false;
				delete AssetService.currLineSelectionMap[key];
			}
			
			enableDisableActions();
		}

		// watch for changes to asset lines coming in from the filter
		$scope.$watch(function () { return AssetService.assetLineItems; },
	     function(newVal, oldVal) {
		    if (newVal == oldVal) {
					$log.debug("No change in assetLineItems");
					return;
				} else {
					mainAssetRef.assetLineItems = newVal;
					updateAssetLineItemStatus(CartDataService.inCartAssetIds);
				}
			},
			true
		);

		// watch for changes to loading div toggle
		$scope.$watch(function () { return AssetService.loadingDiv; },
	     function(newVal, oldVal) {
		    mainAssetRef.loading = newVal;
			},
			true
		);

		$scope.$watch(function() { return AssetService.disableActions; },
			function(newVal, oldVal) {
				mainAssetRef.disableActions = newVal;
			},
			true
		);

		// watch for change to the cart so Asset statuses may be updated appropriately
		$scope.$watch(function() { return CartDataService.inCartAssetIds; },
			function(newVal, oldVal) {
				if (newVal == oldVal) {
					$log.debug("No change in inCartAssetIds");
					return;
				} else {
					updateAssetLineItemStatus(newVal);
				}
			}
		);

		mainAssetRef.getColumnData = function(columnField) {
			return mainAssetRef.item.AssetLineItemSO[columnField];
		}

	};

	mainAssetCtrl.$inject = [
		'$scope', 
		'$q',
		'$log', 
		'$stateParams', 
		'systemConstants', 
		'lodash',
		'aptBase.UtilService',
		'aptBase.i18nService', 
		'AssetService',
		'CartDataService'
	];

	MainAsset = function(systemConstants) {
		var directive = {
			// restrict: 'AE',
			// scope: {},
			templateUrl: systemConstants.baseUrl + '/templates/directives/assets/assets-table.html',
			controller: mainAssetCtrl,
			controllerAs: 'mainAssetController',
			bindToController: true
		};	
		return directive;
	};

	MainAsset.$inject = ['systemConstants'];

	angular.module('aptCPQUI').directive('mainAsset', MainAsset);

	

}).call(this);