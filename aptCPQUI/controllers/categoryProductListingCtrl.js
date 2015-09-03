(function() {
  var CategoryProductListingCtrl;

  CategoryProductListingCtrl = function(_, i18nService, Category, CartDataService) {
    var listingCtrl = this;
    listingCtrl.category = Category;
    listingCtrl.products = listingCtrl.category.products;
    listingCtrl.productsInCurrentPage = [];
    listingCtrl.labels = i18nService.CustomLabel;
    listingCtrl.addSelectedToCart = addSelectedToCart;
    listingCtrl.getProductSONames = getProductSONames;
    listingCtrl.getProductSOs = getProductSOs;
    listingCtrl.selectAll = selectAll;
    listingCtrl.allSelected = allSelected;
    listingCtrl.selectOne = selectOne;
    listingCtrl.excludedProductIds = Category.excludedProductIds;
    listingCtrl.pageChanged = pageChanged;
    listingCtrl.itemsPerPage = 10;
    listingCtrl.currentPage = 1;

    getExcludeProductIds();


    return listingCtrl;

    function getExcludeProductIds() {
      getContextProductsForCurrentPage();
      listingCtrl.category.getExcludedProductsInContext();
    
    };

    function getContextProductsForCurrentPage() {
      var Start = (listingCtrl.currentPage - 1) * listingCtrl.itemsPerPage;
      var End = Start + listingCtrl.itemsPerPage;
      listingCtrl.category.contextProductIds = listingCtrl.products.slice(Start, End);
      return listingCtrl.category.contextProductIds;
    
    }

    function pageChanged(newPage) {
      listingCtrl.currentPage = newPage;
      getExcludeProductIds();
        
    };



    function addSelectedToCart() {
      var selectedProducts = buildSelectedList();
      if (selectedProducts.length > 0) {
        CartDataService.addToCart(selectedProducts);
        
      }

    }
    
    function compareSelected() {
      var selectedProducts = buildSelectedList();
      if (selectedProducts.length > 0) {
        //Travel to compare state?
        $log.info('Compare Selected Products: ', selectedProducts);
      }

    }

    function buildSelectedList() {
      var selectedProducts = [];

      _.each(listingCtrl.productsInCurrentPage, function (product) {

        if (product.select) {
          selectedProducts.push(product);
          product.select = false;
        }
      });
      return selectedProducts;

    }

    function getProductSONames(product){
      var productSONames = [];
      _.each(product['defaultOptionProducts'], function(item){
        productSONames.push(item['productSO']['Name']);
      });
      return productSONames;
    }

    function getProductSOs(product){
      var productSOs = [];
      _.each(product['defaultOptionProducts'], function(item){
        productSOs.push(item['productSO']);
      });
      return productSOs;
    }


    function initProductsInCurrentPage(){
      listingCtrl.productsInCurrentPage = getContextProductsForCurrentPage();
    }

    function selectAll() {
      if(!listingCtrl.category){
        return;
      }

      initProductsInCurrentPage();

      var newValue = !listingCtrl.allSelected();

      _.each(listingCtrl.productsInCurrentPage, function (product) {
        
        if(listingCtrl.excludedProductIds.indexOf(product.productSO.Id) == -1) {
          product.select = newValue;
        }
        
      });
    }

    function allSelected() {

      if(!listingCtrl.category){
        return;
      }

      initProductsInCurrentPage();

      var needsMet = _.reduce(listingCtrl.productsInCurrentPage, function (memo, product) {
        return memo + (product.select ? 1 : 0);
      }, 0);

      return (needsMet === (listingCtrl.productsInCurrentPage.length - listingCtrl.excludedProductIds.length));
    }

    function selectOne(){
      if(!listingCtrl.category){
        return;
      }

      initProductsInCurrentPage();

      var needsMet = _.reduce(listingCtrl.productsInCurrentPage, function (memo, product) {
        return memo + (product.select ? 1 : 0);
      }, 0);
      return (needsMet !== 0);
    }

  };

  CategoryProductListingCtrl.$inject = [
    'lodash',
    'aptBase.i18nService',
    'CategoryService',
    'CartDataService'
  ];

  angular.module('aptCPQUI').controller('categoryProductListingCtrl', CategoryProductListingCtrl);

}).call(this);
