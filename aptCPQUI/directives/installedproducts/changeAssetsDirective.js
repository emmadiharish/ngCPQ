(function(){
	'use strict';
	var ChangeAssets, ChangeAssetsController;

	ChangeAssetsController = function($scope, $state, $log, systemConstants, _, AssetService, LineItemSupport, i18nService) {
		var ctrlRef = this;

		ctrlRef.loading = false;
		ctrlRef.assetLineItems = [];
		ctrlRef.labels = i18nService.CustomLabel;
		ctrlRef.nsPrefix = systemConstants.nsPrefix;
		var assetColumnMetadata = _.cloneDeep(AssetService.assetColumnMetadata); // since we mess with 'IsEditable' here
		// ctrlRef.currLineSelectionMap = AssetService.currLineSelectionMap;
		// ctrlRef.selectedCount = Object.keys(AssetService.currLineSelectionMap).length;

		var activate = function() {
			Object.keys(AssetService.currLineSelectionMap).forEach( function (key){
				ctrlRef.assetLineItems.push(AssetService.currLineSelectionMap[key]);
			});

			var columnTypes = assetColumnMetadata.assetItemColumns.map(function(element){
				var replace_r;
				if (element.FieldType === 'REFERENCE') {
					replace_r = element.FieldName.replace('__c', '__r');
					element.FieldName = replace_r;
				}
				if (element.FieldName.indexOf('ProductId__r') > -1) {
					element.FieldType = 'DETAIL';
				} else if (element.FieldName.indexOf('ChargeType') > -1) {
					element.FieldType = 'CHARGETYPE';
					ctrlRef.chargeKey = element.FieldName; // why?
				} else if (element.FieldName.indexOf('Quantity') > -1) {
					element.FieldType = 'QUANTITY';
				} else if (element.FieldName.indexOf('AssetStatus') > -1) {
					element.FieldType = 'STRING';
				} else if (element.FieldName.indexOf('LocationId') > -1) {
					element.FieldType = 'STRING';
				}

				// make fields editable
				if (element.FieldType === 'DATE' || 
						element.FieldType === 'QUANTITY') {
					element.IsEditable = true;
				}

				// implement options editing

				return element;
			});

			ctrlRef.tableColumns = columnTypes.filter(function(element){
				if(element.FieldName.indexOf('ChargeType') <= -1) {
					return true; // all elements that are NOT ChargeType
				}
			});

			ctrlRef.tableColumns = _.reject(ctrlRef.tableColumns, function (element){
				return element.FieldName.indexOf('AllowedActions') > -1; // remove Allowed Actions
			});

		};

		activate();

		ctrlRef.handleConfirmOperation = function(){
			$log.info("Confirming Changes to Asset(s)");

			var changelineItems = [];
			Object.keys(AssetService.currLineSelectionMap).forEach( function (key){
				var lineItemSO = LineItemSupport.cloneDeep(AssetService.currLineSelectionMap[key].assetLineItemSO);
				changelineItems.push(lineItemSO);
			});
			
			var lineItemDOList = LineItemSupport.newLineItemForAssetActions(changelineItems, "Amend"); // Action verb should come from a constant define

			// AssetService.loadingDiv = true;
			ctrlRef.loading = true;
			AssetService.requestAssetAction(lineItemDOList).then(function(result){

				$log.debug(JSON.stringify(ctrlRef.assetLineItems));
				Object.keys(AssetService.currLineSelectionMap).forEach(function (key){
					AssetService.currLineSelectionMap[key].assetLineItemSO['@@uiSelection'] = false;
				});
				AssetService.currLineSelectionMap = {}; // clear the selection map
				AssetService.disableActions = true;
				AssetService.resetDisableActionsObj(); // disable all action buttons
				// AssetService.loadingDiv = false;
				ctrlRef.loading = false;
				$log.debug("Change action finished! " + JSON.stringify(result));
				$state.go('assets');
			});
		};

		ctrlRef.handleCancelOperation = function(){
			AssetService.genericCancelAction('Change');
		};

		// $scope.$watch(function () { return AssetService.loadingDiv; },
	 //    function(newVal, oldVal) {
		//   	ctrlRef.loading = newVal;
		// 	},
		// 	true
		// );

	};

	ChangeAssetsController.$inject = [
		'$scope', 
		'$state', 
		'$log', 
		'systemConstants',
		'lodash', 
		'AssetService', 
		'LineItemSupport', 
		'aptBase.i18nService'
	];

	ChangeAssets = function (systemConstants) {
		var directive = {
			templateUrl: systemConstants.baseUrl + '/templates/directives/assets/assets-change.html',
			controller: ChangeAssetsController,
			controllerAs: 'changeAssetsCtrl',
			bindToController: true
		};	
		return directive;
	};

	ChangeAssets.$inject = ['systemConstants'];

	angular.module('aptCPQUI').directive('changeAssets', ChangeAssets);

}).call(this);