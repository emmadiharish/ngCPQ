;(function() {
	angular.module('aptBase')
		.filter('aptDate', dateFilter);

	dateFilter.$inject = ['aptBase.i18nService'];

	function dateFilter(i18nService) {
		return dateToString;

		function dateToString(input) {
			var dateSettings = i18nService.dateSettings;
			//Create an example of an invalid date.
			var invalidDateStr = new Date("Invalid Date Example").toString();
			var inputAsDate = new Date(input);
			if (inputAsDate.toString() === invalidDateStr) {
				return input;

			}
			var inputOrdering = [];
			dateSettings.ordering.forEach(function(dateCode, index) {
				var letterCode = dateCode[0];
				//Default to day value
				var dateVal = inputAsDate.getUTCDate().toString();
				if (letterCode === 'm') {
					dateVal = (1 + inputAsDate.getUTCMonth()).toString();
					
				} else if (letterCode === 'y') {
					dateVal = inputAsDate.getUTCFullYear().toString();

				}
				//Shorten or pad with zeroes
				if (dateVal.length > dateCode.length) {
					dateVal = dateVal.slice(dateVal.length - dateCode.length, dateVal.length);

				} else if (dateVal.length < dateCode.length) {
					dateVal =   dateVal.lpad("0" , (dateCode.length - dateVal.length));

				}
				inputOrdering[index] = dateVal;

			});
			return inputOrdering.join(dateSettings.separator);			

		}

	}

})();