;(function() {
	angular.module('aptCPQData')
		.service('ProductFilterDataService', ProductFilterDataService); 
			
	ProductFilterDataService.$inject = ['CatalogDataService'];

	function ProductFilterDataService(CatalogDataService) {
		var service = this;

		service.getFiltersFor = CatalogDataService.getProductFiltersForCategory;
	
	}

})();