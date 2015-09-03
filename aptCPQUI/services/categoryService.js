(function() {
  angular.module('aptCPQUI').service('CategoryService', [
    'CatalogDataService', 'CategoryDataService', 'ProductDataService', 'ProductFilterDataService', function(CatalogService, CategoryDataService, ProductData, ProductFilterDataService) {
      var CategoryServiceRef = this;
      CategoryServiceRef.contextProductIds;
      CategoryServiceRef.excludedProductIds = [];
      this.setCurrentCategory = function(categoryID) {
        this.id = categoryID;
        return CategoryDataService.getCategory(categoryID).then((function(_this) {
          return function(category) {
            _this.current = category;
            return ProductFilterDataService.getFiltersFor(categoryID).then(function(filters) {
              _this.filters = filters;
              return _this.updateProducts();
            });
          };
        })(this));
      };
      this.updateProducts = function() {
        return ProductData.searchProducts(this.id, this.searchText, this.filters).then((function(_this) {
          return function(result) {
            return _this.products = result.products;
          };
        })(this));
      };

      this.getExcludedProductsInContext = function() {
        return CategoryDataService.getExculdedProductIds(CategoryServiceRef.id, CategoryServiceRef.contextProductIds).then(function(productIds) {
          Array.prototype.splice.apply(CategoryServiceRef.excludedProductIds, [0,CategoryServiceRef.excludedProductIds.length].concat(productIds));
          return CategoryServiceRef.excludedProductIds;

        });
      }

      return this;
    }
  ]);

}).call(this);
