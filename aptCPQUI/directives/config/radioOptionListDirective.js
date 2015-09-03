(function() {
  angular.module('aptCPQUI')
    .directive('radioOptionList', RadioOptionList);
  
  RadioOptionListCtrl.$inject = ['aptBase.i18nService', 'ConfigureService'];
  RadioOptionList.$inject = ['systemConstants'];

  function RadioOptionListCtrl(i18nService, ConfigureService) {
    this.labels = i18nService.CustomLabel;
    this.selectNone = function() {
      if (this.group.selectNone()) {
        ConfigureService.updateBundle();
      }
    };
    this.getLevel = function() {
      return parseInt(this.level);
    };
    return this;

  }

  function RadioOptionList(systemConstants) {
    return {
      scope: {
        group: '=',
        level: '@'
      },
      templateUrl: systemConstants.baseUrl + "/templates/directives/options/radio-option-list.html",
      controller: RadioOptionListCtrl,
      controllerAs: 'list',
      bindToController: true
    };
  }

})();
