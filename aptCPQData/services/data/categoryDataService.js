;(function() {
	angular.module('aptCPQData')
		.service('CategoryDataService', CategoryDataService); 
			
	CategoryDataService.$inject = ['CatalogDataService'];

	function CategoryDataService(CatalogDataService) {
		var service = this;

		service.getCategory = CatalogDataService.getCategory;
		service.getCategories = CatalogDataService.getCategories;
		service.getExculdedProductIds = CatalogDataService.getExculdedProductIds;

	
	}

})();