/**
 * Directive: assetDetailsDialog
 * 	used to display Asset Details/Description in a modal dialog
 */
 (function() {
 	'use strict';

 	var ModalDialog, ModalDialogCtrl;

 	ModalDialogCtrl = function($scope, $log, systemConstants, i18nService, AssetService) {
 		var ctrlRef = this;
 		this.labels = i18nService.CustomLabel;
 		this.visible = false;
 		this.nsPrefix = systemConstants.nsPrefix;
 		// this.selectedAsset = {};
 		this.currentAsset = {
 			"Name" : "",
 			"Description": "",
 			"IconId": ""
 		}; // convenience only

 		ctrlRef.close = function() {
 			$log.debug("close triggered");
 			ctrlRef.visible = false;
 			AssetService.isAssetSummaryOpen = false;
 		}

 		ctrlRef.open = function() {
			// construct summary content
			var selectedAsset = AssetService.getSelectedSummaryAsset();

			ctrlRef.currentAsset.Name = selectedAsset.assetLineItemSO[ctrlRef.nsPrefix + 'ProductId__r'].Name;
			ctrlRef.currentAsset.Description = selectedAsset.assetLineItemSO[ctrlRef.nsPrefix + 'ProductId__r'].Description;
			ctrlRef.currentAsset.IconId = selectedAsset.assetLineItemSO[ctrlRef.nsPrefix + 'ProductId__r'][ctrlRef.nsPrefix + 'IconId__c'];

			// $log.debug("open triggered " + JSON.stringify(selectedAsset));
			ctrlRef.visible = true;
		};

 		$scope.$watch(function() { return AssetService.isAssetSummaryOpen; },
 			function(newval, oldval) {
 				if(newval == true) {
 					$log.debug("AssetService.isAssetSummaryOpen changed to " + AssetService.isAssetSummaryOpen);
 					ctrlRef.open();
 				}
 			}
 		);

 		return ctrlRef;
 	};

 	ModalDialogCtrl.$inject = [
 		'$scope',
 		'$log',
 		'systemConstants',
 		'aptBase.i18nService',
 		'AssetService'
 	];

 	ModalDialog = function(systemConstants) {
 		var assetSummaryLink = function(scope, elem, attrs, ctrl) {
 			// var clickListener = document.querySelector('html');

 			// clickListener.addEventListener('click', function (e){
 			// 	e.stopPropagation();
 			// 	ctrl.close();
 			// 	scope.$apply();
 			// });
 		};

 		var directive = {
 			restrict: 'E',
			templateUrl: systemConstants.baseUrl + "/templates/directives/assets/assets-summary-dialog.html",
			controller: ModalDialogCtrl,
			controllerAs: 'assetSummaryCtrl',
			link: assetSummaryLink,
			bindToController: true
 		};
 		return directive;
 	};

 	ModalDialog.$inject = ['systemConstants'];

 	angular.module('aptCPQUI').directive('assetSummaryDialog', ModalDialog);

 }).call(this);