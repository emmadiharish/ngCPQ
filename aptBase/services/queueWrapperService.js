;(function() {
	'use strict';

	angular.module('aptBase').config(function($provide) {
		/*
		* This decorator intercepts the creation $q service to add pendingPromissesCount & pendingRemoteServiceCount.
		*/
	    $provide.decorator('$q', ['$delegate', '$rootScope', '$log', function($delegate, $rootScope, $log) {

	      /*
	      *	Total pending Prmosses Count
	      * Count is maintained through Overloaded Defered method and Finally handller.
	      */
	      var pendingPromisses = 0; 
	      
	      /*
	      *	Total pending Remote Services Count 
	      * Count will be maintained through incremental and decrimental methods
	      * Incremental and Decrimental methods are consumed in RemoteService.js
	      */	
	      var pendingRemoteServiceCount = 0; 

	      var $q = $delegate;

	      /*
	      * Defer Method over loading for maintaining pendingPromissesCount
	      * It returns same promise ($q.defer()) object with finally handler to maintain pendingPromissesCount
	      */
	      var origDefer = $q.defer;
			      	      
	      $q.defer = function() {
	        var defer = origDefer();
	        pendingPromisses++;
	        
	        defer.promise.finally( function () {
	          pendingPromisses--;
	        });

	        return defer;
	      };

	      $q.incrementRemoteServiceCount = function() {
	      		pendingRemoteServiceCount++;
	      };

	      $q.decrementRemoteServiceCount = function() {
	      		pendingRemoteServiceCount--;
	      };

		  $q.getPendingRemoteServiceCount = function() {
		  		return pendingRemoteServiceCount;
		  };		      

	      $q.getPendingPromisses = function() {
	      	return pendingPromisses;
	      };

	      return $q;
	    }]);
	});

})();