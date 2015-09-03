;(function() {
	'use strict';
	
	angular.module('aptBase')
		.service('aptBase.UtilService', UtilService);
	
	UtilService.$inject = [];

	function UtilService() {
		var service = this;

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
			var stringGroups = baseString.split(/\{\d+\}/);
			var formattedString = '';
			var nextInsert;
			for (var stringIndex = 0; stringIndex < stringGroups.length; stringIndex++) {
				nextInsert = stringIndex < inserts.length ? inserts[stringIndex] : '';
				formattedString += stringGroups[stringIndex] + nextInsert;
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

	}

})();