/**
 * Directive: FilterSearchResults
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('filterSearchResults', FilterSearchResults);

	FilterSearchResults.$inject = ['systemConstants'];

	function FilterSearchResults(systemConstants) {
		return {
			controller: FilterSearchResultsCtrl,
			controllerAs: 'searchFilter',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + '/templates/directives/catalog/filter-search-block.html',
		};
	};

	FilterSearchResultsCtrl.$inject = [
	                                   '$stateParams',
	                                   '$q',
	                                   'lodash',
	                                   'aptBase.i18nService',
	                                   'CatalogDataService',
	                                   'FilterSearchService'
	                                   ];

	function FilterSearchResultsCtrl($stateParams, $q, _, i18nService, CatalogDataService, FilterSearchService) {
		var ctrl = this;
		
		var searchCategoryId = $stateParams.categoryId;
		ctrl.selectedCategoryId = searchCategoryId; //changes on user click
		
		ctrl.labels = i18nService.CustomLabel;
		ctrl.viewAll = (searchCategoryId ? searchCategoryId !== "" : false);//true when a categoryId is selected
		ctrl.searchTerm = ($stateParams.term) ? decodeURIComponent($stateParams.term) : "";
		
		ctrl.categories;
		
		ctrl.isSearchTermChanged = function(){
			return ctrl.searchTerm != FilterSearchService.searchTerm 
					|| !angular.isDefined(searchCategoryId) 
					|| searchCategoryId == "";
		}
		//whether the corresponding category contains searched products 
		ctrl.isInSearchResult = function(category) {
			return FilterSearchService.lineageCategoryIds.indexOf(category.nodeId) > -1;
		};

		ctrl.hasChildCategory = function(category) {
			return (category.childCategories && category.childCategories.length > 0);
		}

		ctrl.collaseCategories = function() {
			_.each(FilterSearchService.categories, function (cateogry) {
				FilterSearchService.collapseCategory(cateogry);
			});
		}


		ctrl.isExpanded = function (category) {
			return (angular.isDefined(category) && category.isExpanded);
		}

		ctrl.toggleSubMenu = function (evt, category) {
			var clickedEle = angular.element(evt.currentTarget);
			if (clickedEle.hasClass('is--open')) {
				clickedEle.removeClass('is--open');
				category.isExpanded = false;
			} else {
				clickedEle.addClass('is--open');
				category.isExpanded = true;
			}
			evt.stopPropagation();
		};		

		ctrl.initCategories = function(){
			return FilterSearchService.getCategories(searchCategoryId, ctrl.searchTerm).then( function(result) {
				ctrl.categories = result;
				ctrl.collaseCategories();	

				if (angular.isDefined(searchCategoryId)) {
					FilterSearchService.expandCategoryTree(searchCategoryId);
				}
				
				return ctrl.categories;
			});	
		};

		function init(){
			if (ctrl.isSearchTermChanged() || FilterSearchService.categories.length === 0) {
				ctrl.initCategories();

			} else {
				ctrl.categories = FilterSearchService.categories;
			}

		};

		init();

		return ctrl;

	};


}).call(this);
