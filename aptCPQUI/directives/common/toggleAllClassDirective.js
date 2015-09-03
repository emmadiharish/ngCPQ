(function() {
  var ToggleAllClass;

  ToggleAllClass = function() {
    var directive, toggleClassName;
    toggleClassName = function(className, matches) {
      var el, remaining;
      el = matches[0];
      remaining = Array.prototype.slice.call(matches, 1);
      if (el.classList.contains(className)) {
        el.classList.remove(className);
      } else {
        el.classList.add(className);
      }
      if (remaining.length > 0) {
        return toggleClassName(className, remaining);
      } else {

      }
    };
    directive = {
      link: function(scope, elem, attributes) {
        var matches;
        matches = document.querySelectorAll("." + attributes.toggleAllClass);
        if (matches.length > 0) {
          return elem.on('click', function(ev) {
            return toggleClassName(attributes.toggleAllClassWith, matches);
          });
        }
      }
    };
    return directive;
  };

  angular.module('aptCPQUI').directive('toggleAllClass', ToggleAllClass);

}).call(this);
