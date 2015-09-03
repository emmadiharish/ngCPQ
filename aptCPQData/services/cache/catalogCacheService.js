;(function() {
	angular.module('aptCPQData')
		.service('CatalogCache', CatalogCache); 

	CatalogCache.$inject = ['$log'];

	/**
	 * Structure for storing and updating catalog data
	 */
	function CatalogCache($log) {
		var cache = this;
		var topCategories, idToCategoryMap, leafLineageMap;
		var idToProductMap, categoryToProductsMap, categoryToProductFiltersMap;

		cache.initializeCategories = initializeCategories;
		cache.putProducts = putProducts;
		cache.getCategories = getCategories;
		cache.getCategoryById = getCategoryById;
		cache.getAncestorIdSet = getAncestorIdSet;
		cache.getAncestors = getAncestors;
		cache.getProductById = getProductById;
		cache.getProductsForCategory = getProductsForCategory;
		cache.getProductsForCategories = getProductsForCategories;
		cache.putProductFiltersForCategory = putProductFiltersForCategory;
		cache.getProductFiltersForCategory = getProductFiltersForCategory; 

		//Initialize
		init();
		
		function init() {
			resetCategories();
			resetProducts();

		}

		function resetCategories() {
			cache.isValid = false;
			topCategories = [];
			idToCategoryMap = {};
			leafLineageMap = {};

		}

		function resetProducts() {
			idToProductMap = {};
			categoryToProductsMap = {};
			categoryToProductFiltersMap = {};

		}

		/**
		 * Initialize categories with data.
		 * Parse through a category response and build:
		 * 	- Map from category Id to category objects
		 * 	- Map from leaf category Id to array of ancestory Ids
		 * 	
		 */
		function initializeCategories(categoryData) {
			var categoryStack, currentCategory, currentId, currentChildren, 
					lineageStack, lineageArray;

			//Reset to categories to empty state
			resetCategories();
			if (!categoryData) {
				return;

			}
			topCategories = categoryData;
			//Put all top-level categories in the stack
			categoryStack = topCategories.slice();
			lineageStack = [];
			while(categoryStack.length > 0) {
				currentCategory = categoryStack.pop();
				currentId = currentCategory.nodeId;
				currentChildren = currentCategory.childCategories;
				idToCategoryMap[currentId] = currentCategory;
				//Can check for leaf status by looking at chilren array or "leaf" field
				//if (currentChildren && currentChildren.length > 0) {
				if (lineageStack.length > currentCategory.nodeLevel) {
					lineageStack.pop();

				}
				//Copy lineage array
				lineageArray = lineageStack.slice();
				leafLineageMap[currentId] = lineageArray;
				if (!currentCategory.leaf) {
					lineageStack.push(currentId);
					Array.prototype.push.apply(categoryStack, currentChildren);

				} 

			}
			//Set the cache to be valid
			cache.isValid = true;

		}

		function getCategories() {
			if (!cache.isValid) {
				return null;

			}
			return topCategories;

		}

		function getCategoryById(catId) {
			if (!catId || !cache.isValid) {
				return null;

			}
			return idToCategoryMap[catId];

		}

		/** Do lookup of lineage array */
		function getAncestors(catId) {
			if (!cache.isValid || !catId) {
				return [];
				
			}
			var ancestorIds = leafLineageMap[catId];
			if (!ancestorIds) {
				return [];
				
			}
			var ancestorCats = [];
			var nextCat;
			for (var idIndex = 0, idLength = ancestorIds.length; idIndex < idLength; idIndex ++) {
				nextCat = idToCategoryMap[ancestorIds[idIndex]];
				if (nextCat) {
					ancestorCats.push(nextCat);

				}

			}
			ancestorCats.push(idToCategoryMap[catId]);
			return ancestorCats;

		}


		/** Do lookup of lineage array */
		/** Should this be handled in catalog services instead? */
		function getAncestorIdSet(leafIds) {
			if (!cache.isValid) {
				return null;

			}
			if (!leafIds) {
				return {};

			}
			var ancestorCatIds = {};
			var nextCat;
			for (var idIndex = 0, idLength = leafIds.length; idIndex < idLength; idIndex ++) {
				var nextLeafId = leafIds[idIndex];
				ancestorCatIds[nextLeafId] = true;
				var ancestors = leafLineageMap[nextLeafId];
				if (angular.isDefined(ancestors)) {
					for (var ancestorIndex = 0, ancestorLength = ancestors.length; ancestorIndex < ancestorLength; ancestorIndex ++) {
						ancestorCatIds[ancestors[ancestorIndex]] = true;

					}
				
				}

			}
			return ancestorCatIds;

		}

		/**
		 * Merge product JSON into the cache. A product response should include
		 * 	information about which categories the product belongs to so that
		 * 	we can retrieve products by cateogory id as well as by product id. 
		 * 	
		 * @param  {json structure} productData 
		 */
		function putProducts(productData) {
			var nextProduct, existingProduct;
			if (!productData) {
				return;

			}
			for (var prodIndex = 0, prodlength = productData.length; prodIndex < prodlength; prodIndex ++) {
				nextProduct = productData[prodIndex];
				existingProduct = idToProductMap[nextProduct.productSO.Id];
				
				if (!existingProduct && angular.isDefined(nextProduct)) {
					idToProductMap[nextProduct.productSO.Id] = nextProduct;
					for (var catIndex = 0, catLength = nextProduct.categoryIds.length; catIndex < catLength; catIndex ++) {
						if (!categoryToProductsMap[nextProduct.categoryIds[catIndex]]) {
							categoryToProductsMap[nextProduct.categoryIds[catIndex]] = [];

						}
						categoryToProductsMap[nextProduct.categoryIds[catIndex]].push(nextProduct.productSO.Id);
					
					}

				} else {
					//May want to try merging product objects to store more info
					
				}

			}

		}

		function putProductFiltersForCategory(categoryId, productFilters) {
			if(!categoryId || typeof categoryId !== 'string') {
				return; 
			}
			
			categoryToProductFiltersMap[categoryId] = productFilters;

		}


		/**
		 * Get products objects for a category by the category's id. This will
		 * 	call the tree traversal for non-leaf nodes to create cached list of
		 * 	the products present at the leaf level.
		 * 	 
		 * @param  {id string} categoryId 	id of category
		 * @return {array of product objects}
		 */
		function getProductsForCategory(categoryId) {
			var foundProductList = [];
			if (!cache.isValid || !categoryId) {
				return null;

			}
			var catObject = idToCategoryMap[categoryId];
			if (!catObject) {
				return null;

			}
			var catProducts = traverseCategoriesForProductIds(catObject);
			if (!catProducts) {
				return null;

			}
			var foundProductIds = {};
			for (var prodIndex = 0, prodLength = catProducts.length; prodIndex < prodLength; prodIndex ++) {
				var productId = catProducts[prodIndex];
				if (!foundProductIds[productId]) {
					foundProductIds[productId] = true;
					foundProductList.push(idToProductMap[productId]);
					
				}


			}
			return foundProductList;
			
		}


		/**
		 * Recursively build association between categories and the products
		 * 	the inherit from their children. 
		 * 	
		 * Traversal alwa this information using the 
		 * 	categoryToProductsMap to avoid redundant traversals.
		 * 	
		 * @param  {category object} rootCategory 	where to start traversing
		 * @return {array of products ids}              [description]
		 */
		function traverseCategoriesForProductIds(rootCategory) {
			// $log.debug('Traversing');
			if (!rootCategory || !rootCategory.nodeId) {
				return null;

			}
			// $log.debug('  ' + rootCategory.nodeId, '  ' + rootCategory.nodeLevel);
			var foundProductIds = categoryToProductsMap[rootCategory.nodeId];
			// Can return if the categories for this level: 
			// 	* have already been put together, so they're valid
			// 	* this is is a leaf, whether or not products are mapped to the leaf
			if (foundProductIds || rootCategory.leaf) {
				return foundProductIds;

			}
			foundProductIds = [];
			var children = rootCategory.childCategories;
			var nextChild, childProducts;
			for (var childIndex = 0, childrenLength = children.length; childIndex < childrenLength; childIndex++) {
				nextChild = children[childIndex];
				childProducts = traverseCategoriesForProductIds(nextChild);
				//If a child has not had it's products loaded, can't return a result
				if (!childProducts) {
					return null;

				}
				foundProductIds = foundProductIds.concat(childProducts);

			}
			categoryToProductsMap[rootCategory.nodeId] = foundProductIds;
			return foundProductIds;

		}
		
		function getFilteredProductsForCategory(categoryId, searchText, productFilters) {
			if (!cache.isValid) {
				return null;

			}
			return categoryToProductsMap[categoryId];
			
		}

		function getProductById(productId) {
			if (!cache.isValid) {
				return null;
			
			}
			return idToProductMap[productId];

		}

		function getProductFiltersForCategory(categoryId) {
			if (!cache.isValid) {
				return null;
			
			}

			var catFilters = categoryToProductFiltersMap[categoryId];
			if (!catFilters) {
				return null;
			
			}
			
			return angular.copy(catFilters);

		}



		/** Should this be handled in catalog services instead? */
		function getProductsForCategories(categoryIds) {
			if (!cache.isValid) {
				return null;

			}
			if (!categoryIds || !categoryIds.length) {
				return [];
				
			}
			var foundProductIds = {};
			var foundProductList = [];
			var categoriesWithoutProducts = [];
			for (var catIndex = 0, catLength = categoryIds.length; catIndex < catLength; catIndex ++) {
				var categoryId = categoryIds[catIndex];
				if (categoryToProductsMap[categoryId]) {
					var catProducts = categoryToProductsMap[categoryId];
					for (var prodIndex = 0, prodLength = catProducts.length; prodIndex < prodLength; prodIndex ++) {
						var productId = catProducts[prodIndex];
						if (!foundProductIds[productId]) {
							foundProductIds[productId] = true;
							foundProductList.push(idToProductMap[productId]);

						}

					}

				} else {
					categoriesWithoutProducts.push(categoryId);

				}

			}

			return foundProductList;

		}

	}

})();