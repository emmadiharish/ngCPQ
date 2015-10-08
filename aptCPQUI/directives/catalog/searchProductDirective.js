/**
 * Directive: searchProduct
 *  Handles search term based search
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('searchProduct', SearchProduct);

	SearchProduct.$inject = ['systemConstants'];

	function SearchProduct(systemConstants) {
		return {
			restrict: 'AE',
			scope: {},
			controller: SearchTermCtrl,
			controllerAs: 'searchBox',
			bindToController: true,
			link: searchTermLinkFn,
			templateUrl: systemConstants.baseUrl + '/templates/directives/catalog/searched-term.html'
		};

	}

	SearchTermCtrl.$inject = ['$state', '$stateParams', 'systemConstants', 'aptBase.i18nService', 'CatalogDataService'];

	function SearchTermCtrl($state, $stateParams, systemConstants, i18nService, CatalogDataService) {
		var ctrl = this;
		//var searchCategoryId = $stateParams.categoryId;
		//TODO: implement search for selected category

		ctrl.hasSearchedTerm = false;
		ctrl.searchTerm = ($stateParams.term) ? decodeURIComponent($stateParams.term) : "";
		ctrl.labels = i18nService.CustomLabel;

		function encodeSafe(value) {
			var decoded = decodeURIComponent(value);
			return decoded;
		}

		ctrl.findProducts = function(searchTerm) {
			return $state.go('search', {
				term: encodeSafe(searchTerm),
				categoryId: ''
			});

		};

		ctrl.clearSearchedTerm = function() {
			ctrl.searchTerm = '';
			return ctrl.hasSearchedTerm = false;

		};

		ctrl.onKeyPressHandler = function(e) {
			var key = e.which || e.keyCode;
			if (key === 13) {
				return $state.go('search', {
					term: encodeSafe(ctrl.input[0].value),
					categoryId: ''
				});
			}
		}

		if (ctrl.searchTerm && ctrl.searchTerm != "") {
			ctrl.hasSearchedTerm = true;

		} else {
			ctrl.searchTerm = "";
			ctrl.hasSearchedTerm = false;

		}

	}

	/**
	 * enter key and search button click handler  
	 */
	function searchTermLinkFn(scope, element, attrs, ctrl) {
		ctrl.input = element.find('input');
		var buttons = element.find('button');
		ctrl.input.on('keypress', ctrl.onKeyPressHandler);

		var results = [];
		var i, len;
		for (i = 0, len = buttons.length; i < len; i++) {
			var button = buttons[i];
			results.push(button.addEventListener('click', function(e) {
				return ctrl.input[0].focus();
			}));
		}
		return results;
	}

}).call(this);
