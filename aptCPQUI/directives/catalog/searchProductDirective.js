(function() {
  angular.module('aptCPQUI').directive('searchProduct', [
    'systemConstants', '$state', '$stateParams' , 'aptBase.i18nService', function(systemConstants, $state, $stateParams,i18nService) {
      function encodeSafe(value) {
        var decoded = decodeURIComponent(value);
        return decoded;
      }
      return {
        restrict: 'AE',
        scope: {},
        controller: function() {
          var clearSearchedTerm, findProducts;
          findProducts = function(searchTerm) {
            return $state.go('search', {
              term: encodeSafe(searchTerm),
              category: ''
            });
          };
          clearSearchedTerm = function() {
            this.term = '';
            return this.hasSearchedTerm = false;
          };
          this.hasSearchedTerm = false;
          this.term = ($stateParams.term) ? decodeURIComponent($stateParams.term) : "";
          this.clearSearchedTerm = clearSearchedTerm;
          this.findProducts = findProducts;
          this.labels = i18nService.CustomLabel;
          if (this.term && this.term != "") {
             this.hasSearchedTerm = true;
          }else{
             this.term = "";
             this.hasSearchedTerm = false;
          }
        },
        controllerAs: 'searchedTerm',
        bindToController: true,
        templateUrl: systemConstants.baseUrl + '/templates/directives/searched-term.html',
        link: function(scope, elem, attrs,controller) {
          var button, buttons, i, input, len, results;
          input = elem.find('input');
          buttons = elem.find('button');
          input.on('keypress', function(e) {
            var key;
            key = e.which || e.keyCode;
            if (key === 13) {
              return $state.go('search', {
                term: encodeSafe(input[0].value),
                category: ''
              });
            }
          });
          results = [];
          for (i = 0, len = buttons.length; i < len; i++) {
            button = buttons[i];
            results.push(button.addEventListener('click', function(e) {
              return input[0].focus();
            }));
          }
          return results;
        }
      };
    }
  ]);

}).call(this);
