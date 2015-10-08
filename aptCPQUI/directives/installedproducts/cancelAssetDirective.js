(function() {
	"use strict";

	var CancelAsset, cancelAssetController;

	cancelAssetController = function($scope, $state, $log, systemConstants, _, AssetService, LineItemSupport, i18nService) {
		var ctrlRef = this;
		this.currLineSelectionList = [];
		this.currLineSelectionMap = AssetService.currLineSelectionMap;
		// this.handleCancelOperation = handleCancelOperation;
		// this.handleConfirmOperation = handleConfirmOperation;
		this.globalEndDate = undefined;
		this.prevGlobalEndDate = undefined;
		this.loading = false;
		this.labels = i18nService.CustomLabel;

		// TODO: This is a hack - fix it.
		var dateStyleNormal = '1px solid #E3E3E3';
		var dateStyleInvalid = '1px solid #F00';
		this.dateStyle = dateStyleNormal;
		this.showTable = {};
		var calcDone = false;
		this.maxStartDate = 0;
		this.calcRequestArray = [];

		// properties of the date field
		this.dateField = { 
			"FieldType": "DATE",
			"ElementId": "terminateDate",
			"IsEditable": true
		};

		this.nsPrefix = '';

		var updateSelectionList = function(result) {
			if (result.assetLineItems != undefined && Array.isArray(result.assetLineItems)) {
				result.assetLineItems.forEach(function (assetLineItem) {
					// for each item in the map, add the metric
					var id = assetLineItem.assetLineItemSO.Id;
					AssetService.currLineSelectionMap[id].metrics = assetLineItem; 
				});
			}
		};

		var activate = function() {
			// set prefix
			ctrlRef.nsPrefix = systemConstants.nsPrefix;

			// get current time
			var today = new Date();
			
			Object.keys(AssetService.currLineSelectionMap).forEach(function (key){
				ctrlRef.currLineSelectionList.push(AssetService.currLineSelectionMap[key]);
				var id = AssetService.currLineSelectionMap[key].assetLineItemSO.Id;
				ctrlRef.showTable[id] = true; // always show tables by default;
				if (ctrlRef.maxStartDate < AssetService.currLineSelectionMap[key].assetLineItemSO[ctrlRef.nsPrefix + "StartDate__c"]) {
					ctrlRef.maxStartDate = AssetService.currLineSelectionMap[key].assetLineItemSO[ctrlRef.nsPrefix + "StartDate__c"];
				}

				// request calculations
				var calcReqObj = {
					"assetLineItemSO": {
						"Id": id
					},
					"isCalculated": false,
					"lineAction": 'Cancel'
				};

				var lineItemSOObj = {};
				lineItemSOObj[ctrlRef.nsPrefix + "Quantity__c"] = null;
				lineItemSOObj[ctrlRef.nsPrefix + "EndDate__c"] = today.getTime();

				calcReqObj.lineItemSO = lineItemSOObj;

				ctrlRef.calcRequestArray.push(calcReqObj);
			});
			
			return AssetService.calculateMetricsForAssets(ctrlRef.calcRequestArray).then(function (result){
				// handle return from calculate response
				// console.log(JSON.stringify(result));
				updateSelectionList(result);
			});
		};

		activate();

		this.toggleTableShow = function(id) {
			ctrlRef.showTable[id] = !ctrlRef.showTable[id];
		};

		this.handleCalculateMetrics = function() {
			// set calculate button toggle
			ctrlRef.calcDone = true;

			// only run calculate if needed
			if (ctrlRef.globalEndDate == ctrlRef.prevGlobalEndDate) {
				return;
			}
			
			ctrlRef.prevGlobalEndDate = ctrlRef.globalEndDate; // reset prev date
			
			// validate end date before continuing
			if (!validateEndDate()) {
				alert("Invalid Date");
				return;
			}
			
			// build request object
			ctrlRef.calcRequestArray.forEach(function (reqObj){
				reqObj.isCalculated = false; // TODO: will it still return current if set to true?
				reqObj.lineItemSO[ctrlRef.nsPrefix + "EndDate__c"] = ctrlRef.globalEndDate;
			});

			// AssetService.loadingDiv = true;
			ctrlRef.loading = true;
			return AssetService.calculateMetricsForAssets(ctrlRef.calcRequestArray).then(function (result){
				// handle return from calculate response
				// console.log(JSON.stringify(result));
				updateSelectionList(result);
				ctrlRef.loading = false;
			});
		};

		this.handleConfirmOperation = function() {
			$log.debug("Confirming Cancel");

			if (!validateEndDate()) {
				alert("Invalid Date");
				return;
			}

			// list of line items slated for cancel
			var lineItems = [];
			Object.keys(AssetService.currLineSelectionMap).forEach( function (key){
				var lineItemSO = _.cloneDeep(AssetService.currLineSelectionMap[key].assetLineItemSO);
				lineItemSO[ctrlRef.nsPrefix + "Quantity__c"] = null;
				lineItemSO[ctrlRef.nsPrefix + "EndDate__c"] = ctrlRef.globalEndDate;

				lineItems.push(lineItemSO);
			});
			
			var lineItemDOList = LineItemSupport.newLineItemForAssetActions(lineItems, "Cancel");

			// AssetService.loadingDiv = true; // show spinner while cancel is in progress
			ctrlRef.loading = true;
			AssetService.requestAssetAction(lineItemDOList).then(function(result){
				try {
					// unselect all objects
					AssetService.resetLineSelection();
					AssetService.currLineSelectionMap = {}; // clear the selection map
					AssetService.disableActions = true;
					AssetService.resetDisableActionsObj(); // disable all action buttons
					// AssetService.loadingDiv = false;
					ctrlRef.loading = false;
					$log.debug("Cancel finished!");
				} catch (error) {
					$log.error(error.message);
				} finally {
					$state.go('assets');
				}
			});
		};

		this.handleCancelOperation = function() {
			AssetService.genericCancelAction('Termination');
		};

		var validateEndDate = function() {
			var now = new Date();
			if (ctrlRef.globalEndDate === undefined || ctrlRef.globalEndDate === "") {
				$log.warn("Termination Date is not valid: " + ctrlRef.globalEndDate);
				return false;
			} else if (now.getTime() > ctrlRef.globalEndDate) {
				$log.warn("Termination Date is in the past");
				// return true;
			}
			return true;
		};

		// $scope.$watch(function () { return AssetService.loadingDiv; },
	 //    function(newVal, oldVal) {
		//   	ctrlRef.loading = newVal;
		// 	},
		// 	true
		// );
	};

	cancelAssetController.$inject = [
		'$scope', 
		'$state', 
		'$log', 
		'systemConstants', 
		'lodash', 
		'AssetService', 
		'LineItemSupport', 
		'aptBase.i18nService'
	];

	CancelAsset = function(systemConstants) {
		var directive = {
			//restrict: 'E',
			//scope: {},
			templateUrl: systemConstants.baseUrl + '/templates/directives/assets/assets-cancel.html',
			controller: cancelAssetController,
			controllerAs: 'cancelAssetCtrl',
			bindToController: true
		};
		return directive;
	};

	CancelAsset.$inject = ['systemConstants'];

	angular.module('aptCPQUI').directive('cancelAsset', CancelAsset);
}).call(this);