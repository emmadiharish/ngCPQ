/**
 * PageErrorsDataService DataService
 * 	prepares data for any transaction related page errors.
 */
;(function() {
	'use strict';

	angular.module('aptCPQData')
		.service('PageErrorDataService', PageErrorDataService); 

	PageErrorDataService.$inject = ['systemConstants', 'aptBase.i18nService'];

	function PageErrorDataService(systemConstants, i18nService) {
		var service = this;
		var nsPrefix = systemConstants.nsPrefix;
		
		service.errorMessages = [];

		checkSystemErrors();

		/**
		 * Check for errors in system constants, etc
		 */
		function checkSystemErrors() {
			if (!systemConstants.baseFileUrl) {
				service.errorMessages.push(i18nService.CustomLabel.NoCarouselDefaultIconId);
				
			}

		}

		/**
		 * @return error messages array
		 */
		service.getMessages = function() {
			return service.errorMessages;

		};

		service.clear = function () {
			service.errorMessages.length = 0;
			checkSystemErrors();
			return service;

		};

		/**
		 * Update error messages array.
		 */
		service.add = function(pageErrors) {
			if (!angular.isDefined(pageErrors) || pageErrors === null) {
				return;

			}
			if (angular.isArray(pageErrors)) {
				Array.prototype.push.apply(service.errorMessages, pageErrors);

			} else if (angular.isObject(pageErrors)) {
				if (pageErrors.hasOwnProperty('message')) {
					service.errorMessages.push(pageErrors.message);

				} else if (pageErrors.hasOwnProperty('errorMessages')) {
					service.errorMessages.push(pageErrors.errorMessages);

				}
			} else {
				service.errorMessages.push(pageErrors);

			}
			return service;

		};


	}
	
})();