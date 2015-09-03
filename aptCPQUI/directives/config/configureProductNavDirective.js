(function() {
  var ConfigureProductNav, ConfigureProductNavCtrl, configureProductNavLink;

  configureProductNavLink = function(scope, elem, attrs) {};

  ConfigureProductNavCtrl = function($state, $stateParams, i18nService, Configure) {
    this.config = Configure;
    this.labels = i18nService.CustomLabel;
    
    return this.changeView = function(newView) {
      var tpln;
      tpln = $stateParams.txnPrimaryLineNumber;
      return $state.go('configure', {
        txnPrimaryLineNumber: tpln,
        step: newView
      });
    };
  };

  ConfigureProductNavCtrl.$inject = ['$state', '$stateParams', 'aptBase.i18nService', 'ConfigureService'];

  ConfigureProductNav = function(systemConstants) {
    return {
      templateUrl: systemConstants.baseUrl + "/templates/directives/configure-product-nav.html",
      controller: ConfigureProductNavCtrl,
      controllerAs: 'nav',
      link: configureProductNavLink,
      bindToController: true,
      scope: {
        view: '='
      }
    };
  };

  ConfigureProductNav.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('configureProductNav', ConfigureProductNav);

}).call(this);
