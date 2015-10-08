;(function() {
	angular.module('aptCPQData')
		.service('OptionsCache', OptionsCache);

	function OptionsCache() {
		var cache = this;

		var productToOptionGroupsMap;

		cache.putOptionGroupsForProduct = putOptionGroupsForProduct;
		cache.getOptionGroupsForProduct = getOptionGroupsForProduct;

		init();

		function init() {
			productToOptionGroupsMap = {};

		}

		/**
		 * Store option groups for product
		 */
		function putOptionGroupsForProduct(productId, optionGroups) {
			if (!productId || !optionGroups) {
				return;

			}
			productToOptionGroupsMap[productId] = optionGroups;

		}

		/**
		 * Retrieive option groups for product
		 */
		function getOptionGroupsForProduct(productId) {
			if (!productId) {
				return null;

			}
			return productToOptionGroupsMap[productId];

		}

	}

})();