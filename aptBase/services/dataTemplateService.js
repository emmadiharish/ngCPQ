;(function() {
	angular.module('dataFilters')
		.factory('dataTemplate', [dataTemplateFactory]);

	/**
	 * Factory for scanning the document for specific template values
	 * and constructing an object that stores those values for formatting.
	 *
	 * This is a factory instead of a service because method is run once
	 * to get the factory object (on an lazy, as-needed basis), after which 
	 * the object is saved and just reused throughout app.
	 * 
	 * @return {object} key-value store:
	 *   {
	 *   		currency: <currency template string>,
	 *   		date: 		<date template string>,
	 *   		precision: 
	 *   			{
	 *   				quantity: 	<number>
 	 *					currency: 	<number>
	 *					percentage: <number>
	 *   			}
	 *   }
	 */
	function dataTemplateFactory() {
		var dataTemplate = {};

		//Helper function to get text from output field by id.
		function getOutputFieldText(fieldId) {
			var fieldElement = document.querySelector('#' + fieldId + ' span');
			if (fieldElement) {
				return fieldElement.textContent;
			}
			return void 0;

		}

		dataTemplate.currency = (function() {
			var currencyTemplate = '$1,234.56';
			var templateText = getOutputFieldText('idCurrencyTemplate');
			if (!templateText) {
				return currencyTemplate;

			}
			//Remove multi-currency section
			var parenIndex = templateText.indexOf("(");
			if (parenIndex > -1) {
					templateText = templateText.slice(0, parenIndex);;

			} 
			//Check if formatted text is a valid template
			if(templateText.length > 2){
					currencyTemplate = templateText;
					
			}
			return currencyTemplate;
		})();

		dataTemplate.date = (function() {
			var dateTemplate = '01/23/45';
			var templateText = getOutputFieldText('idDateTemplate');
			if (!templateText) {
				return dateTemplate;

			}
			dateTemplate = templateText;
			return dateTemplate;
		})();

		dataTemplate.precision = (function() {
			var quantity = Number(getOutputFieldText('idQuantityPrecision')),
					currency = Number(getOutputFieldText('idCurrencyPrecision')),
					percentage = Number(getOutputFieldText('idPercentagePrecision'))
			var precision = {
				quantity: (quantity || 0),
				currency: (currency || 2),
				percentage: (percentage || 2)
			};
			return precision;
		})();			
		return dataTemplate;

	}
	
})();