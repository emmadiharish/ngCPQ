/**
 * PageErrorsDataService DataService
 * 	prepares data for any transaction related page errors.
 */
;(function() {
	angular.module('aptCPQData')
		.service('PageErrorDataService', PageErrorDataService); 

	PageErrorDataService.$inject = ['systemConstants'];

	function PageErrorDataService(systemConstants) {
		var service = this;
		var nsPrefix = systemConstants.nsPrefix;
		
		service.errorMessages = [];

		/**
		 * @return error messages array
		 */
		service.getMessages = function() {
			return service.errorMessages;

		}

		/**
		 * Update error messages array.
		 */
		service.updatePageErrors = function(pageErrors) {
			if (!pageErrors) {
				return;
			}

			Array.prototype.splice.apply(service.errorMessages, [0, service.errorMessages.length].concat(pageErrors.errorMessages));
		}
	}
	
})();