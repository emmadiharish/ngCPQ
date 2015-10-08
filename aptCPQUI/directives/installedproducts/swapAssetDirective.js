(function(){
	'use strict';
	var SwapAssets, swapAssetsController;

	swapAssetsController = function($scope, $state, $log, systemConstants, _, AssetService, LineItemSupport, i18nService) {
		var ctrlRef = this;
		this.loading = false;
		this.selectedLineItems = [];
		this.swapChoices = [];
		this.selectedSwapProduct = {};
		this.labels = i18nService.CustomLabel;
		this.nsPrefix = '';

		var activate = function() {		
			// set prefix
			ctrlRef.nsPrefix = systemConstants.nsPrefix;

			Object.keys(AssetService.currLineSelectionMap).forEach(function (key){
				ctrlRef.selectedLineItems.push(AssetService.currLineSelectionMap[key]); 
				var assetId = AssetService.currLineSelectionMap[key].assetLineItemSO.Id;
				var productId = AssetService.currLineSelectionMap[key].assetLineItemSO[ctrlRef.nsPrefix + "ProductId__c"];
				ctrlRef.loading = true;
				AssetService.getReplacementProducts(productId).then(function(result){
					ctrlRef.loading = false;
					ctrlRef.swapChoices = result;
					$log.debug("Replacement Products for Id:" + assetId + " " + JSON.stringify(result));
				});
			});			
		};

		activate();

		// this.setSelectedSwapProduct = function(productObj) {
		// 	ctrlRef.selectedSwapProduct = productObj;
		// }

		// handle selection of an upgrade/downgrade candidate
		this.handleSwapSelection = function(assetId, productId) {
			$state.go('assets.swap.confirm', { "assetId": assetId, "productId": productId });
		};

		this.handleConfirmOperation = function() {
			try {
				AssetService.resetLineSelection();
				AssetService.currLineSelectionMap = {}; // clear the selection map
				AssetService.disableActions = true;
				AssetService.resetDisableActionsObj(); // disable all action buttons
			} catch(error) {
				$log.error(error.message);
			} finally {
				$state.go('assets');
			}
		};

		this.handleCancelOperation = function() {
			AssetService.genericCancelAction('Swap');
		};

		// $scope.$watch(function () { return AssetService.loadingDiv; },
	 //    function(newVal, oldVal) {
		//   	ctrlRef.loading = newVal;
		// 	},
		// 	true
		// );
	};

	swapAssetsController.$inject = [
		'$scope',
		'$state', 
		'$log', 
		'systemConstants', 
		'lodash', 
		'AssetService', 
		'LineItemSupport', 
		'aptBase.i18nService'
	];

	SwapAssets = function(systemConstants) {
		var directive = {
			templateUrl: systemConstants.baseUrl + '/templates/directives/assets/assets-swap.html',
			controller: swapAssetsController,
			controllerAs: 'swapAssetCtrl',
			bindToController: true
		};	
		return directive;
	};

	SwapAssets.$inject = ['systemConstants'];

	angular.module('aptCPQUI').directive('swapAssets', SwapAssets);


}).call(this);