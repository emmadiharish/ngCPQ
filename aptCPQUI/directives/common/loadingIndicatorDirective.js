/**
 * Directive: loadingIndicator
 */
;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('loadingIndicator', LoadingIndicator);

	LoadingIndicatorCtrl.$inject = ['$q', '$log'];

	/**
	 * Loading Indicator controller, used by the directive
	 */ 
	function LoadingIndicatorCtrl ($q, $log) {		
		var ctrl = this;

		ctrl.isLoading = function(){
			return ($q.getPendingRemoteServiceCount() > 0);
		}

		ctrl.getPendingRemoteServiceCount = function() {
			return $q.getPendingRemoteServiceCount();
		}

		return ctrl;
	};

	LoadingIndicator.$inject = ['systemConstants', 'ngProgressFactory'];

	/**
	 *  Loading Indicator Directive
	 */	
	function LoadingIndicator (systemConstants, ngProgressFactory) {
		/*
		 * use following method to add logic for Loader Initialisation and Setup
		 */
		var initLoader = function (scope, containerEle) {
			scope.contained_progressbar = ngProgressFactory.createInstance();
			scope.contained_progressbar.setParent(containerEle[0]);
			scope.contained_progressbar.setAbsolute();
			scope.contained_progressbar.setHeight('0.2rem');
			scope.contained_progressbar.setColor('#FFF');
		}

		/*
		 * use following method to add logic of show, start and hide loader
		 */
		var initWatch = function (scope, ctrl) {
			scope.$watch( 
					function(){
						return ctrl.getPendingRemoteServiceCount();
					},
					function (newPendingCount, oldPendingCount) {
						if (newPendingCount == 0){
							scope.contained_progressbar.complete();
						}else if (oldPendingCount == 0 || newPendingCount == oldPendingCount) {
							scope.contained_progressbar.start();	
						}
					}
			);
		}

		return {
			controller: LoadingIndicatorCtrl,
			controllerAs: 'loadingIndicator',
			bindToController: true,
			link: function (scope, ele, attribute, ctrl) {					
				initLoader(scope, ele);
				initWatch(scope, ctrl);
			}
		};
	}

}).call(this);
