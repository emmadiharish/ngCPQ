;(function() {
	'use strict';
	
	angular.module('aptBase')
		.service('aptBase.UtilService', UtilService);
	
	UtilService.$inject = ['lodash'];

	function UtilService(_) {
		var service = this;

		service.frequencyConstants = {
			FREQUENCY_HOURLY: 'Hourly',
			FREQUENCY_DAILY: 'Daily',
			FREQUENCY_WEEKLY: 'Weekly',
			FREQUENCY_MONTHLY: 'Monthly',
			FREQUENCY_QUARTERLY: 'Quarterly', 
			FREQUENCY_HALFYEARLY: 'Half Yearly',
			FREQUENCY_YEARLY: 'Yearly'
		};

		service.priceTypesConstants = {
			PRICETYPE_ONETIME: 'One Time',
			PRICETYPE_RECURRING: 'Recurring',
			PRICETYPE_USAGE: 'Usage',
			PRICETYPE_INCLUDED_USAGE: 'Included Usage'
		};

		/**
		 * Use string-to-number conversion to compensate for floating point 
		 * 	errors in standard javascript rounding.
		 * @param  {Number/String} value
		 * @param  {Number/String} precision 	these can be numbers or strings
		 *                                    representing numbers
		 * @return {Number}	Rounded value
		 */
		service.round = function(value, precision) {
			precision = precision ? precision : 0; 
			var roundExpPos = "e+" + precision;
			var roundExpNeg = "e-" + precision;
			return Number(Math.round(value + roundExpPos) + roundExpNeg);

		};

		/**
		 * Check whether a nmber is within a min/max range. If min or max is not
		 * 	of type number, it the value is assumed to automatically meet the 
		 * 	criteria. If the value to check is not a number type, it automatically
		 * 	fails.
		 * @param  {Number}  minVal    
		 * @param  {Number}  maxVal    
		 * @param  {Number}  betweenVal
		 * @param  {Boolean}  strictly		Whether to compare strictly. False by default.
		 * @return {Boolean}           
		 */
		service.isBetween = function(minVal, maxVal, betweenVal, strictly) {
			if (!angular.isNumber(betweenVal)) {
				return false;

			}
			var minSatisfied, maxSatisfied;
			if (!strictly) {
				minSatisfied = angular.isNumber(minVal) ? betweenVal >= minVal : true;
				maxSatisfied = angular.isNumber(maxVal) ? betweenVal <= maxVal : true;
			
			} else {
				minSatisfied = angular.isNumber(minVal) ? betweenVal > minVal : true;
				maxSatisfied = angular.isNumber(maxVal) ? betweenVal < maxVal : true;
			
			}
			return minSatisfied && maxSatisfied;

		};

		/**
		 * Replicate Java string format where you can pass an string that has
		 * 	groups such as {0}, {1}, ... and an array of strings to insert at
		 * 	the appropriate indicies. Used for filling in custom labels.
		 * @param  {[type]} baseString [description]
		 * @param  {[type]} inserts    [description]
		 * @return {[type]}            [description]
		 */
		service.stringFormat = function(baseString, inserts) {
			if (!baseString) {
				return '';
				
			}
			if (!angular.isArray(inserts) || inserts.length < 1) {
				return baseString;

			}
			var stringGroups = baseString.split(/\{(\d+)\}/),
					formattedString = '',
					isInsert = false,
					insertIndex = 0,
					nextInsert = '';
			for (var stringIndex = 0; stringIndex < stringGroups.length; stringIndex++) {
				if (isInsert) {
					isInsert = false;
					insertIndex = parseInt(stringGroups[stringIndex]);
					nextInsert = insertIndex < inserts.length ? inserts[insertIndex] : '';
					formattedString += nextInsert;

				} else {
					isInsert = true;
					formattedString += stringGroups[stringIndex];
					
				}

			}
			return formattedString;
			
		};
		
		/**
		 * returns true when the parameter passed is undefined or null or empty array or blank string
		 * @param obj any kind of parameter 
		 */
		service.isEmpty = function(obj) {
			if (angular.isDefined(obj) && obj !== null) {
				if(angular.isArray(obj) && obj.length === 0 || obj === ''){
					return true;

				}
				return false;

			}
			return true;

		};

		/**
		 * Computes the end date for the given start date and term parameters
		 * @param startDate the term start date
		 * @param term the term 
		 * @param frequency the frequency associated with the term
		 * @return the end date
		 */
		service.computeEndDate = function(startDate, term, frequency) {
			var newEndDate = new Date(startDate);

			if (frequency === service.frequencyConstants.FREQUENCY_HOURLY) {
				// hourly
				newEndDate = newEndDate.setDate(newEndDate.getDate() + (1/24 * term));
				
			} else if (frequency === service.frequencyConstants.FREQUENCY_DAILY) {
				// daily
				newEndDate = newEndDate.setDate(newEndDate.getDate() + term);
					
			} else if (frequency === service.frequencyConstants.FREQUENCY_WEEKLY) {
				// weekly
				newEndDate = newEndDate.setDate(newEndDate.getDate() + (term * 7));;
				
			} else if (frequency === service.frequencyConstants.FREQUENCY_MONTHLY) {
				// monthly
				newEndDate = service.computeEndDateByMonths(startDate, term, 1);
				
			} else if (frequency === service.frequencyConstants.FREQUENCY_QUARTERLY) {
				// quarterly
				newEndDate = service.computeEndDateByMonths(startDate, term, 3);
					
			} else if (frequency === service.frequencyConstants.FREQUENCY_HALFYEARLY) {
				// half yearly
				newEndDate = service.computeEndDateByMonths(startDate, term, 6);
				
			} else if (frequency === service.frequencyConstants.FREQUENCY_YEARLY) {
				// yearly
				newEndDate = service.computeEndDateByMonths(startDate, term, 12);
						
			}

			return newEndDate;

		};

		/**
		 * compute end date for monthly, quartely, half-yearly or yearly term 
		 * @param startDate line item start date
		 * @param term number of months plus extra days / 30 
		 * @param frequencyInMonths 1-monthly, 3-quarterly 6-half-yearly 12-yearly 
		 */
		service.computeEndDateByMonths = function(startDate, term, frequencyInMonths) {
			var months = (term * frequencyInMonths);

			var newEndDate = new Date(startDate);
			newEndDate.setMonth(newEndDate.getMonth() + months);

			return newEndDate;
		};

		/**
		 * reorder elements within an array such that when a matching key is found, the element is moved to the 
		 * head of that array - this check is repeated for every element of the array.
		 * @param - source array
		 * @param - predicate, callback function; Must return true if element should move to the head of the array
		 */
		service.reorderArray = function(array, callback) {
			if (_.isArray(array) == false || array.length == 0 || _.isFunction(callback) == false) {
				return;
			}

			var spliceIdx = [];

			for (var i = 0; i < array.length; i++) {
				// callback should return true/false
				if ((i > 1) && callback(array[i])) {
					spliceIdx.push(i);
				}
			}

			spliceIdx.forEach(function (idx){
				var culled = array.splice(idx, 1);
				array.splice(0, 0, culled[0]);
			});
		};

		/**
		 * compute days in given year and a month
		 * @param year
		 * @param month
		 * return days in month
		 */
		service.daysInMonth = function(year, month) {
			return new Date(year, month, 0).getDate();
		};

	}

})();