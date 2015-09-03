(function() {
  var ConfigureProductOptions, ConfigureProductOptionsCtrl;

  ConfigureProductOptionsCtrl = function(_, Configure) {
    this.lineItem = Configure.lineItem;
    return this;
  };

  ConfigureProductOptionsCtrl.$inject = ['lodash', 'ConfigureService'];

  ConfigureProductOptions = function(systemConstants) {
    return {
      restrict: 'E',
      templateUrl: systemConstants.baseUrl + "/templates/directives/options/configure-product-options.html",
      controller: ConfigureProductOptionsCtrl,
      controllerAs: 'options',
      bindToController: true
    };
  };

  ConfigureProductOptions.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('configureProductOptions', ConfigureProductOptions);

}).call(this);
