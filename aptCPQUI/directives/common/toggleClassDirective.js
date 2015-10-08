/**
 * Directive: toggleClass
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('toggleClass', ToggleClass);

	ToggleClass.$inject = ['systemConstants'];

	function ToggleClass(systemConstants) {
		var _findParentNode = function(el, cls) {
			if (el.parentNode && el.parentNode.classList.length > 0) {
				if (el.parentNode.classList.contains(cls)) {
					return el.parentNode;
				} else {
					return _findParentNode(el.parentNode, cls);
				}
			} else {
				return [];
			}
		};
		return {
			link: function(scope, elem, attributes) {
				var parentSel, toggleClass;
				toggleClass = attributes.toggleClass;
				parentSel = attributes.parent;
				return elem.on('click', function(ev) {
					var addClassTo;
					addClassTo = elem;
					if (parentSel) {
						addClassTo = angular.element(_findParentNode(ev.target, parentSel));
					}
					if (addClassTo.hasClass(toggleClass)) {
						return addClassTo.removeClass(toggleClass);
					} else {
						return addClassTo.addClass(toggleClass);
					}
				});
			}
		};
	};

}).call(this);
