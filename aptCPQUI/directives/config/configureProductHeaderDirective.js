(function() {
  var ConfigureProductHeader, ConfigureProductHeaderCtrl, configureProductHeaderLink;

  configureProductHeaderLink = function(scope, elem, attrs) {};

  ConfigureProductHeaderCtrl = function($stateParams, systemConstants, i18nService, ConfigureService) {
    var nsPrefix = systemConstants.nsPrefix;
    var ctrl = this;
    ctrl.labels = i18nService.CustomLabel;

    //Attach line item
    ctrl.primaryLine = ConfigureService.lineItem.primaryLine();
    ctrl.product = ConfigureService.lineItem.product();
    ctrl.frequencyField = nsPrefix + 'SellingFrequency__c';
    ctrl.quantityField = nsPrefix + 'Quantity__c';
    ctrl.termField = nsPrefix + 'SellingTerm__c';

    ctrl.iconUrl = function() {
      var iconId = ctrl.product[nsPrefix + 'IconId__c'];
      return angular.isDefined(iconId) ? "" + systemConstants.baseFileUrl + iconId : void 0;
    };

    return ctrl;

  };

  ConfigureProductHeaderCtrl.$inject = [
    '$stateParams',
    'systemConstants',
    'aptBase.i18nService',
    'ConfigureService'
  ];

  ConfigureProductHeader = function(systemConstants) {
    return {
      restrict: 'AE',
      templateUrl: systemConstants.baseUrl + "/templates/directives/options/configure-product-header.html",
      controller: ConfigureProductHeaderCtrl,
      controllerAs: 'headerCtrl',
      link: configureProductHeaderLink,
      bindToController: true
    };
  };

  ConfigureProductHeader.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('configureProductHeader', ConfigureProductHeader);

})();
