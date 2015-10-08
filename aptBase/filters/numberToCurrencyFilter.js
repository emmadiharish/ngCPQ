 ;(function() {
	angular.module('aptBase')
		.filter('aptNumberToCurrency', numberToCurrencyFilter);

	numberToCurrencyFilter.$inject = ['aptBase.i18nService'];

	function numberToCurrencyFilter(i18nService) {
		return numberToCurrency;
		/**
		 * Take a value that can be coerced into a number and return the
		 * 	corresponding currency string.
		 * 	
		 * @param  {[type]} input [description]
		 * @return {[type]}       [description]
		 */
		function numberToCurrency(input) {
			var currencySettings = i18nService.currencySettings;
			//For now, just ignoring anything that can't be parsed as number
			var inputAsNumber = Number(input);
			if (isNaN(inputAsNumber)) {
				return input;

			}
			//Handle negative value
			var isNegative = inputAsNumber < 0;
			inputAsNumber *= (1 - 2*isNegative);
			precision = currencySettings.precision || 2;
			//Use toFixed to get string representation with correct padding & rounding
			var inputAsFixed = inputAsNumber.toFixed(precision);
			//Create regexp that matches group lengths based on template
			var matches = inputAsFixed.match(currencySettings.groupingExp);
			var inputFormatted = '';
			if (matches) {
				matches.shift();
				//Always take initial group of digits
				inputFormatted += matches[0];
				//Insert separators for interior numbers if they exist
				var toGroup = matches[1];
				if (toGroup) {
					for (var i = 0; i < toGroup.length; i++) {
						if (i % currencySettings.groupLength === 0) {
							inputFormatted += currencySettings.separator;

						}
						inputFormatted += toGroup[i];
					}

				}
				//If decimal exists, add decimal point and decimal
				if (matches[2]) {
					inputFormatted += currencySettings.decimal + matches[2];
					
				}
				//Prepend or append currency symbol
				if (currencySettings.isSymbolBefore) {
					inputFormatted = currencySettings.symbol + inputFormatted;

				} else {
					inputFormatted += currencySettings.symbol;

				}

			}
			if (isNegative) {
				inputFormatted = '(' + inputFormatted + ')';
				
			}
			return inputFormatted;

		}

	}

})();