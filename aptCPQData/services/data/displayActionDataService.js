/**
 * DisplayActionDataService
 * 	prepares display action data
 *  defines function to set action page during view state transition 
 */
(function() {
	'use strict';
	
	angular.module('aptCPQData')
		.service('DisplayActionDataService', DisplayActionDataService); 

	DisplayActionDataService.$inject = ['$log', '$q', 'ConfigurationDataService'];

	//DisplayActionDataService definition
	function DisplayActionDataService($log, $q, ConfigurationDataService) {
		var service = this;
		service.displayType;
		
		service.actions = {};
		service.finalizeActionInfo;
		service.actionPromise = null;
		
		/**
		 * Return the display actions for a action page. Valid type strings:
				attributePageActions
				cartPageActions
				catalogPageActions
				optionPageActions
			displayAs : Action, Task, Sidebar Action
			actionArea: Left, Center, Right, More 	
		 */
		service.getDisplayActions = function getDisplayActions(actionPage, displayAs, actionArea) {
			var dataKey = actionPage + '/' + displayAs + '/' + actionArea;
			return getAllDisplayActions().then(function(actionMap){ return actionMap[dataKey];});
			
		};
		
		
		/**
		 * loads all display actions and returns a display action map
		 */
		function getAllDisplayActions(){
			if (service.actionPromise == null) {
				$log.log('invoking----> ConfigurationDataService.getDisplayActions');
				
				service.actionPromise = ConfigurationDataService.getDisplayActions().then(function (result) {
					angular.forEach(result, function(value, page){
						var pageActions = result[page];
						angular.forEach(pageActions, function(value, key) {
							var itemKey =  page + '/'+value.DisplayAs + '/' + value.ActionArea;
							if(!angular.isDefined(service.actions[itemKey])) {
								service.actions[itemKey] = [];
							}
							service.actions[itemKey].push(value);
							if(value.ActionName === 'Finalize' && page === 'cartPageActions') {
								service.finalizeActionInfo = value;
							}
							if (value.DisplayAs === 'Action') {
								if (!angular.isDefined(service.bottomBarHasActions)) {
									service.bottomBarHasActions = {};
								}
								service.bottomBarHasActions[page] = true;
							}
							
						});
			
					});
					return service.actions;
					
				});
			}
			
			return service.actionPromise; 

		}

		/**
		 * sets display type for the current state(page) 
		 */
		service.setDisplayType = function setDisplayType(state) {
			var activeState = state.current.name;
			var activeTab = state.params.step;
			var type;
			switch (activeState) {
			case 'configure':
				type = 'attributePageActions';
				break;
			case 'cart':
				type = 'cartPageActions';
				break;
			case 'category':
			case 'search':
			case 'catalog':
				type = 'catalogPageActions';
				break;
			case 'assets':
				type = 'assetPageActions';
				break;
			default:
				type = state.current.name;
			}
			if (activeTab === 'options' && activeState === 'configure') {
				type = 'optionPageActions';
			}
			
			service.displayType = type;
			return type;
		};


	}

})();