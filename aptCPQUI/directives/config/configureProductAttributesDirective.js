(function() {
  var ConfigureProductAttributes, ConfigureProductAttributesCtrl;

  ConfigureProductAttributesCtrl = function(_, ConfigureService, systemConstants, LineItemCache, AttributeRulesService) {
    this.configure = ConfigureService;
    this.constrainedValues = {};
    this.hiddenValues = {};
    this.requiredValues = {};
    this.readOnlyValues = {};
    this.valuesForAttr = function(attr) {
      var ref, ref1, ref2, ref3;
      //console.log('values', attr, (ref = this.configure.lineItem.fields) != null ? (ref1 = ref[attr]) != null ? ref1.pickListEntries : void 0 : void 0);      
      if(typeof(this.constrainedValues[attr]) !== 'undefined') {
        return this.constrainedValues[attr];

      }

      return ((ref2 = this.configure.lineItem.fields) != null ? (ref3 = ref2[attr]) != null ? ref3.pickListEntries : void 0 : void 0) || [];
    };
    this.isVisible = function(attr) {
      return typeof(this.hiddenValues[attr]) === 'undefined';
    };
    this.isRequired = function(attr) {      
      return typeof(this.requiredValues[attr]) !== 'undefined';
    };
    this.isReadOnly = function(attr) {
      return typeof(this.readOnlyValues[attr]) !== 'undefined';
    };
    this.attributeLabel = function(attr) {
      var ref, ref1;
      return (ref = this.configure.lineItem.fields) != null ? (ref1 = ref[attr]) != null ? ref1.Label : void 0 : void 0;
    };
    this.attributeHelp = function(attr) {
      var ref, ref1;
      return (ref = this.configure.lineItem.fields) != null ? (ref1 = ref[attr]) != null ? ref1.inlineHelpText : void 0 : void 0;
    };
    this.isPicklist = function(attr) {
      var ref, ref1;
      return ((ref = this.configure.lineItem.fields) != null ? (ref1 = ref[attr]) != null ? ref1.FieldType : void 0 : void 0) === 'PICKLIST';
    };
    this.isTextArea = function(attr) {
      var ref, ref1;
      return _.includes(['TEXTAREA', 'DOUBLE'], (ref = this.configure.lineItem.fields) != null ? (ref1 = ref[attr]) != null ? ref1.FieldType : void 0 : void 0);
    };
    this.isMultiPickList = function(attr) {
      var ref, ref1;
      return ((ref = this.configure.lineItem.fields) != null ? (ref1 = ref[attr]) != null ? ref1.FieldType : void 0 : void 0) === 'MULTIPICKLIST';
    };
    this.attrSO = function() {      
      return this.configure.lineItem.attrSO();
    };

    this.processInputChange = function() {
      //TO-DO: process expression's

      //process attribute rules
      //this.processAttributeRules();
    };

    /**
     * Process the ABC rule infos for speficied line     
     */
    this.processAttributeRules = function() {
        // TO-DO: check if might have to re-think this...
        // transition page loads cache, but will it get invalidated somehow?
        var cartLines = LineItemCache.getLineItems();
        var contextLine = ConfigureService.lineItem;
        var cartLinesByPrimaryId = {0: {'Id':contextLine.lineItemSO()[systemConstants.nsPrefix+'ConfigurationId__c']}};
        for(var i=0, max=cartLines.length; i < max; i++) {
          var lineSO = cartLines[i].chargeLines[0].lineItemSO;
          cartLinesByPrimaryId[lineSO[systemConstants.nsPrefix+'PrimaryLineNumber__c']] = lineSO;
        }

        //process the attribute rules
        var ruleResults = AttributeRulesService.processAttributeRules(contextLine.lineItemSO(), cartLinesByPrimaryId, contextLine.attributeRules);
        this.constrainedValues = {};
        this.hiddenValues = ruleResults.hidden;
        this.requiredValues = ruleResults.required;
        this.readOnlyValues = ruleResults.readOnly;

        //grab valid picklist entries
        for(var fieldAPI in ruleResults.constraints) {
          if(this.configure.lineItem.fields
              && this.configure.lineItem.fields[fieldAPI]) {
            var allEntries = this.configure.lineItem.fields[fieldAPI].pickListEntries;
            var availableEntries = ruleResults.constraints[fieldAPI];
            
            /*if(this.configure.isMultiPickList(fieldAPI)) { //handle multi-select constraints
              var newAvailableEntries = {};
              for(var entryKey in availableEntries) {
                if(availableEntries.hasOwnProperty(entryKey)) {
                  var splitKey = entryKey.split(';');
                  for(var i=0; i < splitKey.length; i++) {
                    newAvailableEntries[splitKey[i]] = splitKey[i]; 
                  }

                  availableEntries = newAvailableEntries;
                }
              }
            }*/

            for(var i=0, max=allEntries.length; i < max; i++) {
              var entry = allEntries[i];
              if(typeof(availableEntries[entry.value]) !== 'undefined') {
                var constrainedForField = this.constrainedValues[fieldAPI];
                if(typeof(constrainedForField) == 'undefined') {
                  constrainedForField = [];
                  this.constrainedValues[fieldAPI] = constrainedForField;
                }

                constrainedForField.push(entry);
              }
            }
          }
        }
    }
  };

  ConfigureProductAttributesCtrl.$inject = ['lodash', 
                                            'ConfigureService', 
                                            'systemConstants', 
                                            'LineItemCache',
                                            'AttributeRules'];

  ConfigureProductAttributes = function(systemConstants) {
    return {
      restrict: 'AE',
      scope: {
      },
      templateUrl: systemConstants.baseUrl + "/templates/directives/configure-product-attributes.html",
      controller: ConfigureProductAttributesCtrl,
      controllerAs: 'config',
      bindToController: true,      
      link: function (scope, element, attrs, ctrl) {        
        var inputProcessed = false;
        scope.$watch(
            function() {
              if(inputProcessed) { //execute once per digest                
                return;
              }

              inputProcessed = true;
              scope.config.processInputChange(arguments);
              scope.$$postDigest(function() {               
                inputProcessed = false;        
              });
        });
      }       
    };
  };

  ConfigureProductAttributes.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('configureProductAttributes', ConfigureProductAttributes);

}).call(this);
