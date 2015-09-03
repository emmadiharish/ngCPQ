(function() {
	var assetFilterCtrl, AssetFilter;

	assetFilterCtrl = function($timeout, $log, systemConstants, ngCPQLabels, AssetService ) {
		var ctrlRef = this;
		ctrlRef.filteredResponse = false;
		ctrlRef.nsPrefix = systemConstants.nsPrefix;

		ctrlRef.startDateField = { 
			"FieldType": "DATE",
			"ElementId": "startDateFilterField",
			"IsEditable": true
		};

		ctrlRef.endDateField = { 
			"FieldType": "DATE",
			"ElementId": "endDateFilterField",
			"IsEditable": true
		};

		// fetch filters from backend
		AssetService.getAssetFilterList().then(function(result){
			// filters
			var filterData = result;
			var iFilterList = [];
			var filterListKeys = Object.keys(filterData.assetFilterFields)
			filterListKeys.forEach(function(key) {
				var filterInstance = filterData.assetFilterFields[key];
				switch (filterInstance.FieldType) {
					case "PICKLIST":
						filterInstance.viewCollapse = false;

						// add a 'selected' model attribute to each of the picklist items
						filterInstance.pickListEntries.forEach( function(picklistItem) {
							picklistItem.selected = false;
							picklistItem.FieldName = filterInstance.FieldName;
						});
						iFilterList.push(filterInstance);
						break;
					case "DATE":
					  filterInstance.viewCollapse = false;
						filterInstance.dateValue = "";
						iFilterList.push(filterInstance);
						break;
					case "STRING":
					  filterInstance.viewCollapse = false;
					  filterInstance.stringValue = "";
					  iFilterList.push(filterInstance);
					  break;
					case "REFERENCE":
						if (filterInstance.FieldName === (ctrlRef.nsPrefix + "AccountId__c") || filterInstance.FieldName === (ctrlRef.nsPrefix + "LocationId__c")) {
							filterInstance.viewCollapse = false;

							// add a 'selected' model attribute to each of the picklist items
							filterInstance.referenceObjects.forEach( function(picklistItem) {
								picklistItem.selected = false;
								picklistItem.FieldName = filterInstance.FieldName;
							});
						iFilterList.push(filterInstance);
						} else {
							$log.info("Unsupported Filter: " + filterInstance.FieldName);
						}
						break;
					default:
						$log.info("Unsupported Filter Type: " + filterInstance.FieldType);
						break;
				}
			});			
			// console.log(JSON.stringify(iFilterList));

			ctrlRef.filterList = iFilterList;
			ctrlRef.labels = ngCPQLabels.CustomLabel;
		});

		this.toggleLoading = function() {
			AssetService.loadingDiv = true;
			$timeout(function(){
				AssetService.loadingDiv = false;
			}, 
			2000);
		};

		this.applySelectedFilters = function() {
			// AssetService.handleSearchFilterApply(ctrlRef.filterList);
			var submitFilterList = [];

			if(AssetService.searchKey){
				submitFilterList.push({
					"FieldType": "REFERENCE",
					"FieldName": ctrlRef.nsPrefix + "ProductId__c",
					"FieldValue": AssetService.searchKey
				});
			}

			ctrlRef.filterList.forEach(function(filter) {
				var filterObj = {};
				// var filter = filterList.assetFilterFields[key];
				filterObj.FieldType = filter.FieldType;
				filterObj.FieldName = filter.FieldName;
				
				switch(filter.FieldType) {
					case "PICKLIST":
						var pickListValues = [];
						for (var i=0; i<filter.pickListEntries.length; i++) {
							if (filter.pickListEntries[i].selected) {
								pickListValues.push(filter.pickListEntries[i].value);
							}
						}
						if (pickListValues.length) {
							filterObj.FieldValue = pickListValues.join();
							submitFilterList.push(filterObj);
						}
						break;

					case "REFERENCE":
						// TODO: currently only support these two
						if (filter.FieldName === (ctrlRef.nsPrefix + "LocationId__c") || filter.FieldName === (ctrlRef.nsPrefix + "AccountId__c")) {
							var pickListValues = [];
							for (var i=0; i<filter.referenceObjects.length; i++) {
								if (filter.referenceObjects[i].selected) {
									pickListValues.push(filter.referenceObjects[i].Id);
								}
							}
							if (pickListValues.length) {
								filterObj.FieldValue = pickListValues.join();
								submitFilterList.push(filterObj);
							}
						}
						break;
					
					case "DATE":
						if (filter.dateValue != null && filter.dateValue != "") {
							filterObj.FieldValue = filter.dateValue;
							submitFilterList.push(filterObj);
							// var date = filter.dateValue.getDate();
							// if (date != null) {
							// 	filterObj.FieldValue = date.getTime();
							// 	// console.log("Got DateValue: " + filterObj.value);
							// 	submitFilterList.push(filterObj);
							// }
						}
						break;

					case "STRING":
						if (filter.stringValue.length) {
							filterObj.FieldValue = filter.stringValue;
							submitFilterList.push(filterObj);
						}
						break;

					default:
						$log.info("Unsupported Filter Type");
						break;
				}
			});

			if(submitFilterList.length > 0) {
				AssetService.loadingDiv = true;
				ctrlRef.filteredResponse = true;
				AssetService.invalidateAssetCache();
				return AssetService.handleSearchFilterApply(submitFilterList).then(function(result){
					return result;
				}, 
				function(error) {
					$log.error(error);
					return error;
				})
				.finally(function() {
					$log.debug("handleSearchFilterApply finally block");
					AssetService.loadingDiv = false;
				});
			} else {
				// do nothing
				return;
			}
		};

		this.clearSelectedFilters = function() {
			// click handler to clear all filters that have been selected
			for (var filterIdx in ctrlRef.filterList) {
				if (ctrlRef.filterList[filterIdx].FieldType === 'PICKLIST') {
					ctrlRef.filterList[filterIdx].pickListEntries.forEach(function(picklistItem) {
						picklistItem.selected = false;
					});
				}
				else if (ctrlRef.filterList[filterIdx].FieldType === 'REFERENCE' && 
					(ctrlRef.filterList[filterIdx].FieldName === (ctrlRef.nsPrefix + "LocationId__c") || 
						ctrlRef.filterList[filterIdx].FieldName === (ctrlRef.nsPrefix + "AccountId__c"))) {
					ctrlRef.filterList[filterIdx].referenceObjects.forEach(function(picklistItem) {
						picklistItem.selected = false;
					});
				}
				else if (ctrlRef.filterList[filterIdx].FieldType == 'DATE') {
					// if (ctrlRef.filterList[filterIdx].dateValue != undefined &&
					// 	  ctrlRef.filterList[filterIdx].dateValue.setDate != undefined) {
					// 		ctrlRef.filterList[filterIdx].dateValue.setDate(null);
					// }
					if (ctrlRef.filterList[filterIdx].dateValue != undefined && ctrlRef.filterList[filterIdx].dateValue != "") {
						ctrlRef.filterList[filterIdx].dateValue = null; // attempt to clear date
					}
				}
				else if (ctrlRef.filterList[filterIdx].FieldType == 'STRING') {
					ctrlRef.filterList[filterIdx].stringValue = "";
				}
				// more types handled here...
			}
			if (ctrlRef.filteredResponse) {
				ctrlRef.filteredResponse = false;
				AssetService.loadingDiv = true;
				AssetService.invalidateAssetCache();
				return AssetService.getAssetLineItems().then(function(result){
					AssetService.loadingDiv = false;
					return result;
				});
			} 
		};
	};

	assetFilterCtrl.$inject = ['$timeout', '$log', 'systemConstants', 'aptBase.i18nService', 'AssetService'];

	AssetFilter = function(systemConstants) {
		return {
			restrict: 'E',
			scope: {},
			controller: assetFilterCtrl,
			controllerAs: 'assetCtrl',
			templateUrl: systemConstants.baseUrl + "/templates/directives/assets/assets-filter.html",
		};
	};

	AssetFilter.$inject = ['systemConstants'];

	angular.module('aptCPQUI').directive('assetsFilter', AssetFilter);

}).call(this);