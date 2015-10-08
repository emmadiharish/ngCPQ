;(function() {
	'use strict';

	angular.module('aptCPQUI').directive('pageErrorMessages', PageErrorMessages);

	PageErrorMessages.$inject = ['systemConstants'];

	function PageErrorMessages(systemConstants) {
		return {
			controller: PageErrorMessagesCtrl,
			controllerAs: 'pageErrors',
			bindToController: true,
			templateUrl: systemConstants.baseUrl + '/templates/directives/common/page-error-messages.html'
		};

	}

	PageErrorMessagesCtrl.$inject = ['PageErrorDataService'];

	function PageErrorMessagesCtrl(PageErrorDataService) {
		this.hideDetails = true;

		this.pageErrors = function() {
			return PageErrorDataService.errorMessages;
		};

		this.hasPageErrors = function() {
			return PageErrorDataService.errorMessages.length !== 0;
		};
		return this;

	}

})();
