(function() {
  var RefineSearch, refineSearchCtrl;

  refineSearchCtrl = function(Category, i18nService) {
    this.labels = i18nService.CustomLabel;
    this.category = Category;
    return this;
  };

  refineSearchCtrl.$inject = ['CategoryService', 'aptBase.i18nService'];

  RefineSearch = function(systemConstants) {
    return {
      templateUrl: systemConstants.baseUrl + "/templates/directives/refine-search.html",
      controller: refineSearchCtrl,
      controllerAs: 'refineSearch',
      bindToController: true
    };
  };

  RefineSearch.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('refineSearch', RefineSearch);

}).call(this);
