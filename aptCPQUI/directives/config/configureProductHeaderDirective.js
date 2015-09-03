(function() {
  var ConfigureProductHeader, ConfigureProductHeaderCtrl, configureProductHeaderLink;

  configureProductHeaderLink = function(scope, elem, attrs) {};

  ConfigureProductHeaderCtrl = function($stateParams, systemConstants, i18nService, Configure) {
    var nsPrefix = systemConstants.nsPrefix;
    this.labels = i18nService.CustomLabel;
    this.config = Configure;
    this.lineItem = this.config.lineItem.data.chargeLines[0].lineItemSO;
    this.quantityField = nsPrefix + 'Quantity__c';
    this.termField = nsPrefix + 'SellingTerm__c';
    this.frequencyField = nsPrefix + 'SellingFrequency__c';
    this.productDescription = this.lineItem[nsPrefix + 'ProductId__r'].Description;
    var iconId = this.lineItem[nsPrefix + 'ProductId__r'][nsPrefix + 'IconId__c'];
    this.hasIcon = iconId ? true : false;
    this.img_url = "" + systemConstants.baseFileUrl + iconId;
    return this;
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
      templateUrl: systemConstants.baseUrl + "/templates/directives/configure-product-header.html",
      controller: ConfigureProductHeaderCtrl,
      controllerAs: 'headerCtrl',
      link: configureProductHeaderLink,
      bindToController: true
    };
  };

  ConfigureProductHeader.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('configureProductHeader', ConfigureProductHeader);

}).call(this);
