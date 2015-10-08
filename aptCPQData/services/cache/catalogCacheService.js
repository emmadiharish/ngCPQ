/**
 * Service: CatalogCache
 * 	Keeps collections for categories
 */
;(function() {
	'use strict';
	
	angular.module('aptCPQData').service('CatalogCache', CatalogCache); 

	CatalogCache.$inject = ['$log', 'lodash', 'systemConstants'];

	/**
	 * Structure for storing and updating catalog data
	 */
	function CatalogCache($log, _, systemConstants) {
		var cache = this;
		var topCategories, idToCategoryMap, leafLineageMap;
		var idToProductMap, categoryToProductsMap, categoryToProductFiltersMap;
		var categoryLeafNodesMap = {};

		cache.initializeCategories = initializeCategories;
		cache.putProducts = putProducts;
		cache.getCategories = getCategories;
		cache.getCategoryById = getCategoryById;
		cache.getAncestorIdSet = getAncestorIdSet;
		cache.getAncestors = getAncestors;
		cache.getProductById = getProductById;
		cache.getProductsForCategory = getProductsForCategory;
		//cache.getProductsForCategories = getProductsForCategories;
		cache.putProductFiltersForCategory = putProductFiltersForCategory;
		cache.getProductFiltersForCategory = getProductFiltersForCategory; 
		cache.getLeafNodesForCategory = getLeafNodesForCategory;

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
				// Check for invalid category object
				if (!currentId) {
					lineageStack.pop();

				}
				currentChildren = currentCategory.childCategories;
				idToCategoryMap[currentId] = currentCategory;
				//Copy lineage array
				lineageArray = lineageStack.slice();
				leafLineageMap[currentId] = lineageArray;
				if (currentChildren && currentChildren.length) {
					categoryStack.push({}); // Use empty object to represent gap between parent categories
					lineageStack.push(currentId);
					Array.prototype.push.apply(categoryStack, currentChildren);

				} 

			}

			//create parent and leaf node map, uses idToCategoryMap
			setCategoryLeafNodes(topCategories);

			//Set the cache to be valid
			cache.isValid = true;

		}
		
		/**
		 * populates parent node leaf node map
		 */
		function setCategoryLeafNodes(categories) {
			_.forEach(categories, function(category, key){
				if (category.leaf == false) {
					setCategoryLeafNodes(category.childCategories);
					
				} else {
					var parentId = category.parentId;
					if (angular.isDefined(parentId) && parentId !== null) {	
						categoryLeafNodesMap[parentId] = (categoryLeafNodesMap[parentId] || []);
						categoryLeafNodesMap[parentId].push(category.nodeId);
					}

				}
				
			});
			
			setParentLeafNodes(Object.keys(categoryLeafNodesMap));
			
		}
		
		/**
		 * populates parent node leaf node map
		 */
		function setParentLeafNodes(parentCategoryIds) {
			var grandParentIds = {}; 
			_.forEach(parentCategoryIds, function(categoryId, index) {
				var category = idToCategoryMap[categoryId];
				var parentId = category.parentId;
				if (angular.isDefined(parentId) && parentId !== null) {	
					categoryLeafNodesMap[parentId] = (categoryLeafNodesMap[parentId] || []);
					categoryLeafNodesMap[parentId] = categoryLeafNodesMap[parentId].concat(categoryLeafNodesMap[category.nodeId] || []);
					grandParentIds[parentId] = true;
					
				}
			});
			
			var grandParentIdList = Object.keys(grandParentIds);
			if (grandParentIdList.length > 0) {
				setParentLeafNodes(grandParentIdList);
			}
				
		}
		
		/**
		 * returns leaf node for category
		 */
		function getLeafNodesForCategory(categoryId) {
			var leafNodes = categoryLeafNodesMap[categoryId];
			if (leafNodes && leafNodes.length == 0) {
				if (idToCategoryMap[categoryId].leaf) {
					return [].concat(categoryId);
				} //else throw error
				
			}
			return leafNodes;
			
		}

		
		function getCategories() {
			if (!cache.isValid) {
				return null;

			}
			//hide single top category
			if (topCategories.length === 1 
					&& topCategories[0].leaf === false 
					&& systemConstants.customSettings.catalogPageSettings.HideSingleTopCategory === true) {
				return topCategories[0].childCategories;
				
			} else {
				return topCategories;
				
			}

		}

		function getCategoryById(categoryId) {
			if (!categoryId || !cache.isValid) {
				return null;

			}
			return idToCategoryMap[categoryId];

		}

		/** Do lookup of lineage array */
		function getAncestors(categoryId) {
			if (!cache.isValid || !categoryId) {
				return [];
				
			}
			var ancestorIds = leafLineageMap[categoryId];
			if (!ancestorIds) {
				return [];
				
			}
			var ancestorCats = [];
			var nextCat;
			for (var idIndex = 0, idLength = ancestorIds.length; idIndex < idLength; idIndex ++) {
				nextCat = idToCategoryMap[ancestorIds[idIndex]];
				if (nextCat) {
					if (idIndex === 0 && topCategories.length === 1  
							&& nextCat.leaf === false 
							&& systemConstants.customSettings.catalogPageSettings.HideSingleTopCategory === true) {
						//$log.debug('hiding single top category', nextCat.label);
						
					} else {	
						ancestorCats.push(nextCat);
						
					}

				}

			}
			ancestorCats.push(idToCategoryMap[categoryId]);
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
			var ancestorCategoryIds = {};
			var nextCat;
			for (var idIndex = 0, idLength = leafIds.length; idIndex < idLength; idIndex ++) {
				var nextLeafId = leafIds[idIndex];
				ancestorCategoryIds[nextLeafId] = true;
				var ancestors = leafLineageMap[nextLeafId];
				if (angular.isDefined(ancestors)) {
					for (var ancestorIndex = 0, ancestorLength = ancestors.length; ancestorIndex < ancestorLength; ancestorIndex ++) {
						ancestorCategoryIds[ancestors[ancestorIndex]] = true;

					}
				
				}

			}
			return ancestorCategoryIds;

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
							categoryToProductsMap[nextProduct.categoryIds[catIndex]] = categoryToProductsMap[nextProduct.categoryIds[catIndex]] || [];

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
			
			var catProducts = []; 
			if (catObject.leaf) {
				catProducts = catProducts.concat(categoryToProductsMap[categoryId] || []);
				
			} else {
				_.forEach(categoryLeafNodesMap[categoryId], function(leafCategoryId, index){
					catProducts = catProducts.concat(categoryToProductsMap[leafCategoryId] || []);
				});
				
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
			
			//return angular.copy(catFilters);
			
			return catFilters;

		}

	}

})();