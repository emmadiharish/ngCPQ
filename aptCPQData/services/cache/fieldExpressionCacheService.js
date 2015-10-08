;(function() {
	angular.module('aptCPQData')
		.service('FieldExpressionCache', FieldExpressionCache);

	function FieldExpressionCache() {
		var cache = this;

		var expressionsByTargetPrimaryLine, 
			expressionsBySourceId,
			expressionsById,
			allExpressions;

		/** Attach service methods */
		cache.resetCache = resetCache;
		cache.getExpressions = getExpressions;
		cache.getExpressionsBySourceId = getExpressionsBySourceId;
		cache.getExpressionsByTarget = getExpressionsByTarget;
		cache.putFieldExpressions = putFieldExpressions;
		cache.updateCacheAfterItemDelete = updateCacheAfterItemDelete;
		
		init();

		function init() {
			resetCache();

		}

		/**
		 * reset expressions cache
		 */
		function resetCache() {
			cache.isValid = false;
			expressionsMap = {};
			expressionsByTargetPrimaryLine = {};
			expressionsBySourceId = {};
			expressionsById = {};
			allExpressions =  [];

		}

		/**
		 * get the expression by source line id
		 * @return {applied info's mapped by source id}
		 */
		function getExpressions() {
			return cache.isValid ? allExpressions : undefined;

		}

		/**
		 * get the expression by source line id
		 * @return {applied info's mapped by source id}
		 */
		function getExpressionsBySourceId() {
			return cache.isValid ? expressionsBySourceId : undefined;

		}

		/**
		 * get the expression for target line
		 * @param primaryLine line number for which expressions are a target
		 * @return {applied info's for target primary line}
		 */
		function getExpressionsByTarget() {
			return cache.isValid ? expressionsByTargetPrimaryLine : undefined;

		}

		/**
		 * remove the invalid expressions from the cache
		 * @param removeLines array of line items corresponding to
		 *        the target for expressions to remove
		 */
		function updateCacheAfterItemDelete(itemsInCart) {			
			var  newExpressionsMap = {};
			for(var targetLineNumber in expressionsByTargetPrimaryLine) {
				if(angular.isUndefined(itemsInCart[targetLineNumber])) {
					continue; //removed from cart

				}

				newExpressionsMap[targetLineNumber] = expressionsByTargetPrimaryLine;
			}
			
			resetCache();
			putFieldExpressions(newExpressionsMap);
		}

		/**
		 * update the field expressions mappings
		 * @param fieldExpressionsMap new field expressiosn to cache
		 */
		function putFieldExpressions(fieldExpressionsMap) {
			if(!fieldExpressionsMap) {
				return;

			}
			
			for(var targetLineNumber in fieldExpressionsMap) {
				if(fieldExpressionsMap.hasOwnProperty(targetLineNumber)) {
					for(var i = 0, len = fieldExpressionsMap[targetLineNumber].length; i < len; i++) {
						var appliedInfo = fieldExpressionsMap[targetLineNumber][i];
						//store applied expression info by id
						if(angular.isUndefined(expressionsById[appliedInfo.Id])) {
							allExpressions.push(appliedInfo);
							expressionsById[appliedInfo.Id] = appliedInfo;
						}
						//store by target primary line #
						var expressionsForTarget = expressionsByTargetPrimaryLine[targetLineNumber];
						if(angular.isUndefined(expressionsForTarget)) {
							expressionsForTarget = {};
							expressionsByTargetPrimaryLine[targetLineNumber] = expressionsForTarget;
						}
						expressionsForTarget[appliedInfo.Id] = appliedInfo;

						//store by source sobject id
						if(appliedInfo.isFieldUpdate === true) {
							if(angular.isDefined(appliedInfo.sourceIds)
								&& appliedInfo.sourceIds !== null) {
								var sourceIds = JSON.parse(appliedInfo.sourceIds);
								for(var j = 0, sourceLen = sourceIds.length; j < sourceLen; j++) {
									var infosForSource = expressionsBySourceId[sourceIds[j]];
									if(angular.isUndefined(infosForSource)) {
										infosForSource = {};
							            expressionsBySourceId[sourceIds[j]] = infosForSource;
							        }

							        infosForSource[appliedInfo.Id] = appliedInfo;
								}
							}
						}
					}
				}
			}

			cache.isValid = true;
		}
	}
})();

