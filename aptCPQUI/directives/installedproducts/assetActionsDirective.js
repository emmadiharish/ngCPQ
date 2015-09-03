// Directive to render Available Actions for Assets
(function() {
	var AssetActions, assetActionCtrl, ModalInstanceCtrl;

	assetActionCtrl = function($scope, $state, _, AssetService, LineItemSupport) {
		var ctrlRef = this;
		this.assetActions = AssetService.getAssetActions();
		this.disableActionsObj = AssetService.disableActionsObj;
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
				$state.go('assets.change');
			} else {
				alert(label + " button clicked");
			}	
		};

		// $scope.$watch(function() { return AssetService.disableActions; },
		// 	function(newVal, oldVal) {
		// 		ctrlRef.disableActions = newVal;
		// 		// console.log("disableActions: " + ctrlRef.disableActions);	
		// 	},
		// 	true
		// );

	};

	assetActionCtrl.$inject = ['$scope', '$state', 'lodash', 'AssetService', 'LineItemSupport'];

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