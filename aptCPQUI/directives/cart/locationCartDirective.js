/**
 * Directive: locationCart
 */
(function() {
    var LocationCart, locationCartCtrl, locationCartLink;

    locationCartCtrl = function(_, $sce, $q, $log, $state, i18nService, $stateParams, systemConstants, CartService, ActionHandlerService) {
        var activate, locationCart;
        var nsPrefix = systemConstants.nsPrefix;
        locationCart = this;
        locationCart.view = $stateParams.view;
        locationCart.dateFormat = systemConstants.dateFormat;
        locationCart.labels = i18nService.CustomLabel;
        locationCart.cartState;
        locationCart.sortableSettings = {
            handle: '.line-item-row--draggable',
            group: 'lineItem',
            onEnd: function (endEvent) {
                //Should show spinner until event finishes?
                CartService.resequenceLineItems(endEvent.model, endEvent.oldIndex, endEvent.newIndex);
            }
        };
        activate = function() {
            return $q.all([CartService.getCartLineItems(), 
                           CartService.getCartColumns(), 
                           CartService.getLocationCartCheckBoxModels(), 
                           CartService.getCartLocations(), 
                           CartService.getLineItemsWithoutLocation(), 
                           CartService.getLocationLineItems()]).then(function(res) {

                var columns, locationLineItemDetails;
                locationCart.groupByColumnFields = [];
                locationCart.cartLineItems = res[0];

                columns = res[1];
                locationCart.checkBoxes = CartService.locationCartCheckBoxModels;
                
                locationCart.cartLocations = res[3];

                if(!angular.isDefined(locationCart.cartLocations)) {
                    locationCart.cartLocations = [];
                }

                locationCart.lineItemsWithoutLocation = res[4];
                locationCart.lineItemToLocationMap = res[5];
                
                locationCart.columnTypes = columns.map(function(column) {
                    if (column.FieldType === 'REFERENCE') {
                        column.FieldName = column.FieldName.replace('__c', '__r');
                    }

                    if (_.includes(column.FieldName, nsPrefix+'ProductId__r')) {
                        column.FieldType = 'DETAIL';
                        locationCart.groupByColumnFields.push(column.Label);
                    
                    } else if (_.includes(column.FieldName, nsPrefix+'ChargeType')) {
                        column.FieldType = 'CHARGETYPE';
                        locationCart.chargeKey = column.FieldName;
                    
                    } else if (_.includes(column.FieldName, nsPrefix+'Quantity')) {
                        column.FieldType = 'QUANTITY';
                    
                    } else if(_.includes(column.FieldName, nsPrefix+'LocationId__r')) {
                        locationCart.groupByColumnFields.push(column.Label);
                        locationCart.cartState = column.Label;
                    }

                    return column;
                });
                locationCart.tableColumns = locationCart.columnTypes.filter(function(column) {
                    if (column.FieldName.indexOf('ChargeType') <= -1) {
                        return true;
                    }
                });

                 return locationCart.columns;
            });
        };
        activate();
        locationCart.getColumnData = function(columnField) {
            return locationCart.item.lineItemSO[columnField];
        };
        locationCart.getLineItemSequence = function(lineItem) {
            var primaryChargeLine = lineItem.chargeLines[0].lineItemSO;
            return primaryChargeLine[nsPrefix + 'LineSequence__c'];
        };
        locationCart.isLineSelected = function(lineItem) {
            return lineItem.isSelected ? lineItem.isSelected() : false;
        };
        locationCart.checkBoxSelected = function() {
            return $log.debug('checked');
        };
        locationCart.checkLineItem = function(lineItem) {
            // CartService.checkLineItem(lineItem);
        };
        locationCart.isServerActionInProgress = function() {
            return ActionHandlerService.isServerActionInProgress;
        };
        locationCart.totalProductsForLocation = function(cartLocation) {
            if(angular.isDefined(locationCart.lineItemToLocationMap[cartLocation])) {
                return locationCart.lineItemToLocationMap[cartLocation].length;
            } else {
                return 0;
            }
        };
        locationCart.lineItemsForCartLocation = function(cartLocation) {
            if(angular.isDefined(locationCart.lineItemToLocationMap[cartLocation])) {
                return locationCart.lineItemToLocationMap[cartLocation];
            }
        };
        locationCart.changeCartState = function() {
            if(locationCart.cartState == 'Product') {
                $state.go('cart');
            } 
        };
        locationCart.getStreetName = function(cartLocation) {
            return cartLocation[nsPrefix + 'Street__c'];
        };
        locationCart.isNotUsedInQuote = function(cartLocation) {
           if(locationCart.totalProductsForLocation(cartLocation) === 0) {
                return true;
           } else {
                return false;
           }
        };
    };

      locationCartCtrl.$inject = [
        'lodash',
        '$sce',
        '$q',
        '$log',
        '$state',
        'aptBase.i18nService',
        '$stateParams',
        'systemConstants',
        'CartService',
        'ActionHandlerService'
    ];

    locationCartLink = function(scope, elem, attr) {
        var body, globalHeader, header, processTrail, scrollHandler, mainCart;
        body = elem[0];
        header = body.querySelector('location-cart-header');
        globalHeader = document.querySelector('.header-global');
        processTrail = document.querySelector('.process-trail');
        mainCart = document.querySelector('.main-cart-container');

        scrollHandler = function(ev) {
            var bodyRect, globalHeaderRect, headerRect, processTrailRect, mainCartRect, cartColumnHeaderHeight;
            bodyRect = body.getBoundingClientRect();
            headerRect = header.getBoundingClientRect();
            globalHeaderRect = globalHeader.getBoundingClientRect();
            processTrailRect = processTrail.getBoundingClientRect();
            cartColumnHeaderHeight = document.querySelector(".cart-label-row").getBoundingClientRect().height;
            mainCartRect = mainCart.getBoundingClientRect();

            if (mainCartRect.top - globalHeaderRect.height <= 1) {
                if(Math.abs(mainCartRect.top - (globalHeaderRect.height + cartColumnHeaderHeight)) <= mainCartRect.height){
                    body.classList.add('main-cart-wrapper--header-fixed');
                    // 97 = Cart Header Height
                    angular.element(mainCart).css("marginTop", "97px");
                }
                else{
                    body.classList.remove('main-cart-wrapper--header-fixed');
                    angular.element(mainCart).css("marginTop","-17px");
                }
            } else {
                body.classList.remove('main-cart-wrapper--header-fixed');
                angular.element(mainCart).css("marginTop","0px");
            }
        };
        return window.addEventListener('scroll', scrollHandler);
    };

    LocationCart = function(systemConstants) {
        var directive;
        directive = {
            link: locationCartLink,
            controller: locationCartCtrl,
            controllerAs: 'locationCart',
            bindToController: true
        };
        return directive;
    };

    LocationCart.$inject = ['systemConstants'];

    angular.module('aptCPQUI').directive('locationCart', LocationCart);

}).call(this);