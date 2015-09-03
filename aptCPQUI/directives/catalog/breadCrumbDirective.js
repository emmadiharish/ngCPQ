(function() {
  var BreadcrumbTrail, breadcrumbCtrl;

  breadcrumbCtrl = function(systemConstants, CatalogService, $stateParams) {
    var vm;
    vm = this;
    return CatalogService.getBreadcrumb($stateParams.catID).then(function(res) {
      vm.trail = res;
      return vm.currentCategory = vm.trail.pop();
    });
  };

  breadcrumbCtrl.$inject = ['systemConstants', 'CatalogDataService', '$stateParams'];

  BreadcrumbTrail = function(systemConstants) {
    var directive;
    directive = {
      restrict: 'AE',
      controllerAs: 'crumb',
      bindToController: true,
      controller: breadcrumbCtrl,
      templateUrl: systemConstants.baseUrl + '/templates/directives/breadcrumb-block.html'
    };
    return directive;
  };

  angular.module('aptCPQUI').directive('breadcrumbTrail', BreadcrumbTrail);

}).call(this);
