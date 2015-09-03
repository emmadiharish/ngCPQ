(function() {
	"use strict";

	var SwapConfirm, SwapConfirmController;

	SwapConfirmController = function($scope, $state, $stateParams, $log, $filter, systemConstants, _, AssetService, LineItemSupport, i18nService) {
		var ctrlRef = this;
		ctrlRef.loading = false;
		ctrlRef.descList = [];
		ctrlRef.labels = i18nService.CustomLabel;
		// initialize default date to tomorrow
		ctrlRef.effectiveDate = AssetService.getCurrentTime() + systemConstants.msecPerDay;
		// ctrlRef.effectiveDate = new Date(AssetService.getCurrentTime() + 864000000);

		ctrlRef.effectiveDateField = {
			"FieldType": "DATE",
			"IsEditable": true,
			"ElementId": "efectiveDateId"
		};

		var nsPrefix = systemConstants.nsPrefix;

		$log.info($stateParams.assetId + " " + $stateParams.productId); // TODO: Remove

		ctrlRef.calculateSwapMetrics = function() {
			var reqObjects = [
				{
					"assetLineItemSO": {
					"Id": $stateParams.assetId
				},
					"isCalculated": false,
					"lineAction": "Upgrade"
				}
			];

			var lineItemSOObj = {};
			lineItemSOObj[nsPrefix + "Quantity__c"] = 1;
			// lineItemSOObj[nsPrefix + "StartDate__c"] = tomorrow;
			lineItemSOObj[nsPrefix + "StartDate__c"] = ctrlRef.effectiveDate;
			lineItemSOObj[nsPrefix + "ProductId__c"] = $stateParams.productId;

			reqObjects[0].lineItemSO = lineItemSOObj;

			// AssetService.loadingDiv = true;
			ctrlRef.loading = true;
			return AssetService.calculateMetricsForAssets(reqObjects).then( function (result){
				$log.info("Calculated Metrics: " + JSON.stringify(result));
				// since only single swap items are allowed right now, use 0th index
				var metrics = result.assetLineItems[0];
				ctrlRef.descList = [
					{ 
						"label": 'Subscription Fee',
						"currentVal": undefined,
						"newVal": $filter('aptNumberToCurrency')(metrics.projected.netAmount),
						"type": 'currency',
						"display": true
					},
					{ 
						"label": 'Taxes',
						"currentVal": undefined,
						"newVal": undefined,
						"type": "",
						"display": false
					}, 
					{ 
						"label": 'Discounts',
						"currentVal": undefined,
						"newVal": undefined,
						"type": "",
						"display": false
					}, 
					{ 
						"label": 'Valid Dates',
						"currentVal": ($filter('aptDate')(metrics.current.startDate) + ' - ' + $filter('aptDate')(metrics.current.startDate)),
						"newVal": ($filter('aptDate')(metrics.projected.startDate) + ' - ' + $filter('aptDate')(metrics.projected.startDate)),
						"type": "date",
						"display": true
					}, 
					{
						"label": 'Monthly Invoiced Totals',
						"currentVal": undefined,
						"newVal": undefined,
						"type": "",
						"display": false
					},
					{
						"label": 'Invoiced',
						"currentVal": $filter('aptNumberToCurrency')(metrics.current.invoiced),
						"newVal": $filter('aptNumberToCurrency')(metrics.projected.invoiced),
						"type": "currency",
						"display": true
					},
					{
						"label": 'Paid',
						"currentVal": $filter('aptNumberToCurrency')(metrics.current.paid),
						"newVal": $filter('aptNumberToCurrency')(metrics.projected.paid),
						"type": "currency",
						"display": true
					},
					{
						"label": 'Credited',
						"currentVal": $filter('aptNumberToCurrency')(metrics.current.credited),
						"newVal": $filter('aptNumberToCurrency')(metrics.projected.credited),
						"type": "currency",
						"display": true
					},
					{
						"label": 'Balance',
						"currentVal": $filter('aptNumberToCurrency')(metrics.current.balance),
						"newVal": $filter('aptNumberToCurrency')(metrics.projected.balance),
						"type": "currency",
						"display": true
					},
					{
						"label": 'Total Billings',
						"currentVal": $filter('aptNumberToCurrency')(metrics.current.totalBillings),
						"newVal": $filter('aptNumberToCurrency')(metrics.projected.totalBillings),
						"type": "currency",
						"display": true
					},
					{
						"label": 'Balance',
						"currentVal": $filter('aptNumberToCurrency')(metrics.current.balance),
						"newVal": $filter('aptNumberToCurrency')(metrics.projected.balance),
						"type": "currency",
						"display": true
					}
				];
			}, function (res) {
    		$log.error("SwapConfirmController:: Unable to retrieve backend data");
  		}).finally(function() {
    		// called no matter success or failure
    		// AssetService.loadingDiv = false;
    		ctrlRef.loading = false;
  		});
  	};

		var activate = function() {
			// cacluate metrics
			// setup request object
			// var tomorrow = AssetService.getCurrentTime() + 864000000;
			return	ctrlRef.calculateSwapMetrics();
		};

		activate();

		this.handleConfirmOperation = function() {
			$log.info("Swap Confirmation"); //TODO : remove this

			// list of line items slated for cancel
			var lineItems = [];
			Object.keys(AssetService.currLineSelectionMap).forEach( function (key){
				var lineItemSO = _.cloneDeep(AssetService.currLineSelectionMap[key].assetLineItemSO);
				lineItemSO[nsPrefix + 'Quantity__c'] = null;
				lineItems.push(lineItemSO);
			});

			// swap product definition
			var swapProduct = { 
				"quantity": 1, // TODO: parameterize instead of hard coding - mparikh
				"productId": $stateParams.productId,
				"effectiveDate": ctrlRef.effectiveDate
			};
			
			var lineItemDOList = LineItemSupport.newLineItemForAssetActions(lineItems, 'Upgrade', swapProduct);

			// AssetService.loadingDiv = true; // show spinner while swap is in progress
			ctrlRef.loading = true;
			AssetService.requestAssetAction(lineItemDOList).then(function(result){
				// unselect all objects
				AssetService.resetLineSelection();
				AssetService.currLineSelectionMap = {}; // clear the selection map
				AssetService.disableActions = true;
				AssetService.resetDisableActionsObj(); // disable all action buttons
				// AssetService.loadingDiv = false;
				ctrlRef.loading = false;
				$log.debug("Swap finished! " + JSON.stringify(result));
				$state.go('assets');
			});
		};

		this.handleCancelOperation = function() {
			AssetService.genericCancelAction('Swap');
		};

		this.handleBackToSelection = function() {
			$state.go('^'); // parent state
		}

		// $scope.$watch(function () { return AssetService.loadingDiv; },
	 //    function(newVal, oldVal) {
		//   	ctrlRef.loading = newVal;
		// 	},
		// 	true
		// );
	};

	SwapConfirmController.$inject = [
		'$scope', 
		'$state', 
		'$stateParams', 
		'$log',
		"$filter",
		'systemConstants',
		'lodash', 
		'AssetService', 
		'LineItemSupport', 
		'aptBase.i18nService',
	];
	
	SwapConfirm = function(systemConstants) {
		var directive = {
			scope: {},
			templateUrl: systemConstants.baseUrl + '/templates/directives/assets/assets-swap-confirm.html',
			controller: SwapConfirmController,
			controllerAs: 'swapConfirmCtrl',
			bindToController: true
		};

		return directive;
	};

	SwapConfirm.$inject = ['systemConstants'];

	angular.module('aptCPQUI').directive('swapConfirm', SwapConfirm);
}).call(this);