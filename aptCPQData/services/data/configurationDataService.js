;(function() {
	
	angular.module('aptCPQData')
		.provider('ConfigurationDataService', ConfigurationDataServiceProvider);

	function ConfigurationDataServiceProvider() {
		var provider = this;
		provider.baseRequestPromise = null;
		//base for all requests
		var requestBase = {
				cartId: "",
				configRequestId: "",
				priceListId: "",
				pageParams: ""
		};
		
		ConfigurationDataServiceFactory.$inject = ['$q', '$log', '$http', 'aptBase.RemoteService'];
		provider.$get = ConfigurationDataServiceFactory;

		provider.setRequestBase = function(newCartId, newConfigRequestId, newPriceListId, newPageParams) {
			requestBase.cartId = newCartId;
			requestBase.configRequestId = newConfigRequestId;
			requestBase.priceListId = newPriceListId;
			requestBase.pageParams = newPageParams;

		};
		
		/**
		 * initialize cart when cartId and configRequestId is not found
		 * @return {Object} returns cartId, configRequestId  
		 */
		provider.getRequestBase = function($q, RemoteService) {
			if (provider.baseRequestPromise != null) {
				return provider.baseRequestPromise;
			}
			
			if (requestBase.cartId !== "" && requestBase.configRequestId !== "") {
				provider.baseRequestPromise = $q.when(requestBase);
				
			} else {
				provider.baseRequestPromise = RemoteService.initializeCart(requestBase.pageParams).then(function(response) {
					requestBase.cartId = response.cartId;
					requestBase.configRequestId = response.configRequestId;
					requestBase.priceListId = response.priceListId;
					//requestBase.pageParams = response.pageParams;
					return requestBase;
				});
				
			}
			return provider.baseRequestPromise;

		};
		
		function ConfigurationDataServiceFactory ($q, $log, $http, RemoteService) {
			return new ConfigurationDataService($q, $log, $http, RemoteService, provider.getRequestBase($q, RemoteService));

		}

		function ConfigurationDataService($q, $log, $http, RemoteService, requestBase1) {
			var service = this;
			var configurationData;
			var configurationRequestPromise;

			/** Service constants -- may need to be retrived from custom setting */
			service.defaultSearchFields = ["Name", "ProductCode", "Family"];
			service.includeConstants = {
				ATTRIBUTE_FIELDS: 'attributeFields',
				ATTRIBUTE_GROUPS: 'attributeGroups',
				ATTRIBUTE_VALUES: 'attributeValues',
				CART: 'cart',
				CART_LINES: 'cartLines',
				CATEGORIES: 'categories',
				CHARGE_LINES: 'chargeLines',
				CUSTOM_SETTINGS: 'customSettings',
				DEFAULT_OPTIONS: 'defaultOptionProducts',
				DISPLAY_ACTIONS: 'displayActions',
				DISPLAY_COLUMNS: 'displayColumns',
				GRAND_TOTAL: 'grandTotal',
				MINI_CART: 'minicart',
				OPTION_GROUPS: 'optionGroups',
				OPTION_LINES: 'optionLines',
				PRICE_RAMPS: 'priceRamps',
				PRICES: 'prices',
				PRODUCT_FILTERS: 'productFilters',
				PRODUCT_INFORMATION: 'productInformation',
				RULE_ACTIONS: 'ruleActions',
				TOTAL_ITEMS: 'totalItems',
				USAGE_PRICE_TIERS: 'usagePriceTiers'
			};

			/** Attach public methods */
			service.createAssetActionRequest = createAssetActionRequest;
			service.createCartRequestDO = createCartRequestDO;
			service.createCatalogRequestDO = createCatalogRequestDO;
			service.getConfigurationData = getConfigurationData;
			service.getCustomSettings = getCustomSettings;
			service.getDisplayActions = getDisplayActions;
			service.getDisplayColumns = getDisplayColumns;
			service.getSObjectSummary = getSObjectSummary;
			service.requestBasePromise = requestBase1;
			service.CartPageUrl = null;


			/* -- Method declarations */

			/**
			 * Make a call to get all configuration data from server. For now, uses
			 * 	a list of default things to retreieve.
			 * @return {JSON} product configuration information
			 */
			function getConfigurationData() {
				if (configurationData) {
					return $q.when(configurationData);

				} else if (configurationRequestPromise) {
					return configurationRequestPromise;

				}
				var includes = [
				                'customSettings',
				                'displayActions',
				                'displayColumns'
				                ];

				//var dataRequest = createCatalogRequestDO(null, null, null, includes, null);
				var dataPromise = createCatalogRequestDO(null, null, null, includes, null).then(function(dataRequest){
					return RemoteService.getConfigurationData(dataRequest);
				});
				
				configurationRequestPromise = dataPromise.then(function (result) {
					//Extend will add references to any properties in the result
					//Returns a reference to first param

					if ( result.customSettings.systemProperties.CartPageUrl ) {
						var queryStr = '?id=' + requestBase.cartId + '&configRequestId=' + requestBase.configRequestId;
						service.CartPageUrl= result.customSettings.systemProperties.CartPageUrl + queryStr;
					}
					
					configurationData = {};
					return angular.extend(configurationData, result);

				});
				return configurationRequestPromise;

			}

			function getDisplayColumns() {
				return getConfigurationData().then(function (result) {
					return result.displayColumns;

				});

			}

			function getDisplayActions() {
				return getConfigurationData().then(function (result) {
					return result.displayActions;

				});

			}

			function getCustomSettings() {
				return getConfigurationData().then(function (result) {
					return result.customSettings;

				});

			}

			/**
			 * Mini-page layout for a particular business object id
			 */
			function getSObjectSummary(businessObjectId) {
				return $http.get('/'+businessObjectId+'/m?isAjaxRequest=1').then(function (response) {
					return response.data;

				});

			}
			
			/**
			 * Catalog request constructor
			 */
			function createCatalogRequestDO(categoryIds, searchText, productFilters, responseIncludes, products) {
				return service.requestBasePromise.then(function(requestBase){
					return setupCatalogRequestDO(categoryIds, searchText, productFilters, responseIncludes, products, requestBase);
				});
					
			}
			
			/**
			 * Catalog request constructor
			 */
			function setupCatalogRequestDO(categoryIds, searchText, productFilters, responseIncludes, products, requestBase) {
				searchText = searchText || "";
				categoryIds = categoryIds || [];

				if(!products) {
					products = [];
				}

				if (!categoryIds) {
					categoryIds = [];

				} else if (typeof categoryIds === 'string') {
					//Split on spaces and/or commas
					var separatorRegex = /[\s,]+/;
					categoryIds = categoryIds.trim().split(separatorRegex);

				}
				if (!responseIncludes) {
					responseIncludes = [
					                    "prices",
					                    "productFilters"
					                    ];

				}
				if (!productFilters) {
					productFilters = [];

				}

				//Establish request object with defaults
				var catalogRequest = {
						"cartId": requestBase.cartId,
						"configRequestId": requestBase.configRequestId,
						"priceListId": requestBase.priceListId,
						"categoryIds": categoryIds,
						"productSearchInfo": {
							"orderByFields": [],
							"searchAllProducts": false,
							"searchFields": [
							                 "Name",
							                 "ProductCode",
							                 "Family"
							                 ],
							                 "productFilters": angular.copy(productFilters),
							                 "searchText": searchText

						},
						"responseIncludes": responseIncludes,
						"products": angular.copy(products)

				};

				return catalogRequest;

			}

			function createAssetActionRequest(requestObject) {
				if (!requestObject.lineItems) {
					requestObject.lineItems = [];

				} else if (typeof requestObject.lineItems === 'object' && requestObject.lineItems.hasOwnProperty('lineItemSO')) {
					requestObject.lineItems = [requestObject.lineItems];
				}

				if (!requestObject.responseIncludes) {
					requestObject.responseIncludes = [];
				}

				var request = {};
				request.cartId = requestBase.cartId;
				request.lineItems = requestObject.lineItems;
				request.responseIncludes = requestObject.responseIncludes;

				// if assetLineItems exists
				if (requestObject.assetLineItems) {
					request.assetLineItems = requestObject.assetLineItems;
				}

				return request;
			}

			/**
			 * Cart request constructor
			 */
			function createCartRequestDO(lineItems, totalItems, applyConstraintRules, updatePrice, responseIncludes, filterSchema) {
				return service.requestBasePromise.then(function(requestBase){
					return setupCartRequestDO(lineItems, totalItems, applyConstraintRules, updatePrice, responseIncludes, filterSchema, requestBase);
				});
				
			}

			/**
			 * Cart request constructor
			 */
			function setupCartRequestDO(lineItems, totalItems, applyConstraintRules, updatePrice, responseIncludes, filterSchema, requestBase) {
				updatePrice = (typeof updatePrice === "undefined" ? false : !!updatePrice);
				applyConstraintRules = (typeof applyConstraintRules === "undefined" ? false : !!applyConstraintRules);
				/**
				 * 
				 * @return {[type]}            [description]
				 */
				if (!lineItems) {
					lineItems = [];

				} else if (typeof lineItems === 'object' && lineItems.hasOwnProperty('lineItemSO')) {
					lineItems = [lineItems];

				}

				if(!totalItems) {
					totalItems = [];
				}
				if (!responseIncludes) {
					responseIncludes = [
					                    "cart",
					                    "cartLines",
					                    "optionLines",
					                    "chargeLines",
					                    "totalItems",
					                    "ruleActions",
					                    "grandTotal"
					                    ];

				}

				var cartRequest = {
						"cartId": requestBase.cartId,
						"configRequestId": requestBase.configRequestId,
						"lineItems": lineItems,
						"responseIncludes": responseIncludes,
						"applyConstraintRules": applyConstraintRules,
						"updatePrice": updatePrice,
						"filterSchemas": filterSchema,
						"totalItems": angular.copy(totalItems)
				};

				return cartRequest;

			}

		}

	}
})();			
