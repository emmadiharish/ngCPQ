(function() {
  angular.module('aptCPQUI')
    .directive('configurationSummary', ConfigurationSummary);

  ConfigurationSummary.$inject = ['systemConstants'];
  ConfigurationSummaryCtrl.$inject = [
    '$log',
    '$state',
    'systemConstants',
    'ConfigureService',
    'aptBase.i18nService'
  ];


  function ConfigurationSummary(systemConstants) {
    return {
      templateUrl: systemConstants.baseUrl + "/templates/directives/configuration-summary.html",
      controller: ConfigurationSummaryCtrl,
      controllerAs: 'summary',
      bindToController: true
    };
  }

  function ConfigurationSummaryCtrl($log, $state, systemConstants, Configure, i18nService) {
    var ctrl = this;
    ctrl.nsPrefix = systemConstants.nsPrefix;
    ctrl.labels = i18nService.CustomLabel;
    ctrl.fieldLabels = i18nService.CustomField;
    ctrl.lineItem = Configure.lineItem;

    ctrl.updateBundle = function() {
    	//Add a .then(function() {...}) to do something when update resolves.
    	Configure.updateBundle();
    	
    };

    ctrl.gotoCart = function() {
        Configure.updateBundle();
      	$state.go('cart'); 
    };

    ctrl.standardPrice = function(chargeLine) {
      return chargeLine.lineItemSO[ctrl.nsPrefix + 'NetPrice__c'];
    };
    
    ctrl.multiplyTotal = function() {
      return ctrl.lineItem.topLineTotal();
    };
    
    return ctrl;
    
  }

}).call(this);
