;(function() {
	angular.module('aptCPQData')
		.service('ProductDataService', ProductDataService); 
			
	ProductDataService.$inject = ['CatalogDataService'];

	function ProductDataService(CatalogDataService) {
		var service = this;

		service.searchProducts = CatalogDataService.searchProducts;
		service.getProductsByIds = CatalogDataService.getProductsByIds;
		
	}

})();