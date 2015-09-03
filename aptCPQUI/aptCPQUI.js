
/* global angular */

(function() {
  'use strict';
  angular.module('aptCPQUI', [
      'aptBase',
      'aptCPQData',
      'ui.router',
      'angularUtils.directives.dirPagination',
      'angular.filter',
      'ngLodash',
      'ng-sortable',
      'pikaday'
    ]).constant('moment', moment)
      .config(configBlock);

  configBlock.$inject = [
    '$logProvider',
    '$urlRouterProvider',
    '$stateProvider',
    '$locationProvider',
    'moment',
    'systemConstants',
    'paginationTemplateProvider',
    'pikadayConfigProvider'
  ];
  
  function configBlock($logProvider, $urlRouterProvider, $stateProvider, $locationProvider, moment, systemConstants, paginationTemplateProvider, pikaday) {
    var baseUrl = systemConstants.baseUrl;
    // Pikaday formatting isn't being used -- dynamicFieldDirective is used instead. 
    // pikaday.setConfig({
    //   format: 'MM/DD/YY'
    // });

    //Disable logs in managed packages. All console logs should be made with angular $log service.
    var isManagedPackage = angular.isDefined(systemConstants.nsPrefix) && systemConstants.nsPrefix.length > 0;
    $logProvider.debugEnabled(!isManagedPackage);
    
    //A single pagination-controls template is used throught the app. This may be limiting.
    paginationTemplateProvider.setPath(baseUrl + '/templates/layouts/pagination.html');

    //Define application states.
    $urlRouterProvider.otherwise('/catalog');
    $stateProvider.state('catalog', {
      url: '/catalog',
      views: {
        'globalHeader@': {
          templateUrl: baseUrl + '/templates/blocks/header-global.html'
        },
        'proposalSelector@catalog': {
          templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
        },
        'miniCart@catalog': {
          templateUrl: baseUrl + '/templates/blocks/block-mini-cart.html'
        },
        'processTrail@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions-top.html'
        },
        'displayActions@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions.html'
        },
        'systemNotification@': {
          templateUrl: baseUrl + '/templates/blocks/system-notification.html'
        },
        'layout@': {
          templateUrl: baseUrl + '/templates/layouts/layout-left-col.html'
        },
        'sidebarLeft@catalog': {
          templateUrl: baseUrl + '/templates/layouts/sidebar-catalog.html'
        },
        'mainContent@catalog': {
          templateUrl: baseUrl + '/templates/blocks/main-product-catalog.html',
          controller: 'catalogCtrl',
          controllerAs: 'catalog'
        }
      }
    }).state('category', {
      url: '/category/{catID}?compare',
      resolve: {
        initCategoryService: [
          '$stateParams', 'CategoryService', function($stateParams, CategoryService) {
            return CategoryService.setCurrentCategory($stateParams.catID);
          }
        ]
      },
      views: {
        'globalHeader@': {
          templateUrl: baseUrl + '/templates/blocks/header-global.html'
        },
        'proposalSelector@category': {
          templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
        },
        'miniCart@category': {
          templateUrl: baseUrl + '/templates/blocks/block-mini-cart.html'
        },
        'processTrail@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions-top.html'
        },
        'displayActions@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions.html'
        },
        'systemNotification@': {
          templateUrl: baseUrl + '/templates/blocks/system-notification.html'
        },
        'layout@': {
          templateUrl: baseUrl + '/templates/layouts/layout-left-col.html'
        },
        'sidebarLeft@category': {
          templateUrl: baseUrl + '/templates/layouts/sidebar-products.html'
        },
        'mainContent@category': {
          templateUrl: baseUrl + '/templates/blocks/main-product-listings.html',
          controller: 'productListCtrl',
          controllerAs: 'productList'
        }
      }
    }).state('search', {
      url: '/search/{term}?category',
      views: {
        'globalHeader@': {
          templateUrl: baseUrl + '/templates/blocks/header-global.html'
        },
        'proposalSelector@search': {
          templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
        },
        'miniCart@search': {
          templateUrl: baseUrl + '/templates/blocks/block-mini-cart.html'
        },
        'processTrail@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions-top.html'
        },
        'systemNotification@': {
          templateUrl: baseUrl + '/templates/blocks/system-notification.html'
        },
        'displayActions@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions.html'
        },
        'layout@': {
          templateUrl: baseUrl + '/templates/layouts/layout-left-col.html',
          controller: 'productListCtrl',
          controllerAs: 'productList' //Category Browse and Search Merge Change, Changed search to productList
        },
        'sidebarLeft@search': {
          templateUrl: baseUrl + '/templates/layouts/sidebar-search.html'
        },
        'mainContent@search': {
          templateUrl: baseUrl + '/templates/blocks/main-product-listings.html'
        }
      }
    }).state('cart', {
      url: '/cart',
      params: {
        view: 'detail'
      },
      views: {
        'globalHeader@': {
          templateUrl: baseUrl + '/templates/blocks/header-global.html'
        },
        'proposalSelector@cart': {
          templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
        },
        'processTrail@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions-top.html'
        },
        'systemNotification@': {
          templateUrl: baseUrl + '/templates/blocks/system-notification.html'
        },
        'displayActions@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions.html'
        },
        'layout@': {
          templateUrl: baseUrl + '/templates/layouts/layout-single-col.html'
        },
        'layoutSingle@cart': {
          templateUrl: baseUrl + '/templates/blocks/main-cart-table.html'
        }
      }
    }).state('configure', {
      resolve: {
        initConfigureService: [
          '$state', '$stateParams', 'ConfigureService', 'systemConstants', 'CartDataService', function($state, $stateParams, Configure, systemConstants, CartData) {
            var configurePromise = Configure.setLineitemToConfigure($stateParams.txnPrimaryLineNumber).catch(function (reason) {
              $state.go('catalog');
            });

            //ensure all lines are cached for client side expressions
            if(systemConstants.isFieldExpressionsEnabled) { 
              return CartData.getCartLineItems().then(function() {
                return configurePromise;
              });
            }

            return configurePromise;
          }
        ]
      },
      url: '/configure/{txnPrimaryLineNumber}?step',
      views: {
        'globalHeader@': {
          templateUrl: baseUrl + '/templates/blocks/header-global.html'
        },
        'proposalSelector@configure': {
          templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
        },
        'miniCart@configure': {
          templateUrl: baseUrl + '/templates/blocks/block-mini-cart.html'
        },
        'processTrail@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions-top.html'
        },
        'systemNotification@': {
          templateUrl: baseUrl + '/templates/blocks/system-notification.html'
        },
        'displayActions@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions.html'
        },
        'layout@': {
          templateUrl: baseUrl + '/templates/layouts/layout-right-col.html'
        },
        'sidebarRight@configure': {
          templateUrl: baseUrl + '/templates/layouts/sidebar-configure.html'
        },
        'mainContent@configure': {
          templateUrl: baseUrl + '/templates/blocks/main-configure-product.html'
        }
      }
    }).state('assets', {
      url: '/assets',
      views: {
        'globalHeader@': {
          templateUrl: baseUrl + '/templates/blocks/header-global.html'
        },
        'proposalSelector@assets': {
          templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
        },
        'processTrail@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions-top.html'
        },
        'miniCart@assets': {
          templateUrl: baseUrl + '/templates/blocks/block-mini-cart.html'
        },
        'systemNotification@': {
          templateUrl: baseUrl + '/templates/blocks/system-notification.html'
        },
        'displayActions@': {
          templateUrl: baseUrl + '/templates/blocks/display-actions.html'
        },
        'layout@': {
          templateUrl: baseUrl + '/templates/layouts/layout-left-col.html'
        },
        'sidebarLeft@assets': {
          templateUrl: baseUrl + '/templates/layouts/sidebar-assets.html'
        },
        'mainContent@assets': {
          // templateUrl: baseUrl + '/templates/blocks/main-assets-table.html',
          templateUrl: baseUrl + '/templates/blocks/main-assets-view.html',
        }
      }
    }).state('assets.cancel', {
      url: '/cancel',
      views: {
        'globalHeader@': {
          templateUrl: baseUrl + '/templates/blocks/header-global.html'
        },
        'proposalSelector@assets.cancel': {
          templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
        },
        'miniCart@assets.cancel': {
          templateUrl: baseUrl + '/templates/blocks/block-mini-cart.html'
        },
        'layout@': {
          templateUrl: baseUrl + '/templates/layouts/layout-single-col.html'
        },
        'layoutSingle@assets.cancel': {
          templateUrl: baseUrl + '/templates/blocks/assets-cancel-view.html'
        }
      }
    }).state('assets.change', {
      url: '/change',
      views: {
        'globalHeader@': {
          templateUrl: baseUrl + '/templates/blocks/header-global.html'
        },
        'proposalSelector@assets.change': {
          templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
        },
        'miniCart@assets.change': {
          templateUrl: baseUrl + '/templates/blocks/block-mini-cart.html'
        },
        'layout@': {
          templateUrl: baseUrl + '/templates/layouts/layout-single-col.html'
        },
        'layoutSingle@assets.change': {
          templateUrl: baseUrl + '/templates/blocks/assets-change-view.html'
        }
      }
    }).state('assets.swap', {
      url: '/swap',
      views: {
        'globalHeader@': {
          templateUrl: baseUrl + '/templates/blocks/header-global.html'
        },
        'proposalSelector@assets.swap': {
          templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
        },
        'miniCart@assets.swap': {
          templateUrl: baseUrl + '/templates/blocks/block-mini-cart.html'
        },
        'layout@': {
          templateUrl: baseUrl + '/templates/layouts/layout-single-col.html'
        },
        'layoutSingle@assets.swap': {
          templateUrl: baseUrl + '/templates/blocks/assets-swap-view.html'
        }
      }
    }).state('assets.swap.confirm', {
      url: '/confirm?assetId&productId',
      views: {
        'globalHeader@': {
          templateUrl: baseUrl + '/templates/blocks/header-global.html'
        },
        'proposalSelector@assets.swap.confirm': {
          templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
        },
        'miniCart@assets.swap.confirm': {
          templateUrl: baseUrl + '/templates/blocks/block-mini-cart.html'
        },
        'layout@': {
          templateUrl: baseUrl + '/templates/layouts/layout-single-col.html'
        },
        'layoutSingle@assets.swap.confirm': {
          templateUrl: baseUrl + '/templates/blocks/assets-swap-confirm-view.html'
        }
      }
    });
  }
}).call(this);