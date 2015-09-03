(function() {
	angular.module('aptCPQUI')
		.directive('optionAttributeConfig', OptionAttributeConfig);

	OptionAttributeConfig.$inject = ['systemConstants'];
	OptionAttrConfigCtrl.$inject = [
		'lodash',
		'systemConstants',
		'ConfigureService'
	];

	function OptionAttributeConfig(systemConstants) {
		return {
			scope: {
				lineItem: '='
			},
			templateUrl: systemConstants.baseUrl + "/templates/directives/options/option-attribute-config.html",
			controller: OptionAttrConfigCtrl,
			controllerAs: 'attrsCtrl',
			bindToController: true,
			restrict: 'E'
		};
		
	}

	function OptionAttrConfigCtrl(_, systemConstants, Configure) {
		var attrsCtrl = this;
		var nsPrefix = systemConstants.nsPrefix;
		attrsCtrl.attrValueField = nsPrefix + 'AttributeValueId__r';
		attrsCtrl.isTwoColumn = function (attrGroup) {
			return !!attrGroup[nsPrefix + 'TwoColumnAttributeDisplay__c'];
		};
		attrsCtrl.attrsForGroup = function (attrGroup) {
			return _.map(attrGroup[nsPrefix + 'Attributes__r'], function (attrObject) {
					return attrObject[nsPrefix + 'Field__c'];
				});
		};
		attrsCtrl.fieldForAttr = function (attr) {
			return attrsCtrl.lineItem.fields[attr];
		};
		attrsCtrl.valuesForAttr = function(attr) {
			var attrField = attrsCtrl.fieldForAttr(attr);
			if (attrField) {
				return attrField.pickListEntries;
			}
			return [];
		};
		attrsCtrl.attributeLabel = function(attr) {
			var attrField = attrsCtrl.fieldForAttr(attr);
			if (attrField) {
				return attrField.Label;
			}
			return '';
		};
		attrsCtrl.attributeHelp = function(attr) {
			var attrField = attrsCtrl.fieldForAttr(attr);
			if (attrField) {
				return attrField.inlineHelpText;
			}
			return '';
		};
		// TODO: Get multi-select to work 
		// attrsCtrl.isMultiPickList = function(attr) {
		// 	var attrField = attrsCtrl.fieldForAttr(attr);
		// 	var ref;
		// 	return ((ref = attrsCtrl.lineItem.fields[attrField]) != null ? ref.FieldType : void 0) === 'MULTIPICKLIST';
		// };
		return attrsCtrl;
	}

})();
