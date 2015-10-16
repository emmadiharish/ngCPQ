/**
 * Directive: productSummaryDialog
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('productSummaryDialog', ProductSummaryDialog);

	ProductSummaryDialog.$inject = ['systemConstants'];

	function ProductSummaryDialog(systemConstants) {

		function findAncentor(el, cls){
			while((el = el.parentElement) && !el.classList.contains(cls));
			return el;
		}

		function productSummaryLink(scope, elem, attrs, ctrl) {
			var clickOutside = document.querySelector('body');

			clickOutside.addEventListener('click', function(e) {
				var targetElement = findAncentor(e.target, 'product-dialog');
				if(ctrl.visible && !targetElement) { //limit digestion to only dialog is visible
					ctrl.close();
					//calling $digest vs $apply...we only need to update local scope
					scope.$digest();
				}
			});
		}

		return {
			restrict: 'E',
			controller: ProductSummaryDialogCtrl,
			link: productSummaryLink,
			controllerAs: 'productSummary',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + "/templates/directives/common/product-summary.html"
		};
	}

	ProductSummaryDialogCtrl.$inject = [
	                                    'lodash',                            
	                                    '$scope',
	                                    '$sce',
	                                    'systemConstants',
	                                    'aptBase.i18nService',
	                                    'CatalogDataService'
	                                    ];

	function ProductSummaryDialogCtrl(_, $scope, $sce, systemConstants, i18nService, CatalogDataService) {
		var nsPrefix = systemConstants.nsPrefix;
		var ctrl = this;
		ctrl.labels = i18nService.CustomLabel;
		ctrl.visible = false;

		ctrl.close = function() {
			this.visible = false;
			CatalogDataService.isProductSummaryOpen = false;

		};

		ctrl.open = function() {
			CatalogDataService.getProductSummaryId().then(function(productId) {
				CatalogDataService.getProductSummary(productId).then(function(result) {
					$scope.productsummarycontent = $sce.trustAsHtml(result);
					$scope.producttitle = ctrl.getProductTitle();
					ctrl.visible = true;
				});
			});

		};

		/*parsing mimi page layout html to get product title */
		ctrl.getProductTitle = function() {
			if ($scope.productsummarycontent) {
				var productSummaryHTMLDoc = new DOMParser().parseFromString($scope.productsummarycontent.toString(), "text/xml");
				var dataCols = productSummaryHTMLDoc.querySelectorAll("div.pbBody table.detailList td.dataCol");
				var firstChild = (dataCols.length>0) ? angular.element(dataCols[0]) : null;
				if (firstChild) {
					return $sce.trustAsHtml(firstChild.html()); 
				}
			}
			return $sce.trustAsHtml('');
		};

		$scope.$watch(function () { 
			return CatalogDataService.isProductSummaryOpen; 
		},
		function(newVal, oldVal) {
			if(newVal === true) {
				ctrl.open();
			}
		}
		);

		return ctrl;

	};

}).call(this);
