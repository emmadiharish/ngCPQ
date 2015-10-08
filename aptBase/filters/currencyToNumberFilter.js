;(function() {
	angular.module('aptBase')
		.filter('aptCurrencyToNumber', currencyToNumberFilter);

	currencyToNumberFilter.$inject = ['aptBase.i18nService', 'aptBase.UtilService'];

	function currencyToNumberFilter(i18nService, UtilService) {
		return currencyToNumber;
		/**
		 * Take a string value that looks like a currency and convert it into
		 * 	an number. All non-digit, non-decimal-separator characters are stripped
		 * 	out before number construction. If the decimal-separator character 
		 * 	appears more than once, all instances beyond the first are discarded.
		 * 	
		 * @param  {[type]} input [description]
		 * @return {[type]}       [description]
		 */
		function currencyToNumber(input) {
			var currencySettings = i18nService.currencySettings;
			if (typeof input !== 'string') {
				return input;

			}
			input = input.trim();
			var isNegative = input[0] == '(' && input[input.length - 1] == ')';
			var nonDigitRegex = /\D/g;
			var foundDecimal = false;
			var digitsOnly = input.replace(nonDigitRegex, function(match) {
				//Return '.' in place of the first instance of decimal separator.
				if (!foundDecimal && match == currencySettings.decimal) {
					foundDecimal = true;
					return '.';

				} else if (!foundDecimal && match == '-') {
					isNegative = true;

				}
				return '';

			});
			var inputAsNumber = UtilService.round(digitsOnly, currencySettings.precision);
			inputAsNumber *= (1 - 2*isNegative); 
			return inputAsNumber;

		}

	}

})();