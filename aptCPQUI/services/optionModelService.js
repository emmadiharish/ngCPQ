(function() {
  angular.module('aptCPQUI')
    .service('OptionModelService', OptionModelService);

  OptionModelService.$inject = [
    '$q',
    '$log',
    'lodash',
    'systemConstants',
    'aptBase.UtilService'
  ];

  function OptionModelService($q, $log, _, systemConstants, UtilService) {
    var nsPrefix = systemConstants.nsPrefix;

    function OptionModel(optionComponent, group, optionLine) {
      this.data = optionComponent;//TODO: rename .data
      this.group = group;
      this.prices = [];
      return this;
    }

    //Trying out an initializer that lets directive call for creation
    OptionModel.prototype.init = function() {
      var thisOption = this;
      if (!thisOption.optionLine) {
        return thisOption.group.findOptionSelection(thisOption).then(function (foundLine) {
          thisOption.optionLine = foundLine; 
          return thisOption;
          
        });

      }
      return $q.when(thisOption);

    };


    OptionModel.prototype.toggleSelected = function() {
      var thisOption = this;
      return thisOption.group.toggleOption(thisOption).then(function(newItem) {
          if (newItem != thisOption.optionLine) {
            $log.debug('Toggle created new option item:', thisOption.optionLine, newItem);
            thisOption.optionLine = newItem;
          }
          return thisOption;
        });
    };

    OptionModel.prototype.componentId = function() {
      //Component Id starts with uppercase "I".
      return this.data.Id;
    };

    OptionModel.prototype.isDefault = function() {
      return !!this.data[nsPrefix + 'Default__c'];
    };

    OptionModel.prototype.isSelected = function() {
      return !!this.optionLine && this.optionLine.data.isSelected;
    };

    OptionModel.prototype.hasError = function() {
      return this.isSelected() && !this.hasValidQuantity();
    };

    OptionModel.prototype.hasValidQuantity = function() {
      var minVal = this.data[nsPrefix + 'MinQuantity__c'];
      var maxVal = this.data[nsPrefix + 'MaxQuantity__c'];
      return UtilService.isBetween(minVal, maxVal, this.quantity());

    };

    // OptionModel.prototype.getConfigurationErrors = function(number) {
    // };

    OptionModel.prototype.optionField = function(fieldName) {
      return this.data[nsPrefix + 'ComponentProductId__r'][fieldName];
    };

    OptionModel.prototype.name = function() {
      return this.data[nsPrefix + 'ComponentProductId__r'].Name;
    };

    OptionModel.prototype.price = function() {
      var ref = this.data[nsPrefix + 'ComponentProductId__r'][nsPrefix + 'PriceLists__r'];
      if (ref) {
        return ref[0][nsPrefix + 'ListPrice__c'];

      }
      return void(0);

    };

    OptionModel.prototype.getPrices = function() {
      this.prices.length = 0;
      var priceLists = this.data[nsPrefix + 'ComponentProductId__r'][nsPrefix + 'PriceLists__r'];
      if (priceLists) {
        _.reduce(priceLists, function (prices, nextItem) {
          prices.push(nextItem[nsPrefix + 'ListPrice__c']);
          return prices;          
        }, this.prices);

      }
      return this.prices;

    };

    OptionModel.prototype.isEditable = function() {
      return !!this.data[nsPrefix + 'Modifiable__c'];
    };

    OptionModel.prototype.quantity = function() {
      return this.optionLine.lineItemSO()[nsPrefix + 'Quantity__c'];
    };

    return OptionModel;

  }

}).call(this);
