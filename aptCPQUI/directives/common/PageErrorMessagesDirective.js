(function() {
	var PageErrorMessages, PageErrorMessagesCtrl;

	PageErrorMessagesCtrl = function(PageErrorDataService) {
		this.pageErrors = function() {
			return this.messenger.errorMessages;
		};
		
		this.hasPageErrors = function() {
			return this.messenger.errorMessages.length != 0;
		};
		
		this.hasPageErrorMessages = function() {
			return this.hasPageErrors();
		};
		this.messenger = PageErrorDataService;
		
		return this;
		
	};

	PageErrorMessagesCtrl.$inject = ['PageErrorDataService'];

	PageErrorMessages = function(systemConstants) {
		return {
			templateUrl: systemConstants.baseUrl + '/templates/directives/page-error-messages.html',
			controller: PageErrorMessagesCtrl,
			controllerAs: 'pageErrors',
			bindToController: true
		};
	};

	PageErrorMessages.$inject = ['systemConstants'];

	angular.module('aptCPQUI').directive('pageErrorMessages', PageErrorMessages);

}).call(this);
