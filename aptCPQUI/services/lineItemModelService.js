(function() {
  angular.module('aptCPQUI')
    .service('LineItemModelService', LineItemModelService);

  LineItemModelService.$inject = [
    '$q',
    'lodash',
    'systemConstants',
    'OptionGroupModelService',
    'AttributeDataService',
    'CartDataService',
    'OptionDataService',
    'LineItemSupport'
  ];

  function LineItemModelService($q, _, systemConstants, OptionGroupModel, AttributeData, CartData, OptionData, LineItemSupport) {
    var nsPrefix = systemConstants.nsPrefix;
    
    function LineItemModel(data, optionData, parentItem) {
      this.data = data;
      this.optionData = optionData;
      this.parentItem = parentItem;
    }
    
    LineItemModel.create = function(data, optionData, parentItem) {
      var newItem;
      this.data = data;
      this.optionData = optionData;
      this.parentItem = parentItem;
      newItem = new this(this.data, this.optionData, this.parentItem);
      return newItem.init();
    };


    LineItemModel.prototype.init = function() {
      var thisItem = this;
      var promises;
      promises = {};        
      if (thisItem.hasAttrs()) {
        promises.attrGroups = thisItem._getAttributeGroups();
        promises.fields = thisItem._getAttributeFields();
        promises.attributeRules = thisItem._getAttributeRules();
      }
      if (thisItem.hasOptions()) {
        thisItem.subItems = [];
        this.optionsMap = {};
        promises.optionGroups = thisItem._getOptionGroups();
      }
      return $q.all(promises).then(function(results) {
        thisItem.attrGroups = results.attrGroups;
        thisItem.fields = results.fields;
        thisItem.attributeRules = results.attributeRules;
        if (results.optionGroups) {
          thisItem.optionGroups = [];
          thisItem._buildSubGroups(results.optionGroups);
          return thisItem;
          // return thisItem._buildSubItems(results.optionGroups).then(function() {
          //   return thisItem;
          // });
        } else {
          return thisItem;
        }
      });
    
    };

    LineItemModel.prototype.isTopLevel = function() {
      return this.data.chargeLines[0].lineItemSO[nsPrefix + 'LineType__c'] !== 'Option';
    };

    /**
     * Name is misleading -- returns an existing line item if the structure
     *   has already been built.
     * @param {[type]} optionWrapper [description]
     */
    LineItemModel.prototype.addOption = function(optionWrapper) {
      var thisLine = this;
      var optionComponent = optionWrapper.data;
      var componentId = optionComponent.Id;
      var optionList = thisLine.data.optionLines;
      if (thisLine.optionsMap[componentId]) {
        return $q.when(thisLine.optionsMap[componentId]);

      }
      var matchingDO = _.find(optionList, function(optionDO) {
        return LineItemSupport.compareOptionLineToComponent(optionDO, optionComponent);

      });
      var newItemPromise;
      if (matchingDO) {
        newItemPromise = LineItemModel.create(matchingDO, optionComponent, thisLine);

      } else {
        newItemPromise = LineItemSupport.newOptionLineItemForComponent(optionComponent).then(function (newOptionLineDO) {
          var matchingDO = _.find(optionList, function(optionDO) {
            return LineItemSupport.compareOptionLineToComponent(optionDO, optionComponent);
          });
          if (matchingDO) {
            newOptionLineDO = matchingDO;

          } else {
            thisLine.data.optionLines.push(newOptionLineDO);

          }
          return LineItemModel.create(newOptionLineDO, optionComponent, thisLine);
        });

      }
      thisLine.optionsMap[componentId] = newItemPromise;
      return newItemPromise;
      
    };

    LineItemModel.prototype.remove = function() {
      LineItemSupport.deselectLineItem(this.data);
      
    };


    LineItemModel.prototype.deselect = function() {
      LineItemSupport.deselectLineItem(this.data);
      // _.forEach(this.optionGroups, function (nextGroup) {
      //   nextGroup.selectNone();
      // });
      return this;

    };

    LineItemModel.prototype.select = function() {
      LineItemSupport.selectLineItem(this.data);
      return this;

    };

    /**
     * Would be used for splicing option lines out the date. Trying to
     *   not use this in favor of maintaining temp data objects and marking
     *   them as deselected.
     */
    // LineItemModel.prototype.removeOptionLine = function(optionLine) {
    //   var i, j, len, ref, results1, subItem;
    //   ref = this.subItems;
    //   results1 = [];
    //   for (i = j = 0, len = ref.length; j < len; i = ++j) {
    //     subItem = ref[i];
    //     if (subItem === optionLine) {
    //       this.subItems.splice(i, 1);
    //       results1.push(this.data.optionLines.splice(i, 1));
    //     } else {
    //       results1.push(void 0);
    //     }
    //   }
    //   return results1;
    // };

    LineItemModel.prototype.topLineTotal = function() {
      var charge, j, len, ref, total;
      total = 0;
      ref = this.data.chargeLines;
      for (j = 0, len = ref.length; j < len; j++) {
        charge = ref[j];
        if (angular.isNumber(charge.lineItemSO[nsPrefix + 'NetPrice__c'])) {
          total += charge.lineItemSO[nsPrefix + 'NetPrice__c']; 
        }
      }
      return total;
    };

    LineItemModel.prototype.hasAttrs = function() {
      return this.lineItemSO()[nsPrefix + 'HasAttributes__c'];
    };

    LineItemModel.prototype.hasOptions = function() {
      return this.lineItemSO()[nsPrefix + 'HasOptions__c'];
    };

    LineItemModel.prototype.lineType = function() {
      return this.lineItemSO()[nsPrefix + 'LineType__c'];
    };

    LineItemModel.prototype.productID = function() {
      var idField = nsPrefix + (this.lineType() === 'Option' ? 'OptionId__c' : 'ProductId__c');
      return this.lineItemSO()[idField];
    };

    LineItemModel.prototype.optionComponentId = function() {
      return this.lineItemSO()[nsPrefix + 'ProductOptionId__c'];
    };

    LineItemModel.prototype.productName = function() {
      // return this.lineItemSO()[nsPrefix + 'ProductId__r'].Name;
      var productField = nsPrefix + (this.lineType() === 'Option' ? 'OptionId__r' : 'ProductId__r');
      return this.lineItemSO()[productField].Name;
    };

    LineItemModel.prototype.lineItemSO = function() {
      return this.data.chargeLines[0].lineItemSO;
    };

    LineItemModel.prototype.isPersisted = function() {
      return !!this.lineItemSO().Id;
    };

    LineItemModel.prototype.attrSO = function() {
      return this.lineItemSO()[nsPrefix + 'AttributeValueId__r'];
    };

    LineItemModel.prototype.quantity = function() {
      return this.lineItemSO()[nsPrefix + 'Quantity__c'];
    };

    LineItemModel.prototype._getAttributeGroups = function() {
      return AttributeData.getAttributeGroups(this.productID());
    };

    LineItemModel.prototype._getAttributeFields = function() {
      return AttributeData.getAttributeFields();
    };

    LineItemModel.prototype._getAttributeRules = function() {        
      return AttributeData.getAttributeRules(this.productID());
    };

    LineItemModel.prototype._getOptionGroups = function() {
      return OptionData.getOptionGroups(this.productID());
    };

    LineItemModel.prototype._buildSubGroups = function(optionGroups) {
      var thisItem = this;
      var group, groupsLen, groupsIndex, optionGroupWrapper, results1;
      for (groupsIndex = 0, groupsLen = optionGroups.length; groupsIndex < groupsLen; groupsIndex++) {
        group = optionGroups[groupsIndex];
        optionGroupWrapper = new OptionGroupModel(group, thisItem);
        thisItem.optionGroups.push(optionGroupWrapper);

      }

    };

    // LineItemModel.prototype._buildSubItems = function(optionGroups) {
    //   var group, j, k, l, len, len1, len2, option, optionID, optionLine, promises, ref, ref1;
    //   promises = [];
    //   for (j = 0, len = optionGroups.length; j < len; j++) {
    //     group = optionGroups[j];
    //     ref = group.options;
    //     for (k = 0, len1 = ref.length; k < len1; k++) {
    //       option = ref[k];
    //       ref1 = this.data.optionLines;
    //       for (l = 0, len2 = ref1.length; l < len2; l++) {
    //         optionLine = ref1[l];
    //         optionID = optionLine.chargeLines[0].lineItemSO[nsPrefix + 'OptionId__c'];
    //         if (optionID === option[nsPrefix + 'ComponentProductId__c']) {
    //           promises.push(LineItemModel.create(optionLine, option, this));
    //         }
    //       }
    //     }
    //   }
    //   var thisItem = this;
    //   return $q.all(promises).then(function(results) {
    //     var len3, m, optionGroup, results1;
    //     thisItem.subItems = results;
    //     results1 = [];
    //     for (m = 0, len3 = optionGroups.length; m < len3; m++) {
    //       group = optionGroups[m];
    //       optionGroup = new OptionGroup(group, thisItem);
    //       results1.push(thisItem.optionGroups.push(optionGroup));
    //     }
    //     return results1;
    //   });
    // };

    // LineItemModel.prototype._newLineItemFromProductOption = function(productOptionComponenet) {
    //   // return CartData.newLineItemFromProductOption(option);
    //   return LineItemSupport.newOptionLineItemForComponent(productOptionComponenet);
    // };

    LineItemModel.prototype._restrictLevel = function(optionLine) {
      var level, parent;
      level = 1;
      parent = this.parentItem;
      while (parent) {
        level += 1;
        parent = parent.parentItem;
      }
      if (level >= 3) {
        optionLine.optionLines = [];
      }
    };

    return LineItemModel;

  }

}).call(this);
