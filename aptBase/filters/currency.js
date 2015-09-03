(function() {
  var DollarValue;

  DollarValue = function(accounting) {
    return function(amount) {
      return accounting.formatMoney(amount);
    };
  };

  DollarValue.$inject = ['cpqAccounting'];

  angular.module('aptBase').filter('dollarValue', DollarValue);

}).call(this);
