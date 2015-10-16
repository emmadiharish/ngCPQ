;(function() {
	'use strict';
	
	angular.module('aptCPQUI')
	.service('PriceRampService', PriceRampService);

	PriceRampService.$inject = [
		'lodash',
		'CartDataService',
		'LineItemSupport'
	];
	 
	function PriceRampService(_, CartDataService, LineItemSupport) {
		var service = this;

		service.isRampDialogOpen = false;

		service.rampLineItemModel = {};

		/**
		 * Initialize price ramp with the line item details
		 */
		service.setRampDetails = function(lineItemModel) {
			service.ramplineItemDO = _.cloneDeep(lineItemModel.lineItemDO); 
		
			service.rampLineItemModel = lineItemModel;
			service.isRampDialogOpen = true;

		};

		/**
		 *  Add price ramp line 
		 */
		service.addRampLine = function(rampChargeLine) {
			var chargeLineDOs = service.rampLineItemModel.lineItemDO.chargeLines;
			var rampChargeLineIndex = service.rampLineItemModel.chargeLines.indexOf(rampChargeLine);
			
			var clonedRampChargeLineDO = LineItemSupport.newLineItemsFromClone(rampChargeLine.lineItemDO);
			chargeLineDOs.splice(rampChargeLineIndex + 1, 0, clonedRampChargeLineDO);

			service.rampLineItemModel.mergeChargeLines(chargeLineDOs);
		};

		/**
		 * Remove price ramp line
		 */
		service.removeRampLine = function(rampChargeLine) {
			var chargeLineDOs = service.rampLineItemModel.lineItemDO.chargeLines;
			var rampChargeLineIndex = service.rampLineItemModel.chargeLines.indexOf(rampChargeLine);
			
			chargeLineDOs.splice(rampChargeLineIndex, 1);
			service.rampLineItemModel.mergeChargeLines(chargeLineDOs);
		};	

		/**
		 * save price ramp
		 */
		service.saveRamp = function() {
			return CartDataService.updateBundle(service.rampLineItemModel);
		};

		
		return service;

	}
 
}).call(this);
