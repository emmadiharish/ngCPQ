/**
 * Directive: toggleAllClass
 * 
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('toggleAllClass', ToggleAllClass);

	function ToggleAllClass() {
		var toggleClassName = function(className, matches) {
			var el = matches[0];
			var remaining = Array.prototype.slice.call(matches, 1);

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
		return {
			link: function(scope, elem, attributes) {
				var matches = document.querySelectorAll("." + attributes.toggleAllClass);
				if (matches.length > 0) {
					return elem.on('click', function(ev) {
						return toggleClassName(attributes.toggleAllClassWith, matches);
					});
				}
			}
		};
	};

}).call(this);
