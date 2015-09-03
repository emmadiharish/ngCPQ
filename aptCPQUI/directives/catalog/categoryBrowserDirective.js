(function() {
  var CategoryBrowser, categoryBrowserCtrl;

  categoryBrowserCtrl = function($state, $stateParams, CatalogService) {
    var self;
    self = this;
    self.state = $state.current.name;
    self.depth = 0;
    self.parentSref = '#/catalog';

    /*
    
      parent            <--- Back to 1 level higher in family tree
        sibling
        sibling
        -----------
        sibling         <--- Toggles open to show children if applicable, highlights otherwise
          children      <--- Updates generation list
        -----------
     */
    CatalogService.getCatById($stateParams.catID).then(function(res) {
      return self.currentCategory = res;
    });
    return CatalogService.getCategories().then(function(res) {
      var categoriesDepth, categoryLineage, modulo;
      self.categories = res;
      if ($state.is('category')) {
        categoryLineage = CatalogService.getAncestors($stateParams.catID, res);
        categoriesDepth = categoryLineage.length;
        modulo = categoriesDepth % 2;
        if (modulo && categoriesDepth > 1) {
          if (categoryLineage[categoriesDepth - 1].childCategories.length) {
            self.browseTree = categoryLineage[categoriesDepth - 1];
            self.parentSref = '#/category/' + categoryLineage[categoriesDepth - 1].parentId;
          } else {
            self.browseTree = categoryLineage[categoriesDepth - 2];
            self.parentSref = '#/category/' + categoryLineage[categoriesDepth - 2].parentId;
          }
        } else if (modulo && categoriesDepth <= 1) {
          self.browseTree = categoryLineage[0];
          self.parentSref = '#/catalog';
        } else {
          self.browseTree = categoryLineage[categoriesDepth - 2];
        }
        return self.parentCategoryLabel = self.browseTree.label;
      }
    });
  };

  categoryBrowserCtrl.$inject = ['$state', '$stateParams', 'CatalogDataService'];

  CategoryBrowser = function(systemConstants) {
    var directive;
    directive = {
      scope: {},
      bindToController: true,
      controller: categoryBrowserCtrl,
      controllerAs: 'catGroup',
      templateUrl: systemConstants.baseUrl + '/templates/directives/category-browser-block.html'
    };
    return directive;
  };

  CategoryBrowser.$inject = ['systemConstants'];

  angular.module('aptCPQUI').directive('categoryBrowser', CategoryBrowser);

}).call(this);
