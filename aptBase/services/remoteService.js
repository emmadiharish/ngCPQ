;(function() {
	angular.module('aptBase')
		.provider('aptBase.RemoteService', RemoteServiceProvider); 

	function RemoteServiceProvider() {
		var provider = this;
		var actionsMap = {};
		var redirectOnFail = '/';
		var trackAllRemoteCalls = false;

		provider.setRemoteActions = function (newActions) {
			angular.extend(actionsMap, newActions);
			return provider;
		};	

		provider.setRedirectLocation = function (newLocation) {
			redirectOnFail = typeof newLocation == 'string' ? false : newLocation;
			return provider;
		};

		provider.setTrackAllRemoteCalls = function(isEnabled){
			trackAllRemoteCalls = isEnabled;
			return provider;
		};

		RemoteServiceFactory.$inject = ['$q', '$log', '$window'];
		provider.$get = RemoteServiceFactory;

		function RemoteServiceFactory($q, $log, $window) {
			return new RemoteService($q, $log, $window, actionsMap, redirectOnFail);

		}	

		function RemoteService($q, $log, $window, RemoteActions, redirectOnFail) {
			var service = {};
			var lastTransaction = {};
			initRemoteActionFunctions();	
			return service;
			
			function initRemoteActionFunctions() {
				var actionKey, actionName, isProp, isStr;
				for (actionKey in RemoteActions) {
					isProp = RemoteActions.hasOwnProperty(actionKey);
					isStr = typeof actionKey === 'string';
					if (isProp && isStr) {
						actionConfig = getRemoteActionConfig(actionKey);
						service[actionKey] = createRemoteActionFunction(actionConfig);

					}
				}
			}

			/*
			* This method will check RemoteAction[key] contains action string or action config object
			* according to that it will create actionConfig object and returns it 
			*/
			function getRemoteActionConfig(actionKey) {
				var config = {}
					if (angular.isDefined(RemoteActions[actionKey])) {
						var actionConf = RemoteActions[actionKey];
						if (angular.isString(actionConf)) {
							config.actionName = actionConf;
							config.skipLoader = false;

						} else if (angular.isObject(actionConf)) {
							config.actionName = (angular.isDefined(actionConf.actionName)) ? actionConf.actionName : null;
							config.skipLoader = (angular.isDefined(actionConf.skipLoader)) ? actionConf.skipLoader : false;

						}

					}
				return config;
			}

			/**
			 * Used for generating methods that can be called on the service by the name
			 * 	declared in the RemoteActions object.
			 * Each method passes its fully-qualified name and its
			 * 	arguments to invokeRemoteAction. The arguments passed
			 * 	to this function should just match the signature of 
			 * 	the Apex method. 
			 * @return {promise} resolves with the result of the remote action
			 */
			function createRemoteActionFunction(actionConfig) {
				var actionFunction = function() {
					return invokeRemoteAction(actionConfig, arguments);

				};
				return actionFunction;

			}
			/**
			 * Helper for calling visualforce remoting. 
			 *  
			 * @param 	{string}	actionName 	the remote action to invoke
			 * @param 	{array}		actionParams	any number of parameters to pass to remote
			 *          												action before callback 
			 * @return {promise} a $q promise that resolves with result of remote action
			 *
			 * Example: 
			 * 		<code>
			 * 		var thenable = invokeRemoteAction(RemoteActions.getCartLineItems, [cartRequest]);
			 * 		thenable.then(function (result) {
			 * 			useResult(result);
			 * 		});
			 * 		</code>
			 * Here, thenable will be a promise that gets resolved with the result of the remote action 
			 */
			function invokeRemoteAction(actionConfig, actionParams) {
				// $log.debug('invokeRemoteAction-->'+actionConfig.actionName, actionParams);
				
				//Constuct deferred object for return
				var deferred, errorMessage, remoteActionWithParams, resolver, remotingParams, actionName;
				deferred = $q.defer();
				actionName = actionConfig.actionName;
				
				setRemoteServiceCount(actionConfig,true);
				
				if (!actionName || typeof actionName !== 'string') {
					errorMessage = "Error - Could not invoke remote action: action name invalid!";
					$log.error(errorMessage);
					deferred.reject(errorMessage);
					return deferred.promise;

				}
				//Construct list with aciton name and parameters to pass to invokeAction
				remoteActionWithParams = [actionName];
				for (var argIndex = 0, nextArg; argIndex < actionParams.length; argIndex++) {
					nextArg = actionParams[argIndex];
					if (!nextArg) {
						errorMessage = "Error - Could not construct remote action parameters. Parameter #" + argIndex +" is undefined!";
						$log.error(errorMessage);
						deferred.reject(errorMessage);
						return deferred.promise;

					}
					remoteActionWithParams.push(nextArg);

				}
				//Add the resolve function and remoting params to argument array
				resolver = function resolveRemoteAction(result, event) {
					if (event.status) {
						$log.debug('Resolved "' + actionName + '"' + 
												', Time taken: ' + result.timeTaken/1000 + ' sec.' +
												', Query count: ' + result.queryCount);
						deferred.resolve(result);
						
					} else {
						errorMessage = 'Error - Could not resolve remote action: ' + actionName; 
						$log.error(errorMessage, actionParams, event.message);
						//Currently the only way to check whether request failed due to user logout
						var isLoggedOut = event.message.toLowerCase().indexOf('logged') >= 0;
						if (isLoggedOut && redirectOnFail) {
							$window.location.href = redirectOnFail;

						}
						deferred.reject(event);

					}

					setRemoteServiceCount(actionConfig,false);
				};
				remoteActionWithParams.push(resolver);

				//Add the default parameters for remoting call
				remotingParams = {
					"buffer": false, 
					"escape": false, 
					"timeout": 30000
				};
				remoteActionWithParams.push(remotingParams);

				//Try to call visualforce remoting invokeAction with the parameters we built 
				try {
					Visualforce.remoting.Manager.invokeAction.apply(Visualforce.remoting.Manager, remoteActionWithParams);

				} catch(ex) {
					errorMessage = 'Error - Could not invoke remote action: ' + actionName; 
					$log.error(errorMessage, actionParams, ex);
					deferred.reject(errorMessage);
						
				}
				return deferred.promise;

			}

			/*
			* This method sets pendingRemoteServiceCount of $q service (decorrated in queueWrapperService.js) 
			* based on actionConfig.skip and LoggerLevel
			*/
			function setRemoteServiceCount(actionConfig, incrementFlag){
				//$log.debug('setRemoteServiceCount-->', actionConfig, incrementFlag);
				if (!actionConfig.skipLoader || trackAllRemoteCalls) {
					if (incrementFlag) {
						$q.incrementRemoteServiceCount();

					} else {
						$q.decrementRemoteServiceCount();

					}

				}
			}

		}

	}

})();