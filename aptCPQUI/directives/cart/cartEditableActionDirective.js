(function() {
  var CartEditableAction, cartEditableActionCtrl;

  cartEditableActionCtrl = function(CartService, i18nService) {
    return this.labels = i18nService.CustomLabel;
  };

  cartEditableActionCtrl.$inject = ['CartService', 'aptBase.i18nService'];

  CartEditableAction = function(systemConstants) {
    var directive;
    directive = {
      restrict: 'AEC',
      templateUrl: systemConstants.baseUrl + '/templates/directives/cart-editable-action.html',
      controller: cartEditableActionCtrl,
      controllerAs: 'cartEditableAction',
      bindToController: true
    };
    return directive;
  };

  CartEditableAction.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('cartEditableAction', CartEditableAction);

}).call(this);
