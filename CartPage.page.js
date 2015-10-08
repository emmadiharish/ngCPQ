<!--	
		Apttus Config & Pricing
		Cart
		Angular JS UI for CPQ 
		@2015-2016 Apttus Inc. All rights reserved.
 -->
<apex:page controller="Apttus_Config2.RemoteCPQController"
						title="Cart" 
						docType="html-5.0"
						showHeader="false" 
						sidebar="false"
						standardStylesheets="false">

	<title>Apttus</title>
	<apex:stylesheet value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/assets/stylesheets/application.css')}"/>
	<apex:stylesheet value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/assets/stylesheets/assetStyles.css')}"/> 
	
	<apex:outputPanel rendered="{!NOT(ISNULL(CSSOverride))}">
		<apex:dynamicComponent componentValue="{!CSSOverrideComponent}"/>
    </apex:outputPanel>
    
	<!--External library dependencies-->
	<!-- Individually including libraries instead of single file -->
	<!-- <apex:includeScript value="{!URLFOR($Resource.ngCPQ, '/aptBase/lib/vendor.js')}"/> -->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/lib/angular.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/lib/angular-ui-router.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/lib/angular-messages.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/lib/dirPagination.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/lib/angular-filter.min.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/lib/ng-lodash.min.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/lib/moment-with-locales.min.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/lib/pikaday.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/lib/pikaday-angular.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/lib/Sortable.min.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/lib/ng-sortable.js')}"/>

	<!--Main application setup/routes-->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/aptBase.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/aptPrototypes.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/aptCPQData.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/aptCPQUI.js')}"/>
	<!--Controllers-->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/controllers/catalogCtrl.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/controllers/paginationControlsCtrl.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/controllers/productListCtrl.js')}"/>
	<!--Services-->
	<!-- General -->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/services/labelService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/services/cartService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/services/categoryService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/services/configureService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/services/assetService.js')}"/>
	<!-- Object Constructors-->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/services/lineItemModelService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/services/optionGroupModelService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/services/optionModelService.js')}"/>
	<!-- Data Services-->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/actionHandlerService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/assetDataService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/attributeDataService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/cartDataService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/catalogDataService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/categoryDataService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/configurationDataService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/constraintRuleDataService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/pageErrorDataService.js')}"/>
	
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/displayActionDataService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/optionDataService.js')}"/>
	<!-- <apex:includeScript value="{!URLFOR($Resource.ngCPQ, '/aptCPQData/services/data/pageSettingsDataService.js')}"/> -->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/productDataService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/data/productFilterDataService.js')}"/>
	<!-- Cache Services -->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/cache/attributesCacheService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/cache/catalogCacheService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/cache/lineItemCacheService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/cache/optionsCacheService.js')}"/>
	<!-- Utility Services -->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/services/actionQueueService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/services/i18nService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/services/utilService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/filters/numberToCurrencyFilter.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/filters/currencyToNumberFilter.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/filters/dateFilter.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptBase/services/remoteService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/lineItemSupportService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/formulaEvaluatorService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/cartFormulaService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/formulaIteratorService.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQData/services/attributeRulesService.js')}"/>
	<!--Directives-->
	<!--Common Directives-->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/displayActionsDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/dynamicFieldDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/fixedHeaderDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/globalHeaderDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/constraintMessagesDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/constraintDialogDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/productSummaryDialogDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/priceRampDialogDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/proposalSummaryDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/customActionDialogDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/toggleAllClassDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/toggleClassDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/common/PageErrorMessagesDirective.js')}"/>
	<!-- Catalog-->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/catalog/breadCrumbDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/catalog/categoryBrowserDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/catalog/categorySelectorDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/catalog/filterSearchDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/catalog/catalogProductDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/catalog/refineSearchDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/catalog/searchProductDirective.js')}"/>
	<!-- Configure -->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/checkboxOptionDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/checkboxOptionListDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/configurationSummaryDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/configureProductAttributesDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/configureProductHeaderDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/configureProductNavDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/configureProductOptionsDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/mainConfigureProductDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/optionAttributeConfigDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/optionGroupsDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/picklistOptionListDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/radioOptionDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/config/radioOptionListDirective.js')}"/>
	<!-- Cart-->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/cart/cartEditableActionDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/cart/cartHeaderDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/cart/cartLabelRowDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/cart/cartLabelTotalsRowDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/cart/cartTotalsDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/cart/lineItemCartTotalDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/cart/mainCartDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/cart/miniCartDirective.js')}"/>
	<!-- Assets -->
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/installedproducts/assetSummaryDialogDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/installedproducts/assetHeaderDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/installedproducts/assetsFilterDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/installedproducts/mainAssetDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/installedproducts/assetActionsDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/installedproducts/cancelAssetDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/installedproducts/changeAssetsDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/installedproducts/swapAssetDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/installedproducts/swapConfirmDirective.js')}"/>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/directives/installedproducts/searchAssetsDirective.js')}"/>
	
	<!-- <apex:includeScript value="{!URLFOR($Resource.ngCPQ, '/aptCPQUI/directives/common/ProductSummaryDirective.js')}"/> -->

	<!-- Translation of Custom Label and Fields -->
	<apex:include pageName="Apttus_Config2__Translation"/>

	<script type="text/javascript">
		/**
		 * Anonymous blocks for configuring the different modules.
		 * These config blocks need to be defined within the page to take
		 * 	advantage of visualforce binding for initializing the app with
		 * 	constant pieces of data.
		 */
		(function() {
			//Create System Properties constant
			var baseUrl = formatSFDCUrl("{!URLFOR($Resource.ngCPQ, '/aptCPQUI')}");
			var baseFileUrl = formatSFDCUrl("{!URLFOR($Action.Attachment.Download, SystemSettings['defaultIconId'])}");
			var systemConstants = {
				"baseUrl": baseUrl,
				"baseFileUrl": baseFileUrl,
				"nsPrefix": "{!SystemSettings['namespacePrefix']}",
				"isFieldExpressionsEnabled":"{!SystemSettings['isFieldExpressionsEnabled']}",
				"msecPerDay": 86400000,
				"pendingStatusMap": {
					"Cancelled" : "Pending Cancellation",
					"Amended" : "Pending Change"
				}
			};
			angular.module('aptCPQData').constant('baseUrl', baseUrl);
			angular.module('aptCPQData').constant('systemConstants', systemConstants);

			//Configure Modules
			baseConfig.$inject = ['aptBase.RemoteServiceProvider', 'aptBase.i18nServiceProvider'];
			angular.module('aptBase').config(baseConfig);
			dataConfig.$inject = ['ConfigurationDataServiceProvider'];
			angular.module('aptCPQData').config(dataConfig);

			//Format the base url of app static resource
			function formatSFDCUrl(sfdcString) {
				var formatExp = /^(?:.*)(\{\!URLFOR|resource|servlet)(?:.*)(\}|\/|file=\w*)$/;
				var matches = (sfdcString ? sfdcString.match(formatExp) : false); 
				if (matches) {
					var matchTerm = matches[1];
					if (matchTerm === '\{\!URLFOR') {
						sfdcString = '.';

					} else if (matchTerm === 'resource') { 
						//Will only match if last char is a '/' that needs to be removed
						sfdcString = sfdcString.slice(0, -1);

					} else if (matchTerm === 'servlet') {
						var param = 'file=';
						var edge = sfdcString.indexOf(param) + param.length;
						sfdcString = sfdcString.slice(0, edge);

					}

				}
				return sfdcString;
				
			}
			
			// Overriding the SFDC navigateToUrl for this page as we need custom action to be performed on the click of the button. ( ctrl/cmd + click - should open the link in new tab)
			navigateToUrl = function (url) {
				var event = window.event || navigateToUrl.caller.arguments[0]; // window.event will not be returning the event object in mozilla so getting it from the callee arguments
				if (event.ctrlKey || event.metaKey) {
					window.open(url, '_blank');
				} else {
					window.location = url;
				}
			}
			
			function dataConfig(ConfigurationDataServiceProvider) {
				var cartId = "{!cartId}";
				var configRequestId = "{!configRequestId}";
				var priceListId;
				var pageParams = JSON.parse('{!(pageParams)}');
				ConfigurationDataServiceProvider.setRequestBase(cartId, configRequestId, priceListId, pageParams);

			}
			function baseConfig(RemoteServiceProvider, i18nServiceProvider) {
				//Extracting locale information from visualforce javacript. May be unreliable.
				i18nServiceProvider.setLocale(UserContext.locale);
				i18nServiceProvider.setDateFormat(UserContext.dateFormat);
				i18nServiceProvider.setDateTemplate("{!templateLineItem.Apttus_Config2__StartDate__c}");
				i18nServiceProvider.setCurrencyTemplate("{!templateLineItem.Apttus_Config2__BaseCost__c}");
				i18nServiceProvider.setPrecision("currency", "{!SystemSettings['currency']}");
				i18nServiceProvider.setPrecision("percent", "{!SystemSettings['percentage']}");
				i18nServiceProvider.setPrecision("quantity", "{!SystemSettings['quantity']}");
				// i18nServiceProvider.setCurrencyTemplate("¥ 1,2345.67");
				// i18nServiceProvider.setDateTemplate("1999-12-21");
				var remoteActions = {
					//initilize cart when cartId and configRequestId is missing
					
					//Configuration Data
					getConfigurationData: '{!$RemoteAction.RemoteCPQController.getConfigurationData}',
					// Catalog operations
					getCategories: '{!$RemoteAction.RemoteCPQController.getCategories}',
					getProducts: '{!$RemoteAction.RemoteCPQController.getProducts}',
					getProductsByIds: '{!$RemoteAction.RemoteCPQController.getProductsByIds}',
					searchProducts: '{!$RemoteAction.RemoteCPQController.searchProducts}',
					// Cart + line item operations
					getCartLineItems: '{!$RemoteAction.RemoteCPQController.getCartLineItems}',
					getCart: '{!$RemoteAction.RemoteCPQController.getCart}',
					addToCart: '{!$RemoteAction.RemoteCPQController.addToCart}',
					deleteLineItems: '{!$RemoteAction.RemoteCPQController.deleteLineItems}',
					updatePrice: '{!$RemoteAction.RemoteCPQController.updatePrice}',
					getLineItemDetails: '{!$RemoteAction.RemoteCPQController.getLineItemDetails}',
					getProductDetails: '{!$RemoteAction.RemoteCPQController.getProductDetails}',
					performAction: '{!$RemoteAction.RemoteCPQController.performAction}',
					ignoreRuleAction: '{!$RemoteAction.RemoteCPQController.ignoreRuleAction}',
					getExcludedProductIds: '{!$RemoteAction.RemoteCPQController.getExcludedProductIds}',
					getExcludedOptionIds: '{!$RemoteAction.RemoteCPQController.getExcludedOptionIds}',
					
					// Retreive sample requests from controller
					getProductSearchSample: '{!$RemoteAction.RemoteCPQController.getProductSearchSample}',
					getAddToCartSample: '{!$RemoteAction.RemoteCPQController.getAddToCartSample}',
					// Asset Based Ordering operations
					getAssetLineItems: '{!$RemoteAction.RemoteCPQController.getAssetLineItems}',
					getAssetFilters: '{!$RemoteAction.RemoteCPQController.getAssetFilterFields}',
					performAssetActions: '{!$RemoteAction.RemoteCPQController.performAssetActions}',
					getReplacementProducts: '{!$RemoteAction.RemoteCPQController.getReplacementProducts}',
					getAttributeRules: '{!$RemoteAction.RemoteCPQController.getAttributeRules}',
					calculateMetricsForAssets: '{!$RemoteAction.RemoteCPQController.calculateMetricsForAssets}'
				};
				RemoteServiceProvider.setRemoteActions(remoteActions);
				// Need retURL or other url for redirect. Default is to redirect to '/'. 
				RemoteServiceProvider.setRedirectLocation('{!$CurrentPage.parameters.retURL}');

			}
		})();

	</script>

	<!-- Section for binding visualforce template values from controller -->
	<div id="idDataTemplateSection" style="display:none;">
		<div id="idCurrencyTemplate">
			<!-- <span>¥ 1 2345.67</span> -->
			<apex:outputField value="{!templateLineItem.Apttus_Config2__BaseCost__c}"/>
		</div>
		<div id="idDateTemplate">
			<apex:outputField value="{!templateLineItem.Apttus_Config2__StartDate__c}"/>
		</div>
		<!-- Wrap output text in span tag to match outputField behavior  -->
		<div id="idQuantityPrecision">
			<span><apex:outputText value="{!SystemSettings['quantity']}"/></span>
		</div>
		<div id="idCurrencyPrecision">
			<span><apex:outputText value="{!SystemSettings['currency']}"/></span>
		</div>
		<div id="idPercentagePrecision">
			<span><apex:outputText value="{!SystemSettings['percentage']}"/></span>
		</div>
		<div id="idDefaultIconId">
			<span><apex:outputText value="{!SystemSettings['defaultIconId']}"/></span>
		</div>
	</div>

	<!-- Application  -->

	<!--[if lt IE 8]>
	<p class="browsehappy">
		You are using an <strong>outdated</strong> browser.
		Please <a href="http://browsehappy.com/">upgrade your browser</a>
		to improve your experience.
	</p><![endif]-->
	<div ng-app="aptCPQUI">
		<div class="header-global">
			<div ui-view="globalHeader"></div>
		</div>
		<div class="process-trail">
			<div ui-view="processTrail"></div>
		</div>
		<div class="system-notification">
			<div ui-view="systemNotification"></div>
		</div>
		<div class="content-container">
			<div ui-view="layout"></div>
		</div>
		<constraint-dialog></constraint-dialog>
		<product-summary-dialog></product-summary-dialog>
		<asset-summary-dialog></asset-summary-dialog>
		<price-ramp-dialog></price-ramp-dialog>
		<div class="display-actions">
			<div ui-view="displayActions"></div>
		</div>
	</div>
	<apex:includeScript value="{!URLFOR($Resource.Apttus_Config2__ngCPQ, '/aptCPQUI/assets/fonts/ss-pika.js')}"/>
</apex:page>
