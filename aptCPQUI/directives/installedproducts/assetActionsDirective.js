// Directive to render Available Actions for Assets
(function() {
	var AssetActions, assetActionCtrl;

	assetActionCtrl = function($scope, $state, $log, _, AssetService, LineItemSupport, i18nService) {
		var ctrlRef = this;
		this.assetActions = AssetService.getAssetActions();
		this.disableActionsObj = AssetService.disableActionsObj;
		ctrlRef.loading = false;
		ctrlRef.labels = i18nService.CustomLabel;
		// this.disableActions = false;

		this.handleButtonClick = function(label) {
			if (Object.keys(AssetService.currLineSelectionMap).length == 0) {
				return;
			}

			// CANCEL
			if (label.toLowerCase() == 'terminate') {
				// going to cancel State
				$state.go('assets.cancel');
			} else if (label.toLowerCase() == 'swap') {
				$state.go('assets.swap');
			} else if (label.toLowerCase() == 'change') {
				// the change action navigates to the cart view directly
				if (Object.keys(AssetService.currLineSelectionMap)) {
					console.log("lines selected for ammend action");

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
						try {
							$log.debug(JSON.stringify(ctrlRef.assetLineItems));
							Object.keys(AssetService.currLineSelectionMap).forEach(function (key){
								AssetService.currLineSelectionMap[key].assetLineItemSO['@@uiSelection'] = false;
							});
							AssetService.currLineSelectionMap = {}; // clear the selection map
							AssetService.disableActions = true;
							AssetService.resetDisableActionsObj(); // disable all action buttons
							ctrlRef.loading = false;
						} catch (error) {
							$log.error(error.message);
						} finally {
							$state.go('cart');
						}
					});
				} else {
					// do nothing
				}
			} else {
				alert(label + " button clicked");
			}	
		};
	
	}; // end controller


	assetActionCtrl.$inject = [
		'$scope',
		'$state',
		"$log",
		'lodash',
		'AssetService',
		'LineItemSupport',
		'aptBase.i18nService'
	];

	AssetActions = function(systemConstants) {
		var directive = {
			scope: {},
			templateUrl: systemConstants.baseUrl + '/templates/directives/assets/assets-actions.html',
			controller: assetActionCtrl,
			controllerAs: 'actionCtrl',
			bindToController: true
		};
		return directive;
	};

	AssetActions.$inject = ['systemConstants'];

	angular.module('aptCPQUI').directive('assetActions', AssetActions);

}).call(this);