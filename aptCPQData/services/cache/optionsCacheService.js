;(function() {
	angular.module('aptCPQData')
		.service('OptionsCache', OptionsCache);

	function OptionsCache() {
		var cache = this;

		var productToOptionGroupsMap;

		cache.updateOptionGroupsForProduct = updateOptionGroupsForProduct;
		cache.getOptionGroupsForProduct = getOptionGroupsForProduct;

		init();

		function init() {
			resetOptions();
		}

	    /**
		 * reset attributes
		 */
		function resetOptions() {
			cache.isValid = false;
			productToOptionGroupsMap = {};

		}

	    /**
		 * update attribute groups for product
		 */
		function updateOptionGroupsForProduct(productId, OptionGroups) {
			if(!productId) {
				return;
			}

			productToOptionGroupsMap[productId] = OptionGroups;
			cache.isValid = true;

		}

		/**
		 * get attribute groups for product
	     */
		function getOptionGroupsForProduct(productId) {
			if(!productId || !cache.isValid) {
				return null;
			}

			if(productToOptionGroupsMap[productId]) {
				return null;

			}

			return productToOptionGroupsMap[productId];

		}

	}

})();