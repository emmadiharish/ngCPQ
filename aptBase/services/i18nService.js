;(function() {
	angular.module('aptBase')
		.provider('aptBase.i18nService', i18nProvider);
	
	function i18nProvider() {
		var provider = this;
		//Set defaults
		var i18nData = {
			"CustomLabel": {},
			"CustomField": {},
			"dateFormat": 'MM/DD/YYYY',
			"dateTemplate": '12/31/1999',
			"currencyTemplate": '$1,234.00',
			"precision": {
				"currency": 2,
				"quantity": 2,
				"percent": 2
			},
			"locale": 'en_US'
		};

		provider.$get = function () {
			return new i18nService(i18nData);

		};
		provider.setCustomLabel = function (newLabels) {
			angular.extend(i18nData.CustomLabel, newLabels);
		};
		provider.setCustomField = function (newFields) {
			angular.extend(i18nData.CustomField, newFields);
		};
		provider.setDateFormat = function (newFormat) {
			if (newFormat) {
				i18nData.dateFormat = newFormat;
			}
		};
		provider.setLocale = function (newLocale) {
			if (newLocale) {
				i18nData.locale = newLocale;
			}
		};
		provider.setPrecision = function (key, value) {
			if (typeof key === 'string' && value) {
				i18nData.precision[key] = Number(value);

			} else if (typeof	key === 'object') {
				angular.extend(i18nData.precision, key);

			}
		};
		provider.setDateTemplate =function (newTemplate) {
			if (newTemplate) {
				i18nData.dateTemplate = newTemplate;
			}
		};
		provider.setCurrencyTemplate = function (newTemplate) {
			if (newTemplate) {
				i18nData.currencyTemplate = newTemplate;
			}
		};

	}	

	function i18nService(i18nData) {
		var service = i18nData;
		service.currencySettings = buildCurrencySettings(i18nData.currencyTemplate, i18nData.precision.currency);
		service.dateSettings = buildDateSettings(i18nData.dateTemplate);
		service.timeZoneOffset = (new Date()).getTimezoneOffset() * 60 * 1000;
		return service;

		function buildCurrencySettings(template, precision) {
			var settings = {
				symbol: '$',
				isSymbolBefore: true,
				separator: ',',
				groupLength: 3,
				decimal: '.',
				precision: precision || 2,
				groupingExp: undefined

			};

			//Ensure default filter values. 
			var currencyTemplate = template || '$1,234.56';
			/**
			 * Regex for capturing groups of number separators
			 * Matched groups: 
			 *      0      ignore     1          2        3        4       5     ignore     6    			 			
			 * [Symbol(s)][spaces][digit(s)][separator][digits][decimal][digits][spaces][Symbol(s)]
			 */
			var templateRegex = /^(\D*)(?:\s*)(\d+)([\.\,\'\s\-])(\d{3,4})(\.|\,)(\d{2,})(?:\s*)(\D*)$/;
			var matches = currencyTemplate.match(templateRegex);
			if (matches) {
				//Discard first element -- the full string match
				matches.shift();
				//Check symbol and where it was matched
				if (matches[0]) {
					settings.symbol = matches[0];
					settings.isSymbolBefore = true;

				} else {
					settings.symbol = matches[6];
					settings.isSymbolBefore = false;

				}
				//Get the rest of the matches
				settings.separator = matches[2];
				settings.groupLength = matches[3].length;
				settings.decimal = matches[4];

			}

			/**
			 * Compile the grouping regexp for fast reuse
			 * Matching groups: 
			 *        0               1         ignored         2
			 * [leading digits][grouped digits][decimal][fraction digits]
			 */
			var regexpStr = "^(\\d{1," + settings.groupLength + "})?" + "((?:\\d{" + settings.groupLength + "})*)" + "(?:\\.?)(\\d*)$";
			settings.groupingExp = new RegExp(regexpStr);
			return settings;

		}

		/**
		 * Construct settings required for date rendering. May turn this into
		 * 	a way of making salesforce date format compatible with the 'moment'
		 * 	library so that the date filter can take advantage of moment.
		 * 	 
		 */
		function buildDateSettings(dateTemplate) {
			var settings = {
				separator: '/',
				ordering: ['mm', 'dd', 'yyyy']
			};

			/**
			 * Regex for capturing date digits
			 * Matched groups: 
			 *      0           1         2           ignore          3
			 * [1-4 digits][separator][1|2 digits][same seperator][2-4 digits]
			 */
			var templateRegex = /(\d{1,4})([\/\s\-\.])(\d{1,2})(?:\2)(\d{1,4})/;
			var matches = dateTemplate.match(templateRegex);
			if (matches) {
				//Discard first element -- the full string match
				matches.shift();
				settings.separator = matches[1];
				[0,2,3].forEach(function(matchIndex, loopIndex) {
					var digits = matches[matchIndex];
					var component = '';
					var numVal = Number(digits);
					if (numVal <= 12) {
						component = 'm';

					} else if (numVal <= 31 ) {
						component = 'd';

					} else {
						component = 'y';

					}
					settings.ordering[loopIndex] = component.repeat(digits.length);

				});

			}
			return settings;

		}

	}

})();