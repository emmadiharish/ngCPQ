(function() {

  var AssetHeader, assetHeaderCtrl;

  assetHeaderCtrl = function(i18nService) {
    return this.labels = i18nService.CustomLabel;
  };

  assetHeaderCtrl.$inject = ['aptBase.i18nService'];

  AssetHeader = function(systemConstants) {
    var directive;
    directive = {
      restrict: 'E',
      templateUrl: systemConstants.baseUrl + '/templates/directives/assets/assets-header.html',
      controller: assetHeaderCtrl,
      controllerAs: 'headerCtrl',
      bindToController: true
    };
    return directive;
  };

  AssetHeader.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('assetHeader', AssetHeader);

}).call(this);