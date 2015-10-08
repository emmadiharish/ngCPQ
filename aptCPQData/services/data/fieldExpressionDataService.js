;(function() {
	angular.module('aptCPQData')
		.service('FieldExpressionDataService', FieldExpressionDataService); 
			
	FieldExpressionDataService.$inject = [
		'$q',		
		'aptBase.RemoteService',
		'ConfigurationDataService',
		'FieldExpressionCache',
		'LineItemCache'
	 ];

	function FieldExpressionDataService($q, RemoteService, ConfigurationDataService, FieldExpressionCache, LineItemCache) {
		var service = this;

		/** Attach service methods */
		service.getExpressions = getExpressions;
		service.getExpressionsForTarget = getExpressionsForTarget;
		service.getExpressionsForSource = getExpressionsForSource;
		service.getExpressionsForRecalculation = getExpressionsForRecalculation;
		service.getModifiedByExpression = getModifiedByExpression;

		function getExpressions() {
			var cachedInfo = FieldExpressionCache.getExpressions();
			if (cachedInfo) {
				return cachedInfo;

			}

			return fetchExpressions().then(function() { 
				return cachedInfo;
			});
		}

		function getExpressionsForTarget(primaryLineNumber) {
			var cachedInfo = FieldExpressionCache.getExpressionsByTarget();
			if (cachedInfo) {
				return angular.isDefined(primaryLineNumber) ? cachedInfo[primaryLineNumber] : cachedInfo;

			}

			return fetchExpressions().then(function() {
				var infosByTarget = FieldExpressionCache.getExpressionsByTarget(); 
				return angular.isDefined(primaryLineNumber) ? infosByTarget[primaryLineNumber] : infosByTarget;
			});
		}

		/**
		 * get the expression by source sobject id
		 * @return {applied info's mapped by source id}
		 */
		function getExpressionsForSource(sourceId) {
			var cachedInfo = FieldExpressionCache.getExpressionsBySourceId();
			if (cachedInfo) {
				return angular.isDefined(sourceId) ? cachedInfo[sourceId] : cachedInfo;
				
			}

			return fetchExpressions().then(function() {
				var infosBySourceId = FieldExpressionCache.getExpressionsBySourceId();
				return angular.isDefined(sourceId) ? infosBySourceId[sourceId] : infosBySourceId;
			});
		}

		function fetchExpressions() {
			var newRequest = $q.when(true).then(function () {
				var includeParams = ["fieldExpressions"];
				var requestPromise = ConfigurationDataService.createCatalogRequestDO(null, null, null, includeParams, null).then(function (expressionRequest) {
					return RemoteService.getProductDetails(expressionRequest);	
				
				});

				return requestPromise.then(function (response) { //store in cache
					FieldExpressionCache.putFieldExpressions(response.appliedExpressionInfos);
					return response.appliedExpressionInfos;

				});
			});

			return newRequest;
		}

		/**
		 * Get the expressions which need to be re-evaluated
		 * @param newObject the new object
		 * @param oldObject the old object
		 * @param sObjectType the sObject type
		 * @param cartLineSObjects all cart lines
		 * @return the expressions which need recalculation
		 */ 
		function getExpressionsForRecalculation(sourceId, fieldName) {
			var expressionsForRecalculation = {};
			var infosBySourceId = FieldExpressionCache.getExpressionsBySourceId();
			if(!infosBySourceId || !sourceId ||!fieldName) {
				//nothing to calculate
				return expressionsForRecalculation;
			}

			var hasPendingCalculations = false;
			var sourceExpressionInfos = infosBySourceId[sourceId];
			if(angular.isDefined(sourceExpressionInfos)&&
		            sourceExpressionInfos !== null) {					
				for(infoId in sourceExpressionInfos) {
					if(sourceExpressionInfos.hasOwnProperty(infoId)) {
						var appliedExpressionInfo = sourceExpressionInfos[infoId];
						if(!appliedExpressionInfo.locked) {
							var sourceFields = JSON.parse(appliedExpressionInfo.sourceFields)[sourceId];
			              	if(!(sourceFields.indexOf(fieldName) < 0)) {
			              		expressionsForRecalculation[appliedExpressionInfo.Id] = appliedExpressionInfo;
			              		hasPendingCalculations = true;
			              	}
  						}
  					}
  				}			  		
		  	}
		  	

		  	// if there are exressions for re-calculation...
			// <1> find additonal field expressions which will need re-calculation
			// <2> find rollups and field updates which use rollups
		  	if(hasPendingCalculations) {
		  		var allChargeLines = LineItemCache.getLineItemsByPrimaryLineNumber();
			  	var modifiedByExpressions = getModifiedByExpression(expressionsForRecalculation, allChargeLines);
			  	angular.extend(expressionsForRecalculation, modifiedByExpressions);
			  	
			  	//recalcuutate rollups and dependentes.
		  		var allInfos = FieldExpressionCache.getExpressions();		  		
		  		for(var i = 0, len = allInfos.length; i < len; i++) {
		  			var info = allInfos[i];
		      		if(info.isRollup || info.usesRollup) {
		      			expressionsForRecalculation[info.Id] = info;

		      		}
		    	}
			}

		  	return expressionsForRecalculation;
		}

		/**
		 * Get the expressions which are dependent on specified infos (recurssive)
		 * @param infos the new object
		 * @param modified the map dependent infos (initially empty) 
		 * @return expressions which are dependent on those specified by infos
		 */ 
		function getModifiedByExpression(infos, allChargeLines, modified) {
			modified = modified || {};

			var infosBySourceId = FieldExpressionCache.getExpressionsBySourceId();			
			for(infoId in infos) {
			  	if(infos.hasOwnProperty(infoId)) {
			  		var appliedInfo = infos[infoId];
			  		if(appliedInfo.isFieldUpdate) { //get field updates which are modified by given infos			  			
				        var chargeLine;
				        if(angular.isUndefined(allChargeLines) // charge line does not exist
				        		|| angular.isUndefined(allChargeLines[appliedInfo.targetPrimaryLineNumber])) {
				        	continue;
				        }

				        chargeLine = allChargeLines[appliedInfo.targetPrimaryLineNumber];
				        var targetSO =  getObjectFromField(chargeLine.lineItemSO(), appliedInfo.updateField);			        
				        var sourceExpressionInfos = infosBySourceId[targetSO.Id];			        
			        	if(angular.isDefined(sourceExpressionInfos) &&
			          			sourceExpressionInfos !== null) {
			        		for(sourceInfoId in sourceExpressionInfos) {
			        			if(sourceExpressionInfos.hasOwnProperty(sourceInfoId)) {
			        				var sourceInfo = sourceExpressionInfos[sourceInfoId];                
			              			if(!sourceInfo.locked) {
			              				var sourceFields = JSON.parse(sourceInfo.sourceFields)[targetSO.Id];
			              				var appliedSourceField = appliedInfo.updateField.split('.');
			              				if(!(sourceFields.indexOf(appliedSourceField[appliedSourceField.length -1]) < 0)) {
			              					modified[sourceInfo.Id] = sourceInfo;
			              					if(sourceInfo.isFieldUpdate) { //grab any additional updates
		              							var infoMap = {};
		              							infoMap[sourceInfo.Id] = sourceInfo;
		              							var additional = getModifiedByExpression(infoMap, allChargeLines, modified);
		              							for(additionalInfoId in additional) {
		              								if(additional.hasOwnProperty(additionalInfoId)) {
		              									modified[additionalInfoId] = additional[additionalInfoId];
							                        }
							                    }
							                }
			              				}			              				
								    }
								}
							}
						}
					}
				}
			}

		  	return modified;
		}

		/**
		 * Get the object corresponding to field name
		 * @param contextSO the "starting" sObject
		 * @param fieldAPIName the fully qualified field API name
		 * @return the object specified by fieldName
		 */
		function getObjectFromField(contextSO, fieldAPIName) {
			//set new value
			var path = fieldAPIName.split('.');
			var curObject = contextSO;
			for (var i = 0, max = path.length -1; i < max; i++) {
				if(angular.isDefined(curObject)
		          && curObject !== null) {
		          	curObject = curObject[path[i]];
		    	}        
		  	}

		  	return curObject;
		}
	}

})();