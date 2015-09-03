(function() {
  var CatalogCtrl;

  CatalogCtrl = function(systemConstants, CatalogService, i18nService) {
    var ctrl = this;
    
    ctrl.labels = i18nService.CustomLabel;
    ctrl.baseFileUrl = systemConstants.baseFileUrl;
    
    CatalogService.getCategories().then(function(res) {
      return ctrl.categories = res;
    });
    
    return ctrl;
  };

  CatalogCtrl.$inject = ['systemConstants', 'CatalogDataService', 'aptBase.i18nService'];

  angular.module('aptCPQUI').controller('catalogCtrl', CatalogCtrl);

}).call(this);
