;(function() {
	angular.module('aptBase')
		.service('aptBase.ActionQueueService', ActionQueueService); 
	
	ActionQueueService.$inject = ['$q', '$log'];
	
	function ActionQueueService($q, $log) {
		var service = this;
		var isScheduled = false;
		var tail = $q.when(true);
		var actionQueue = [];
		var scheduledActionQueue = [];
		var hashedActionsMap = {};
		var settings = {
			logTime: true,
			maxPrecedence: 1024
		};

		/* -- Public methods -- */

		//Used to register indiviudal actions and schedule them seperately
		service.registerAction = registerAction;
		service.scheduleAction = scheduleAction;

		
		/* -- Method Declarations -- */


		/**
		 * Register a function in the action queue, optionally assignign it a 
		 * 	precedence in execution and a actionKey with which to hash. If the function
		 * 	parameter is not valid, does nothing. 
		 *
		 * @param  {function}	functionObject 	A function that can be executed by the queue.
		 * @param  {number}		precedence     	Precedence with which to execute function. 
		 *                                   	Higher = execute sooner
		 *                                   	Undefined = Max (first)
		 * @param  {string} 	actionKey       Key with which to hash the function. If provided,
		 *                                   	the function is to be queued by this key instead
		 *                                   	of by passing it as an object. Defaults to funciton.toString
		 * @return {actionQueue}              Reference to this service to allow chainging.
		 */
		function registerAction(functionObject, precedence, actionKey) {
			var hashVal, existed;
			var max = settings.maxPrecedence;
			if (!(functionObject instanceof Function)) {
				return service;

			}
			//Calculate values
			precedence = Number(precedence);
			precedence = precedence ? Math.min(precedence, max) : max;
			hashVal = actionKey ? hashObject(actionKey) : hashObject(functionObject);
			//Store information
			//existed = hashedActionsMap[hashVal];
			hashedActionsMap[hashVal] = {
				"action": functionObject,
				"precedence": precedence,
				"isScheduled": false
			};

			return service;

		}

		/**
		 * Adapted from ActionFunctionQueue; converts any object into a string
		 * 	that has a toString method then hashes that string to an integer value.
		 * 	
		 * @param  {object} 	objectToHash
		 * @return {integer}  hashed integer value
		 */
		function hashObject(objectToHash) {
			var str = objectToHash.toString();
			var hash = 5381;
			for (i = 0; i < str.length; i++) {
				char = str.charCodeAt(i);
				hash = ((hash << 5) + hash) + char; /* hash * 33 + c */

			}
			return hash;

		}
	

		/**
		 * Schedule a particular action.
		 * 
		 * @return {promise} tail of the event chain at scheduling time.
		 */
		function scheduleAction(actionKey) {
			var newSchedule = queueByPrecedence(actionKey);
			// isScheduled = isScheduled || newSchedule;
			if (!isScheduled) {
				isScheduled = true;
				tail = tail.then(fireSync);

			}
			return tail;
		
		}

		/**
		 * Put a particular action's info into the queue.
		 * @param  {object} actionKey 	Key used to reference object
		 * @return {Boolean}           	True if action becomes scheduled, else False.
		 */	
		function queueByPrecedence(actionKey) {
			var hashVal, actionInfo;
			if (!actionKey) {
				return false; //Invalid; do nothing.

			}
			hashVal = hashObject(actionKey);
			actionInfo = hashedActionsMap[hashVal];
			if (!actionInfo || actionInfo.isScheduled) {
				return false; //Invalid or already scheduled; do nothing.

			}
			var actionIndex, nextActionInfo;
			for (actionIndex = scheduledActionQueue.length - 1; actionIndex >= 0; actionIndex--) {
				nextActionInfo = scheduledActionQueue[actionIndex];
				//traversing from end, so stop before greater precedence
				if (nextActionInfo.precedence > actionInfo.precedence) {
					break;

				}

			}
			actionIndex ++; //compensate because splice inserts before
			scheduledActionQueue.splice(actionIndex, 0, actionInfo);
			actionInfo.isScheduled = true;
			return true;

		}


		/**
		 * Fires a sync event. The new event is chained onto the tail of the
		 *  previous event, meaning events will run sequentially.
		 * If the actions in the queue are rejected, i.e. throw errors,
		 * 	the tail of schedlued sync is reset, the rejection is returned.
		 * Optionally logs the information about how long the process took.
		 * 
		 * @return {Promise} tail of scheduled queue
		 */
		function fireSync() {
			isScheduled = false;
			var sentTime = new Date();
			if (settings.logTime) {
				$log.info("Action Queue Submitted: " + sentTime.toGMTString());
				
			}
			//Build and run queue of actions
			return fireScheduledActionQueue().then(
				function onQueueResolve(result) {
					if (settings.logTime) {
						var receivedTime = new Date();
						var delta = Number(receivedTime - sentTime)/1000;
						$log.info("Sync Transaction Time: " + delta + " seconds.");
						
					}
					return result;
				
				},
				function onQueueReject(reason) {
					$log.error('Action Queue was Rejected');
					isScheduled = false;
					tail = $q.when(true);
					return $q.reject(reason);

				}
			);

		}

		/**
		 * New variant of fireActionQueue that uses the queue of action infos,
		 * 	which are in order of decreasing precedence.
		 * Creates a chain of primises: start with an empty defer, and add each
		 *  function as a "then" to execute when the previous promise completes.
		 * The whole chain is constructed, then the head of the chain is resolved, 
		 * 	letting the execution begin.
		 * 	
		 * @return {promise} the last promise in the chain
		 */
		function fireScheduledActionQueue() {
			var queue = $q.defer();
			var nextPromise = queue.promise;

			var nextActionInfo;
			for(var actionIndex = 0; actionIndex < scheduledActionQueue.length; actionIndex++) {
				nextActionInfo = scheduledActionQueue[actionIndex];
				nextPromise = nextPromise.then(nextActionInfo.action);
				nextActionInfo.isScheduled = false; //Allow future scheduling
				
			}
			scheduledActionQueue = [];
			queue.resolve();
			return nextPromise;

		}

		/** Depricated  -- used before precedence was handled */

		
		//Used to build and execute one static action queue
		// service.registerActionQueue = registerActionQueue;
		// service.scheduleSync = scheduleSync;


		/**
		 * Establish the queue of all actions to execute on a sync.
		 * Currently a single queue included and is built to run all actions as
		 * 	they appear in the array.
		 * 	ToDo: 
		 * 		- Add functionality to enqueue individual the actions for a particular sync.
		 * 		- Provide a way of associating funtions with a particular order. 	
		 *   
		 * @return {Boolean} whether existing actions are being replaced.
		 */
		// function registerActionQueue(newQueue) {
		// 	var hadQueue = newQueue && newQueue.length;
		// 	actionQueue = [];
		// 	Array.prototype.push.apply(actionQueue, newQueue);
		// 	return hadQueue;

		// }
		


		/**
		 * Ensure a firing event is scheduled.
		 *   
		 * @return {promise} tail of the event chain at scheduling time.
		 */
		// function scheduleSync() {
		// 	if (!isScheduled) {
		// 		isScheduled = true;
		// 		tail = tail.then(fireSync);

		// 	}
		// 	return tail;
		
		// }	


		/**
		 * Creates a chain of primises: start with an empty defer, 
		 * 	and add each function as a "then" to execute when
		 * 	the previous promise completes.
		 * The whole chain is constructed, then the head of the chain
		 * 	is resolved, starting the whole process.
		 * 	
		 * @return {promise} the last promise in the chain
		 */
		// function fireActionQueue() {
		// 	var queue = $q.defer();
		// 	var nextPromise = queue.promise;

		// 	var nextAction;
		// 	for(var i = 0; i < actionQueue.length; i++) {
		// 		nextAction = actionQueue[i];
		// 		nextPromise = nextPromise.then(nextAction);
				
		// 	}

		// 	queue.resolve();
		// 	return nextPromise;

		// }
		
	}
	
})();