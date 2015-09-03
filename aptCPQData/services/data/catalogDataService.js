;(function() {
	angular.module('aptCPQData')
		.service('CatalogDataService', CatalogDataService); 

	CatalogDataService.$inject = ['$q', '$log', '$http', 'ConfigurationDataService', 'aptBase.RemoteService', 'aptBase.UtilService', 'CatalogCache'];

	function CatalogDataService($q, $log, $http, ConfigurationDataService, RemoteService, UtilService, CatalogCache) {
		var service = this;
		var categoryRequestPromise;
		var productSummaryId;

		service.transactionJSON = {};

		//Create a catalog request structure, points to ConfigurationDataService
		service.createCatalogRequestDO = ConfigurationDataService.createCatalogRequestDO;

		//Category methods
		service.getCategories = getCategories;
		service.getCatById = getCatById;
		service.getCategory = getCatById;
		service.getAncestors = getAncestors;
		service.getBreadcrumb = getBreadcrumb;

		//Product methods
		service.getCategoryIdsForLeaves = getCategoryIdsForLeaves;
		service.getCategoryTreeForLeaves = getCategoryTreeForLeaves;
		service.searchProducts = searchProducts;
		service.getProductById = getProductById;
		service.getProductsByIds = getProductsByIds;
		service.getProductFilters = getProductFilters;
		service.getProductFiltersForCategory = getProductFiltersForCategory;
		service.getExculdedProductIds = getExculdedProductIds;
		service.isProductSummaryOpen;
		service.getProductSummary = getProductSummary;
		service.setProductSummaryId = setProductSummaryId;
		service.getProductSummaryId = getProductSummaryId;

		/**
		 * Get all categories.
		 * If the cache is valid, return immediately with cached categories.
		 * 	Else, make the remote request and load categories into the cache,
		 * 	then return the result.
		 *
		 * Adding in a service variable categoryRequestPromise so that if multiple
		 * 	calls to getCategories are made before the first request comes back,
		 * 	only a single request is submitted.
		 * 
		 */
		function getCategories() {
			if (CatalogCache.isValid) {
				var cachedCategories = CatalogCache.getCategories();
				return $q.when(cachedCategories);

			} else if (categoryRequestPromise) {
				return categoryRequestPromise;

			}
			var responseIncludes = [];
			var requestPromise = service.createCatalogRequestDO(null, null, null, responseIncludes, null).then(function(categoryRequest){
				return RemoteService.getCategories(categoryRequest);
			});
			
			categoryRequestPromise = requestPromise.then(function(response) {
				CatalogCache.initializeCategories(response.categories);
				return CatalogCache.getCategories();

			});
			return categoryRequestPromise;

		}

		/**
		 * Get a category by its id.
		 * For now, this is just done by ensuring all categories have been
		 * 	retrieved, then ask the cache for a particular id. 
		 * 
		 */
		function getCatById(categoryId) {
			return getCategories().then(function(result) {
				return CatalogCache.getCategoryById(categoryId);

			});


		}	

		/**
		 * Get the array of ancestor categories for a particular category.
		 * For now, this is just done by ensuring all categories have been
		 * 	retrieved, then ask the cache for a particular lineage. 
		 * 
		 */
		function getAncestors(categoryId) {
			return CatalogCache.getAncestors(categoryId);

		}

		function getBreadcrumb(categoryId) {
			return getCategories().then(function(result) {
				return CatalogCache.getAncestors(categoryId);
			});
		}

		/**
		 * Get set of all categories that should be present in the tree when
		 * 	only a particular set of eaves should be included.
		 * 	
		 * @param  {[type]} leafIds [description]
		 * @return {[type]}         [description]
		 */
		function getCategoryIdsForLeaves(leafIds) {
			return getCategories().then(function(result) {
				//External code expects promise to resolve with a response object 
				//	instead of the actual array. This isn't how we want it. 
				var response = {};
				response.resultCategories = CatalogCache.getAncestorIdSet(leafIds);
				return response;
			});

		}

		function getCategoryTreeForLeaves(leafIds) {
			return [];

		}

		function getProductById(productId) {
			var product = CatalogCache.getProductById(productId);
			return $q.when(product);

		}

		/**
		 * returns products for given ids 
		 */
		function getProductsByIds(productIds) {
			var productIdArr = [].concat(productIds);
			var products = [];
			var productIdsNotInCache = [];

			for (var productIndex = 0; productIndex < productIdArr.length; productIndex++) {
				var productDO = CatalogCache.getProductById(productIdArr[productIndex]);
				if (UtilService.isEmpty(productDO)) {
					productIdsNotInCache.push(productIdArr[productIndex]);

				} else {
					products.push(productDO);

				}

			}

			if (productIdsNotInCache.length == 0) {
				return $q.when({"products": products});
			}

			includeParams = ['prices'];

			var resultPromise = service.createCatalogRequestDO(null, null, null, includeParams, null).then(function(catalogRequest){
				catalogRequest.productIds = productIdsNotInCache;
				return RemoteService.getProductsByIds(catalogRequest);
				
			});
			
			return resultPromise.then(function (result) {
				//TODO: put into cache
				angular.forEach(result, function(value, key){
					products.push(value);
				});
				return {"products": products};

			});


		}

		function getProductFiltersForCategory(categoryId) {
			var cachedFilters = CatalogCache.getProductFiltersForCategory(categoryId);
			if (cachedFilters) {
				return $q.when(cachedFilters);

			}
			includeParams = ['productFilters'];
			
			var filterPromise = service.createCatalogRequestDO(categoryId, null, null, includeParams, null).then(function(searchRequest){
				return RemoteService.searchProducts(searchRequest);
			});
			 
			return filterPromise.then(function (result) {
				CatalogCache.putProductFiltersForCategory(categoryId, result.productFilters);
				return CatalogCache.getProductFiltersForCategory(categoryId);

			});

		}

		/**
		 * Returns Excluded ProductIds for current display page
		 * @param {string} category Id
		 * @param {array<object>} Products for current catalog page
		 */
		function getExculdedProductIds(categoryId, products) {
			var deferred = $q.defer();
			var productsForCategory;

			if(products) {
				productsForCategory = products;
			
			} else {
				productsForCategory = CatalogCache.getProductsForCategory(categoryId);
			
			}

			var contextProductIds = [];
			
			if(!productsForCategory  || productsForCategory.length === 0) {
				return $q.when([]);

			}

			for(var productIndex = 0; productIndex < productsForCategory.length; productIndex++) {
				contextProductIds.push(productsForCategory[productIndex].productSO.Id)
			
			}
			
			return ConfigurationDataService.requestBasePromise.then(function(requestBase){
				return RemoteService.getExcludedProductIds(requestBase.cartId, contextProductIds).then(function(result) {
					return result;
				});
			});	
			

		}


		/**
		 * Search for products
		 * @param  {string or object} searchText    text or searchRequest object
		 * @param  {array<string>} categoryId   ids of category to search in
		 * @param  {array<object>} searchText text to match
		 * @param  {array<object>} productFilters filters to apply
		 */
		function searchProducts(categoryId, searchText, productFilters) {
			// Using ugly string checking to see whether product filters are being used 
			var isProductFilterSelected = productFilters ? (JSON.stringify(productFilters).indexOf('"isSelected":true') >= 0) : false;
			var hasSearchText = searchText && searchText.length && searchText.length > 0;
			if (!hasSearchText && !isProductFilterSelected) {
				var cachedProducts = CatalogCache.getProductsForCategory(categoryId);
				if (cachedProducts) {
					$log.debug('Search Products: Returning cached products.');
					var response = {
							"products": cachedProducts,
							"resultCategoryIds": [categoryId]
					};
					return $q.when(response);

				}

			}
			var includeParams = ['prices', 'defaultOptionProducts'];
			if (!CatalogCache.getProductFiltersForCategory(categoryId)) {
				includeParams.push('productFilters');

			}
			
			var requestPromise = service.createCatalogRequestDO(categoryId, searchText, productFilters, includeParams, null).then(function(searchRequest){
				return RemoteService.searchProducts(searchRequest);
			});
								
			return requestPromise.then(function(response) {
				CatalogCache.putProducts(response.products);
				if (response.productFilters) {
					CatalogCache.putProductFiltersForCategory(categoryId, response.productFilters);

				}
				return response;	

			});

		}


		/**
		 * Experimental method that does filtering in javascript
		 * @param  {[type]} categoryId     [description]
		 * @param  {[type]} searchText     [description]
		 * @param  {[type]} productFilters [description]
		 * @return {[type]}                [description]
		 */
		function queryForProducts(categoryId, searchText, productFilters) {
			var deferred = $q.defer();
			setTimeout(function () {
				filteredCachedProducts = filterCachedProducts(categoryId, searchText, productFilters);
				deferred.resolve(filteredCachedProducts);

			}, 0);
			return deferred.promise.then(function (cacheResult) {
				var productResponse = {};
				if (cacheResult) {
					productResponse.products = cacheResult;
					return productResponse;

				}
				var includeParams = ['prices', 'defaultOptionProducts'];
				//includeParams.push('productFilters');
				return service.createCatalogRequestDO(categoryId, searchText, productFilters, includeParams, null).then(function(productRequest){
					return RemoteService.searchProducts(productRequest).then(function (response) {
						CatalogCache.putProducts(response.products);
						return response;
					});

				});
				
			});

		}

		function filterCachedProducts(categoryId, searchText, productFilters) {
			var cachedProducts = CatalogCache.getProductsForCategory(categoryId);
			if (!cachedProducts || cachedProducts.length > 1000) {
				return null;

			}
			var filteredProducts = [];
			var nextProduct;
			for (var prodIndex = 0, prodLength = cachedProducts.length - 1; prodIndex < prodLength; prodIndex++) {
				nextProduct = cachedProducts[prodIndex];
				if (checkIfProductMeetsFilter(nextProduct, searchText, productFilters)) {
					filteredProducts.push(nextProduct);

				}

			}
			return filteredProducts;

		}

		function checkIfProductMeetsFilter(product, searchText, productFilters) {
			var isMet = true;
			if (searchText) {
				var searchFields = ConfigurationDataService.defaultSearchFields;
				var matchFound = false;
				var nextField;
				for (var fieldIndex = searchFields.length - 1; fieldIndex >= 0; fieldIndex--) {
					nextField = searchFields[fieldIndex];
					if (typeof nextField === 'string' && nextField.indexOf(searchText) >= 0) {
						matchFound = true;
						break;

					}

				}
				isMet = matchFound;

			}
			if (isMet && productFilters) {


			}
			return isMet;

		}


		function getProductFilters() {
			return $q.when([]);

		}

		/**
		 * Return product summary for productId 
		 * @param {string} productId 
		 */

		function getProductSummary(productId) {
			if(productId) {
				return ConfigurationDataService.getSObjectSummary(productId).then(function(result) {
					return result;
				});
			}	
			
		}

		/**
		 * Set selected product Id for product summary
		 * @param {string} productId
		 */
		function setProductSummaryId(productId) {
			productSummaryId = productId;
			service.isProductSummaryOpen = true;

		}

		/**
		 * Return selected product Id for product summary
		 */
		function getProductSummaryId() {
			return $q.when(productSummaryId);
		}

	}

})();

