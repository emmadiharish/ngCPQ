
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
			'pikaday',
			'ui.select',
			'ngProgress'
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
		//Ensure case-sensitivity doesn't matter for logging level
		var loggingLevel = systemConstants.customSettings.systemProperties.LoggingLevel;
		loggingLevel = angular.isString(loggingLevel) ? loggingLevel.toLowerCase() : 'none';
		$logProvider.debugEnabled(loggingLevel === 'debug');
		
		//A single pagination-controls template is used throught the app. This may be limiting.
		paginationTemplateProvider.setPath(baseUrl + '/templates/layouts/pagination.html');
		var isAfterLaunch = false;
		var launchState = systemConstants.pageParams.launchState;
		$urlRouterProvider.rule(function ($injector, $location) {
				//what this function returns will be set as the $location.url
				 var path = $location.path();
				 if (!isAfterLaunch) {
					 isAfterLaunch = true;
					 if (launchState && launchState !== '' && path != '/'+launchState) {
						 return $location.url(launchState);
					 }
				 }

		});
		
		//Define application states.
		$urlRouterProvider.otherwise('/cart');
		$stateProvider.state('catalog', {
		resolve: {
			initCatalogService: [
                 '$state', '$stateParams', '$q', 'systemConstants', 'ConfigurationDataService', 'CategoryService',
                 function($state, $stateParams, $q, systemConstants, ConfigurationDataService, CategoryService) {
                	 return ConfigurationDataService.getCustomCatalogPageUrl().then(function(pageUrl) {
                		 if (pageUrl != null) {
                			 window.location = pageUrl;
                			 //handles first time returning from VF page scenario
                			 window.setTimeout(function(){window.location = pageUrl}, 1000);
                			 return $q.reject();

                		 } else {
                			 return CategoryService.getDefaultSearchCategory().then(function(categoryId){
                				 if (categoryId) {
                					 $state.go('category', {
                						 categoryId: categoryId
                					 });
                				 }
                			 });
                		 }
                	 });
                 }
             ]
			},
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
			url: '/category/{categoryId}',
			resolve: {
				initCategoryService: [
					'$stateParams', 'CategoryService', function($stateParams, CategoryService) {
						return CategoryService.setCurrentCategory($stateParams.categoryId).then(function(products){
							$stateParams.categoryId = CategoryService.categoryId;
							return products;
						});
						
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
			url: '/search/{term}?categoryId',
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
		}).state('compare', {
				url: '/compare/{productIds}',
				views: {
					'globalHeader@': {
						templateUrl: baseUrl + '/templates/blocks/header-global.html'
					},
					'proposalSelector@compare': {
						templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
					},
					'miniCart@compare': {
						templateUrl: baseUrl + '/templates/blocks/block-mini-cart.html'
					},
					'processTrail@': {
						templateUrl: baseUrl + '/templates/blocks/display-actions-top.html'
					},
					'displayActions@': {
						templateUrl: baseUrl + '/templates/blocks/display-actions.html'
					},
					'layout@': {
							templateUrl: baseUrl + '/templates/layouts/layout-single-col.html'
					},
					'layoutSingle@compare': {
						templateUrl: baseUrl + '/templates/blocks/compare-products.html'
					}
				}
		}).state('cart', {
			url: '/cart',
			resolve: {
				initCartService: [
                  '$state', '$q', 'CartDataService', 'ConfigurationDataService', 
                  function($state, $q, CartDataService, ConfigurationDataService) {
                	  return CartDataService.getCartLineItems().then(function(cartLineItems) {
                		  if(!(angular.isArray(cartLineItems) && cartLineItems.length > 0)){
                			  $state.go('catalog');

                		  } else {

                			  return ConfigurationDataService.getCustomCartPageUrl().then(function(pageUrl) {
                				  if (pageUrl != null) {
                					  window.location = pageUrl;
                					  //handles first time returning from VF page scenario
                					  window.setTimeout(function(){window.location = pageUrl}, 1000);
                					  return $q.reject();
                				  }
                			  });
                		  }
                	  });

                  }
              ]
			},
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
					'$state', '$stateParams', '$q', '$log', 'ConfigureService', 'systemConstants', 'CartDataService', 'ConfigurationDataService', 
					function($state, $stateParams, $q, $log, Configure, systemConstants, CartDataService, ConfigurationDataService) {
						var configurePromise = Configure.setLineitemToConfigure(parseInt($stateParams.txnPrimaryLineNumber)).then(
							//If setLineitemToConfigure promise is resolved
							function (bundleLineItem) {
							 //go to custom attribute page, when custom attribute page is defined
								var isAttributeStep = ($stateParams.step) ? ($stateParams.step == 'attributes') || ($stateParams.step == 'redirectAttributePage')
																			: bundleLineItem.hasAttrs();
								if (systemConstants.customSettings.optionsPageSettings.TabViewInConfigureBundle) {
									isAttributeStep = false;//attributes are displayed inside option groups
								}
								isAttributeStep = (isAttributeStep || ($stateParams.step == 'redirectAttributePage'))
								if (isAttributeStep || ($stateParams.step == 'redirectAttributePage')) {
									//$window.location.href = "https://na15.salesforce.com/apex/ProductAttributeDetail3?cartId=a0pi000000F…J&configRequestId=a19i0000002OUIHAA4&callerPage=cart&id=a0ai000000AjXsiAAF";
									return ConfigurationDataService.getCustomAttributePageUrl().then(function(pageUrl){
										if (pageUrl != null) {
											$stateParams.step = 'redirectAttributePage';//avoid showing attributes
											pageUrl += '&id='+bundleLineItem.lineItemSO().Id;
											window.location = pageUrl;
											//handles first time returning from VF page scenario
											window.setTimeout(function(){window.location = pageUrl}, 1000);
											return $q.reject();
										}
									});
								}
							},
							//If setLineitemToConfigure promise is rejected
							function (reason) {
								$log.error(reason);
								return $state.go('cart');
							}
						);
						
						//ensure all lines are cached for client side expressions
						if(systemConstants.isFieldExpressionsEnabled) { 
							return CartDataService.getCartLineItems().then(function() {
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
			resolve: {
					initAssetService: [
						'$state', '$stateParams', '$q', 'systemConstants', 'ConfigurationDataService', 
						function($state, $stateParams, $q, systemConstants, ConfigurationDataService) {
						return ConfigurationDataService.getCustomAssetPageUrl().then(function(pageUrl) {
							if (pageUrl != null) {
								$stateParams.step == 'redirectAssetPage'
								window.location = pageUrl;
								//handles first time returning from VF page scenario
								window.setTimeout(function(){window.location = pageUrl}, 1000);
								return $q.reject();
							}
						});
						}
					]
			},
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
		}).state('location-cart', {
	        url: '/location-cart',
	        params: {
	          view: 'detail'
	        },
	        views: {
	          'globalHeader@': {
	            templateUrl: baseUrl + '/templates/blocks/header-global.html'
	          },
	          'processTrail@': {
	            templateUrl: baseUrl + '/templates/blocks/display-actions-top.html'
	          },
	           'proposalSelector@location-cart': {
	            templateUrl: baseUrl + '/templates/blocks/block-proposal-summary.html'
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
	          'layoutSingle@location-cart': {
	            templateUrl: baseUrl + '/templates/blocks/location-cart-table.html'
	          }
        	}
      	});
	}

	angular.module('aptCPQUI').run( function($rootScope) {
		$rootScope.$on("$stateChangeError", console.log.bind(console));
	});
	
}).call(this);