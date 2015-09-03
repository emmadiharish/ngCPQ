(function() {
	angular.module('aptCPQUI').controller('paginationControlsCtrl', PaginationControlsCtrl);
	
	PaginationControlsCtrl.$inject = [
		'systemConstants',
		'CatalogDataService',
		'aptBase.i18nService'
	];

	function PaginationControlsCtrl(systemConstants, CatalogService, i18nService) {
		var paginationCtrl = this;
		paginationCtrl.labels = i18nService.CustomLabel;

	}

})();
