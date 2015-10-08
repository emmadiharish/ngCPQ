/**
 *  Apttus Config & Pricing
 *  FormulaIteratorService
 *   
 *  @2015-2016 Apttus Inc. All rights reserved.
 *
 * This service, FormulaIteratorService, is used to iterate over
 * a collection of Applied Expression Info's, allowing
 * the application and services to keep track of expression
 * dependencies.
 */
;(function() {
	angular.module('aptCPQData')
		.service('FormulaIterator', FormulaIterator);
	
	FormulaIterator.$inject = [		
		'systemConstants'
	];

	// -- Classes to support throwing exceptions --  
	function ExpressionDependencyException(objectId, dependentField) {
		this.dependentSOId = objectId;
		this.dependentField = dependentField;
	}

	function SObjectNotFoundException(sObjectType, locatePointers) { 
	  	this.sObjectType = sObjectType;
	  	this.locatePointers = locatePointers;     
	}

	/**
	 * Translate the applied expression info by adding 
	 * "var" identifiers used by JSCalculator
	 * @param expression the expression to translate
	 * @return the translated expression
	 */
	function translateExpression(expression) {
		if(typeof(expression) === 'undefined'
			  || expression == null
			  || expression.trim() == '') {
			return expression;
		}

		return expression.replace(/(\$([.$A-Za-z0-9_]*|(\[.*\]))*)/g, function(match, p1, p2, p3, offset, originalString) {
			if(offset == 0) {
				return '{' + match + '}';
			} else if(originalString[offset -1] != '{' 
						&& originalString[offset + match.length + 1] != '}') {
				return '{' + match + '}';

			}

			return match;
		});
	}

	/**
	 * Iterator used by JS Cart Eval to handle
	 * Object Field Updates and Rollup generation
	 * @param data the expression infos mapping
	 * @param contextObjects the context objects by map identifier
	 * @param existingRollups any existing rollups 
	 */
	function FormulaIterator(systemConstants) {		
		var nsPrefix = systemConstants.nsPrefix;
		var AppliedExpressionIterator;
		return AppliedExpressionIterator = (function() {
			AppliedExpressionIterator.ExpressionDependencyException = ExpressionDependencyException;
			AppliedExpressionIterator.SObjectNotFoundException = SObjectNotFoundException;

			AppliedExpressionIterator.create = function(data, contextObjects, rollupContextObjects) {		        
				var newIterator = new AppliedExpressionIterator(data, contextObjects, rollupContextObjects);
				return newIterator;
			}

			/**
			 * Iterator used by JS Cart Eval to handle
			 * Object Field Updates and Rollup generation
			 * @param data the expression infos mapping
			 * @param contextObjects the context objects by map identifier
			 * @param existingRollups any existing rollups 
			 */
			function AppliedExpressionIterator(data, contextObjects, rollupContextObjects) {
				this.init(data, contextObjects, rollupContextObjects);

			}
			
			AppliedExpressionIterator.prototype = {				
				init: function(data, contextObjects, rollupContextObjects) {
					this.data = data;
					this.contextObjects = contextObjects;
					this.rollupContextObjects = rollupContextObjects;
					this.contextSObjectsById = {};
					this.contextIdToIdentifier = {};        
					this.fieldUpdates = {};
					this.attributeRules = {};
					this.defaultValueRules = {};
					this.rollups = {};
					this.fieldExpressions = {};
					this.standardExpressions = {};

					for(targetIdentifier in data) {
						if(data.hasOwnProperty(targetIdentifier)) {
							var contextSObject = this.contextObjects[targetIdentifier];
							this.contextSObjectsById[contextSObject.Id] = contextSObject;
							this.contextIdToIdentifier[contextSObject.Id] = targetIdentifier;

							var expressionsForTarget = data[targetIdentifier]; 
							for(fieldExpressionId in expressionsForTarget) {
								if(expressionsForTarget.hasOwnProperty(fieldExpressionId)) {
									var appliedExpressionInfo = expressionsForTarget[fieldExpressionId];
									if(typeof(appliedExpressionInfo) !== 'undefined' 
										  && appliedExpressionInfo != null) {
										if(appliedExpressionInfo.isRollup) { //processing for rollups               
											var rollupsForItem = this.rollups[contextSObject.Id];
											if(typeof(rollupsForItem) === 'undefined') {
												rollupsForItem = {};
												this.rollups[contextSObject.Id] = rollupsForItem;
											}

											appliedExpressionInfo.conditionExpression = translateExpression(appliedExpressionInfo.conditionExpression);
											appliedExpressionInfo.valueExpression = translateExpression(appliedExpressionInfo.valueExpression);
											rollupsForItem[fieldExpressionId] = appliedExpressionInfo;
										} else if(appliedExpressionInfo.isFieldUpdate) { //processing for field updates
											var fieldUpdatesForTarget = this.fieldUpdates[targetIdentifier];                   
											if(typeof(fieldUpdatesForTarget) === 'undefined') {
												fieldUpdatesForTarget = {}
												this.fieldUpdates[targetIdentifier] = fieldUpdatesForTarget;

											}
											//add expression to collection
											fieldUpdatesForTarget[appliedExpressionInfo.updateField] 
											  = translateExpression(appliedExpressionInfo.valueExpression);
										} 
									}
								}						
							}
						}
					}
							  
					//create field update context
					this.fieldUpdateContext = new FieldUpdateContext(this.fieldUpdates,
																	 this.contextObjects);
					//create rollup context
					this.rollupContext = new RollupContext(this.rollups,
														   this.contextSObjectsById,
														   this.rollupContextObjects,
														   this.existingRollups);    
				}
			}

			/**
			 * Iterator used by JS Cart Set Value method to handle
			 * Field updates and dependency checking
			 * @param fieldUpdates the expression infos mapping
			 * @param contextObjects the context objects by map identifier 
			 */
			function FieldUpdateContext(fieldUpdates, contextObjects) {
			  this.init(fieldUpdates, contextObjects);
			}

			FieldUpdateContext.prototype = {
				init: function(fieldUpdates, contextObjects) {
					this.fieldUpdates = fieldUpdates;          
					this.contextObjects = contextObjects;

					//store reference to fields for update by context sObject Id
					this.fieldUpdatesByContextSOId = {};
					for(targetIdentifier in this.fieldUpdates) {
					  if(this.fieldUpdates.hasOwnProperty(targetIdentifier)) {
					  	var contextSO = this.contextObjects[targetIdentifier];
						this.fieldUpdatesByContextSOId[contextSO.Id] = this.fieldUpdates[targetIdentifier];
					  }
					}

					//iteration groups
					this.mainItems = [];
					this.skippedItems = [];
					this.outsideDepItems = [];

					//initialize main items
					for(primaryLineNumber in this.fieldUpdates) {
					  var newItem = new FieldUpdateItem(this, primaryLineNumber);
					  this.mainItems.push(newItem);
					}

					//set iteration flags
					this.interatingMainItems = true;
					this.iteratingSkippedItems = false;
					this.iteratingOutsideDepItems = false;
					this.isFirstOutsideDepItemsPass = true;

					//position of the iterator
					this.itemIndex = 0; 

					//count of main items
					this.itemCount = this.mainItems.length;
					this.skippedItemCount = null;
					this.outsideDepItemsCount = null;

					//store reference to previous item in iteration
					this.previousItem = null;
			  	},

			  	/**
			   	 * Get context sObject
			   	 * @param targetIdentifier the id used in applied info mapping
			   	 * @return context sObject
			   	 */
			  	getContextSObject: function(targetIdentifier) {
			  		return this.contextObjects[targetIdentifier];
			  	},

			   	/**
			   	 * Get the field update criteria for target
			   	 * @param targetIdentifier the identifier for which you want
			   	 *        its field update criteria
			   	 * @return context sObject
			   	 */
			  	getCriteria: function(targetIdentifier) {
			  		return this.fieldUpdates[targetIdentifier];

			  	},

			  	/**
			   	 * Get next item for update   
			   	 * @return the next item for update.  
			   	 */
			  	next: function() {
			  		var nextItem = null;
					if(this.interatingMainItems) {
						if(this.itemIndex < this.itemCount) {
							nextItem = this.mainItems[this.itemIndex];
							this.itemIndex = this.itemIndex + 1;            
					  	} else {  // start iterating over skipped items
							this.interatingMainItems = false;
							this.itemIndex = 0;

							this.iteratingSkippedItems = this.skippedItems.length > 0;
							this.skippedItemCount = this.skippedItems.length;

							this.iteratingOutsideDepItems = !this.iteratingSkippedItems && this.outsideDepItems.length > 0;
							this.outsideDepItemsCount = this.outsideDepItems.length;
					  	}
					}

					if(this.iteratingSkippedItems) { // get next skipped item and remove ... may be added back in
				  		this.iteratingOutsideDepItems = false;
				  		if(this.itemIndex < this.skippedItemCount) {
							///grab next item       
							nextItem = this.skippedItems.splice(0, 1)[0];        
							//increment counter
							this.itemIndex = this.itemIndex + 1;          
				  		} else if(this.skippedItems.length > 0) {
							//skipped items collection is not reducing, try outside
							if(this.skippedItemCount == this.skippedItems.length) {
								//set to outside dependent mode
							  	this.iteratingOutsideDepItems = true;

							  	//add to outside dependency collection              
							  	this.outsideDepItems = this.outsideDepItems.concat(this.skippedItems);

							  	//reset counters
							  	this.outsideDepItemsCount = this.outsideDepItems.length;
							  	this.itemIndex = 0;
							} else {
								//grab next item
							  	//set counters
							  	this.skippedItemCount = this.skippedItems.length;
							  	this.itemIndex = 1;

							  	nextItem = this.skippedItems.splice(0, 1)[0];
							}
				  		} else {
				  			//set to outside dependent mode
							this.iteratingOutsideDepItems = this.outsideDepItems.length > 0;

							//reset counters
							this.outsideDepItemsCount = this.outsideDepItems.length > 0;
							this.itemIndex = 0;
				  		}
					}

					if(this.iteratingOutsideDepItems) {
						this.iteratingSkippedItems = false;
			  			if(!this.isFirstOutsideDepItemsPass) {
			  				if(this.itemIndex < this.outsideDepItemsCount) {
			  					nextItem = this.outsideDepItems.splice(0, 1)[0];
			  					this.itemIndex = this.itemIndex + 1;
							} else {
						  		if(this.skippedItems.length > 0) { //if skipped items added by outside dep pass
									//set modes
									this.iteratingSkippedItems = true;
									//grab next item
									nextItem = this.skippedItems.splice(0, 1)[0];

									//reset counters
									this.skippedItemCount = this.skippedItems.length;
									this.itemIndex = 0;
						  		} else if(this.outsideDepItems.length > 0) {
									//reset counters for next attempt
									this.outsideDepItemsCount = this.outsideDepItems.length;
									this.itemIndex = 0;
						  		}           
							}
				  		} else {
				  			this.isFirstOutsideDepItemsPass = false;
				  		}
					}

					if(this.previousItem != null) {
				  		this.previousItem.next(); // do processing after set value

					}

					this.previousItem = nextItem; // save next item
					return nextItem;
			  	},

			  	/**
			   	 * Do a cyclical field dependency check,
			   	 * i.e. fields dependent on eachother's values       
			   	 * @param  contextSOId Id of context sObject
			   	 * @param  dependentSOId Id of dependent sObject
			   	 * @param  dependentField API name of dependent field
			   	 * @return  the positive square root
			   	 */  
			  	doCyclicalDependencyCheck: function(contextSOId, contextField, dependentSOId, dependentField, fieldDepencencyMap) {
			  		var objectFieldDependencies = fieldDepencencyMap[dependentSOId];
			  		if(typeof(objectFieldDependencies) !== 'undefined') {
			  			var fieldDependencies = objectFieldDependencies[dependentField]; // field dependencies for contextSO      
				  		if(typeof(fieldDependencies) !== 'undefined') {
				  			for(depToken in fieldDependencies) {
				  				if(fieldDependencies.hasOwnProperty(depToken)) {
									var cyclicDepSObjectId = depToken.split(',')[0];
									var cyclicDepFieldName = depToken.split(',')[1];
									if(cyclicDepSObjectId == contextSOId
											&& cyclicDepFieldName == contextField) {
										throw 'Expressions not converging. Cyclical reference. sObject Id:'+contextSOId+'; Field:'+contextField;
									}
						  		}
							}
					  	} else {
					  		fieldDependencies = {}
							fieldDependencies[dependentSOId + ',' + dependentField] = dependentSOId + ',' + dependentField;
							objectFieldDependencies[dependentField] = fieldDependencies;
							fieldDepencencyMap[dependentSOId] = objectFieldDependencies;
					  	}
					} else {
						fieldDependencies = {};
					  	fieldDependencies[dependentSOId + ',' + dependentField] = dependentSOId + ',' + dependentField;
					  	var depFieldToDependencies = {};
					  	depFieldToDependencies[dependentField] = fieldDependencies;
					  	fieldDepencencyMap[dependentSOId] = depFieldToDependencies;
					}
			  	},

			 	/**
			   	 * Process item which has field dependency   
			   	 * @param  depenentItem Set Value item which has field dependency
			   	 * @param  dependentId Id of dependent sObject
			   	 * @param  dependentField Field which item is dependent on
			   	 * @param  skippingItem Flag specifying whether we are skipping item
			   	 *         or just field on the item
			   	 */
			  	setIsDependentItem: function(depenentItem, contextField, dependentId, dependentField, skippingItem) {
			  		if(skippingItem) {
			  			var updatesForDependentItem = this.fieldUpdatesByContextSOId[dependentId];
			  			if(typeof(updatesForDependentItem) === 'undefined'
			  					|| updatesForDependentItem[dependentField] === 'undefined') {
			  				this.outsideDepItems.push(depenentItem);
				  		} else {
							this.skippedItems.push(depenentItem);

				  		}
					}

					// mark as field skipped
					depenentItem.fieldSkipped(contextField);      
			  	},

			  	/**
			   	 * Check whether this field context has dependencies
			   	 * outside of this context, i.e. dependencies resolvable
			   	 * within rollup context
			   	 * @return <code>true</code> if has outside field dependencies, <code>false</code> otherwise. 
			   	 */
			  	hasOutsideDependencies: function() {
			  		return this.outsideDepItems.length > 0;
			  	}
			}

			/**
			 * Iterator used by JS Cart Set Value method to handle
			 * Field updates and dependency checking
			 * @param fieldUpdates the expression infos mapping
			 * @param contextObjects the context objects by map identifier 
			 */
			function FieldUpdateItem(fieldUpdateContext, targetIdentifier) {
			  this.init(fieldUpdateContext, targetIdentifier);

			}

			FieldUpdateItem.prototype = {
			  init: function(fieldUpdateContext, targetIdentifier) {
				this.fieldUpdateContext = fieldUpdateContext;
				this.targetIdentifier = targetIdentifier;
				this.fieldCriteria = this.fieldUpdateContext.getCriteria(targetIdentifier);
				this.skippedFields = {};
				this.sourceFields = {};  
				this.undefinedFields = {};      
			  },

			  /**
			   * Do processing to get ready for the next
			   * iterative pass
			   */
			  next: function() {
				this.fieldCriteria = this.skippedFields;
				this.skippedFields = {};
			  },

			  /**
			   * Mark a field as skipped   
			   * @param  skippedField
			   *         Field was is skipped
			   */
			  fieldSkipped: function(skippedField) {
				this.skippedFields[skippedField] = this.fieldCriteria[skippedField];

			  },

			  /**
			   * Get context sObject           
			   * @return context sObject
			   */
			  getContextSObject: function() {
				return this.fieldUpdateContext.getContextSObject(this.targetIdentifier);

			  },

			  /**
			   * Get the field update criteria
			   * @return field update criteria for item
			   */
			  getCriteria: function() {        
				return this.fieldCriteria;
			  },

			  /**
			   * Add details to source fields map; used to update
			   * Applied Expression Infos
			   */
			  setSourceFields: function(fieldsMap, dependentField) {
				for(sourceObjectId in fieldsMap) {
				  if(fieldsMap.hasOwnProperty(sourceObjectId)) {
					var fieldsForObject = fieldsMap[sourceObjectId];
					for(sourceFieldName in fieldsForObject) {
					  if(fieldsForObject.hasOwnProperty(sourceFieldName)) {
						var sourceMap = this.sourceFields[dependentField];
						if(typeof(sourceMap) === 'undefined') {
							sourceMap = {};
						  	sourceMap[sourceObjectId] = {};
						  	sourceMap[sourceObjectId][sourceFieldName] = sourceFieldName;
						  	this.sourceFields[dependentField] = sourceMap;
						} else {
						  var sourceFieldsForObject = sourceMap[sourceObjectId];
						  if(typeof(sourceFieldsForObject) === 'undefined') {
						  	sourceFieldsForObject = {};
							sourceFieldsForObject[sourceFieldName] = sourceFieldName;
							sourceMap[sourceObjectId] = sourceFieldsForObject;
						  } else {
							sourceFieldsForObject[sourceFieldName] = sourceFieldName;
						  }
						}
					  }
					}
				  }
				}
			  },

			  /**
			   * Add undefined field details to collection; used to update
			   * Applied Expression Infos   
			   */
			  setUndefinedFields: function(undefinedFields, fieldName) {      
				var hasUndefinedFields = false;
				for(var key in undefinedFields) {
					hasUndefinedFields = true;
				  	break;
				}

				if(hasUndefinedFields == true) {
				  var undefinedByUpdateField = this.undefinedFields[fieldName];
				  if(typeof(undefinedByUpdateField) === 'undefined') {
				  	undefinedByUpdateField = {};
					this.undefinedFields[fieldName] = undefinedByUpdateField;
				  }

				  for(undefinedField in undefinedFields) {
				  	if(undefinedFields.hasOwnProperty(undefinedField)) {
						undefinedByUpdateField[undefinedField] = undefinedFields[undefinedField];          
					}
				  }
				}      
			  }
			}

			/**
			 * Iterator used by JS Cart Eval to handle
			 * Rollup generation
			 * @param rollupExpressions the expression infos mapping
			 * @param contextObjects the context objects by map identifier
			 * @param rollupContextObjects the objects to be rolled up 
			 * @param existingRollups any existing rollups
			 */
			function RollupContext(rollupExpressions, contextObjectsById, rollupContextObjects, existingRollups) {
			  this.init(rollupExpressions, contextObjectsById, rollupContextObjects), existingRollups;

			}

			RollupContext.prototype = {
				init: function(rollupExpressions, contextObjectsById, rollupContextObjects, existingRollups) {
					this.rollupExpressions = rollupExpressions;     
				 	this.contextObjectsById = contextObjectsById;
				 	this.rollupContextObjects = rollupContextObjects;
				 	this.existingRollups = existingRollups;
				 	this.completedRollups = {};
				 	this.itemsByContextAndExpression = {};

				 	this.pendingItems = {};
				 	this.hasDependencyItems = null
				 	this.newRollups = {};
				 	this.rollupObjectsById = {};

				 	//initialize the context maps
				 	this.loadContextMaps();       
			  	},

			  	/**
			   	 * Load the context mappings used by iterator
			   	 */
			  	loadContextMaps: function() {
			  		for(conditionParentId in this.rollupExpressions) {
			  			if(this.rollupExpressions.hasOwnProperty(conditionParentId)) {
			  				var infosForParent = this.rollupExpressions[conditionParentId];
			  				for(rollupExpressionId in infosForParent) {
			  					if(infosForParent.hasOwnProperty(rollupExpressionId)) {
			  						var appliedInfo = infosForParent[rollupExpressionId];
			  						if(!angular.isDefined(appliedInfo.expressionSOId) ||
			  								appliedInfo.expressionSOId === null) {
			  							continue;
									}

									//store item by context parent and by field expression id
									var itemsForParent = this.pendingItems[conditionParentId];
									var itemsByExpressionId = this.itemsByContextAndExpression[conditionParentId];

									if(typeof(itemsForParent) === 'undefined') {
										itemsForParent = [];
										this.pendingItems[conditionParentId] = itemsForParent;
									}

									if(typeof(itemsByExpressionId) === 'undefined') {
										itemsByExpressionId = {};
										this.itemsByContextAndExpression[conditionParentId] = itemsByExpressionId;
									}

									// create rollup item
									var newItem = new RollupContextItem(conditionParentId, appliedInfo, this);         
									itemsForParent.push(newItem);
									itemsByExpressionId[appliedInfo.expressionSOId] = newItem;
									//store as already completed roll-ups
									// if(typeof(this.existingRollups) !== 'undefined') {
									//   for(conditionParentId in  this.existingRollups) {
									//     Map<Id, List<LineItemRollup__c>> existingRollups = this.existingRollups.get(conditionParent);
									//     Set<Id> rollupsForGeneration = this.rollupExpressions.get(conditionParent);         
									//     if(existingRollups != null) {           
									//       for(Id fieldExpressionId : existingRollups.keyset()) {
									//         if(rollupsForGeneration == null ||
									//             !rollupsForGeneration.contains(fieldExpressionId)) {
									//           List<LineItemRollup__c> existingRollupsForExpression = existingRollups.get(fieldExpressionId);
									//           if(existingRollupsForExpression != null) { //store as already completed roll-ups
									//             addCompletedRollups(conditionParent, existingRollupsForExpression);                 
									//           }
									//         }
									//       }
									//     }
									//   }
									// }

									//this.addCompletedRollups(conditionParentId, appliedInfo.completedRollups);
					  			}
							}
				  		}
					}
			  	},

			  	/**
			   	 * perform pre-processing before context evaluation
			   	 */
			  	start: function() {
			  		this.hasDependencyItems = null;
			  	},

			  	/**
			   	 * perform post-processing after context evaluation
			   	 */
			  	stop: function() {
			  		//flag if all expressions failed because of outside dependency
					var isTotalFailure = true;

					//save new rol-ups
					for(conditionParent in this.pendingItems) {
						if(this.pendingItems.hasOwnProperty(conditionParent)) {
							var contextItems = this.pendingItems[conditionParent];          
							for(var i=0; i < contextItems.length; i++) {
						  		var contextItem = contextItems[i];
						  		if(!this.getHasDependency(contextItem)) {
									var createdRollups = contextItem.getCreatedRollups();
									if(createdRollups != null) {
							  			for(var j=0; j < createdRollups.length; j++) {
											var createdRollup = createdRollups[j];
											var summaryParentId = contextItem.getScopeFieldId();                
											var rollupsForParent = this.newRollups[summaryParentId];
											if(typeof(rollupsForParent) === 'undefined') {
												rollupsForParent = [];
												this.newRollups[summaryParentId] = rollupsForParent;
											}

											//add to collection
											rollupsForParent.push(createdRollup);
							 			}             
									}

									isTotalFailure = false;
						  		}
							}          
				  		}
					}

					this.pendingItems = {};
					if(this.hasDependencyItems != null) {
						//reset pending items list
				  		this.pendingItems = this.hasDependencyItems;
				  
				  		// throw new exception
				  		var dependencyException = new ExpressionDependencyException();
				  		dependencyException.isTotalFailure = isTotalFailure;
				  		throw dependencyException;
					}
			  	},

			  	/**
			   	 * Add to list of completed roll-up records
			   	 * @param conditionParent id of the condition parent for the roll-up
			   	 * @param newly completed rollups      
			   	 */
			  	addCompletedRollups: function(conditionParent, rollups) {
			  		if(typeof(rollups) !== 'undefined') {
			  			var completedForCondition = this.completedRollups[conditionParent];
				  		if(typeof(completedForCondition) === 'undefined') {
				  			completedForCondition = [];
							this.completedRollups[conditionParent] = completedForCondition;
				  		}

				  		completedForCondition = completedForCondition.concat(rollups);
				  		this.completedRollups[conditionParent] = completedForCondition;
					}
			  	},

			  	/**
			   	 * Flag context item as has dependency
			   	 * @param contextItem context item to flag    
			   	 */
			  	setHasDependency: function(contextItem) {
					if(this.hasDependencyItems == null) {
				  		this.hasDependencyItems = {};
					}

					//add to dependency collection
					var scopeId = contextItem.getScopeFieldId();
					var dependentItems = this.hasDependencyItems[scopeId];
					if(typeof(dependentItems) === 'undefined') {
				  		dependentItems = [];
				  		this.hasDependencyItems[scopeId] = dependentItems;
					}

					dependentItems.push(contextItem);
			  	},

			  	/**
			   	 * Check if context item has been flaged as dependent
			   	 * @param  contextItem context item to check
			   	 * @return true if flagged as dependent, false otherwise
			   	 */
			  	getHasDependency: function(contextItem) {			  	 
					return this.hasDependencyItems != null 
						&& angular.isDefined(this.hasDependencyItems[contextItem.getScopeFieldId()]);
			  	},

			  	/**
			   	 * Check if has pending rollup records
			   	 * @param  scopeId Id of condition/scope object
			   	 * @return  true if has pending rollups, false otherwise
			   	 */
			  	hasRollupPending: function(scopeId) {          
					return angular.isDefined(this.pendingItems[scopeId]);
			  	},

			  	/**
			   	 * Check if there are pending rollups
			   	 * @return true if context has pending rollups, false otherwise
			   	 */
			  	hasPendingRollups: function() {
			  		var hasPendingRollups = false;
			  		for(key in this.pendingItems) {
			  			if(this.pendingItems.hasOwnProperty(key)) {
			  				hasPendingRollups = true;
							break;
				  		}
					}

					return hasPendingRollups;
			  	},

			  	/**
			   	 * Get the pending rollup context items
			   	 * @return  rollup context items
			   	 */
			  	getPendingRollups: function() {
			  		var results = [];
					for(var conditionId in this.pendingItems) {
						if(this.pendingItems.hasOwnProperty(conditionId)) {
							var contextItems = this.pendingItems[conditionId];
							if(angular.isDefined(contextItems)
									&& contextItems !== null) {
					  			results = results.concat(contextItems);
							}
				  		}
					}

					return results;
			  	},

			  	/**
			   	 * gets new rollups created
			   	 * @return new roll ups
			   	 */
			  	getNewRollups: function() {
			  		return this.newRollups;
			  	},

			  	/**
			   	 * gets all rollups
			   	 * @return existing and new rollups
			   	 */
			  	getAllRollups: function() {
			  		var allRollups = [];
			  		for(scopeId in this.newRollups) {
			  			if(this.newRollups.hasOwnProperty(scopeId)) {
			  				var newRollupList = this.newRollups[scopeId];
			  				if(angular.isDefined(newRollupList)
			  						&& newRollupList !== null) {
			  					allRollups = allRollups.concat(newRollupList);          
							}
				  		}
					}

					return allRollups;
			  	},

			  	/**
			   	 * get the completed/generated rollups
			   	 * @return completed/generated rollups
			   	 */
			  	getCompletedRollups: function() {
			  		return this.completedRollups;

			  	},

			  	/**
			  	 * get the context sObject by id
			  	 * @param contextSOId id of the sObject to fetch
			  	 * @return the context sObject
			  	 */
			  	getContextSO: function(contextSOId) {
			  		return this.contextObjectsById[contextSOId];

			  	},

			  	/**
			  	 * gets the rollup context sObjects
			  	 * @return the context sObjects
			 	 */
			  	getRollupSObjects: function() {
			  		return this.rollupContextObjects;
			  	}

			}

			/**
			 * Iterator used by JS Cart Eval to handle
			 * Rollup generation
			 * @param conditionParentId condition parent for this item
			 * @param appliedInfo the applied info for this rollup
			 * @param RollupContext the rollup context for this item 
			 */
			function RollupContextItem(conditionParentId, appliedInfo, RollupContext) {
				this.init(conditionParentId, appliedInfo, RollupContext);
			}

			RollupContextItem.prototype = {
				init: function(conditionParentId, appliedInfo, RollupContext) {
					this.conditionParentId = conditionParentId;
					this.appliedInfo = appliedInfo;
					this.RollupContext = RollupContext;

					this.accumulationMap = {};
					this.accumulationCounterMap = {};
					this.createdRollups = [];
			  	},

			  	/**
			   	 * Store new accumulation result
			   	 * @param  accumulationResult The accumulation new result
			   	 * @param  groupedByValue the grouped by value  
			   	 * @return  accumulatin map details
			   	 */
			  	accumulate: function(accumulationResult, groupedByValue) {
			  		this.accumulationMap[groupedByValue] =  accumulationResult;
				
					var accumulationCounter = this.accumulationCounterMap[groupedByValue];
					if(typeof(accumulationCounter) === 'undefined') {
				  		accumulationCounter = 0;

					}

					// increment counter
					this.accumulationCounterMap[groupedByValue] =  ++accumulationCounter;
			  	},

			  	/**
			   	 * create new line item rollup record    
			   	 * @return  accumulation map details
			   	 */ 
			  	createRollupRecords: function() {
			  		//create new record
					var summarySOs = [];
					var newRollups = [];
					for(rollUpKeyValue in this.accumulationMap) {
						if(this.accumulationMap.hasOwnProperty(rollUpKeyValue)) {
							var summaryValue = this.accumulationMap[rollUpKeyValue];
						  	//calculate the final average 
						  	if(this.getRollupOperation() == 'AVG') {
						  		summaryValue = summaryValue/this.accumulationCounterMap[rollUpKeyValue];

						  	}

						  	// new summary sObject
						  	var rollupSummary = {};
						  	// set summary value
						  	rollupSummary[this.getSummaryField()] = summaryValue;
						  	// set scope field
						  	rollupSummary[this.getScopeField()] =  this.conditionParentId;

						  	var groupedByField = this.getGroupByField();
						  	if(groupedByField != null && groupedByField.trim() != '') {
								var rollupSOs = this.getRollupSObjects();
								if(rollupSOs.length > 0) {
							  		// set grouped by field
							  		rollupSummary[nsPrefix+'GroupedByField__c'] = groupedByField;//getFieldLabel(rollupSOs[0], getGroupByField());
							  		// grouped by value
							  		rollupSummary[nsPrefix+'GroupedByDescription__c'] = rollUpKeyValue == null ? null : (''+rollUpKeyValue);
								}
						  	}

						  	//add to collection
						  	newRollups.push(rollupSummary);
						}
					}

					var hasExistingRollups = this.appliedInfo.existingRollups.length > 0;
					var matchingNewRollups = {};
					if(newRollups.length > 0) {
				  		if(!hasExistingRollups) {
							this.appliedInfo.existingRollups = this.appliedInfo.existingRollups.concat(newRollups);
							summarySOs = summarySOs.concat(newRollups);        
				  		} else {          
							for(var i=0; i < newRollups.length; i++) {
					  			var newRollup = newRollups[i];
					  			matchingNewRollups[newRollup[nsPrefix+'GroupedByDescription__c'] || null] = newRollup;
							}
				  		}
					}

					if(hasExistingRollups) {
				  		var oldMatchesByGroup = {};
				  		for(var i=0; i < this.appliedInfo.existingRollups.length; i++) { //if we have existing rollups, make them new rollups
							var existingRollup = this.appliedInfo.existingRollups[i];    
							var matchingNewRollup = matchingNewRollups[existingRollup[nsPrefix+'GroupedByDescription__c'] || null]
							var summaryField = this.getSummaryField();
							if(typeof(matchingNewRollup) !== 'undefined') {
					  			existingRollup[summaryField] = matchingNewRollup[summaryField];
							} else { //set default values
					  			var defVal = this.appliedInfo.defaultRollup[summaryField];
					  			if(typeof(defVal) !== 'undefined') {
										existingRollup[summaryField] = defVal;
					  			}                    
							}

							summarySOs.push(existingRollup);
							oldMatchesByGroup[existingRollup[nsPrefix+'GroupedByDescription__c'] || null] = existingRollup[nsPrefix+'GroupedByDescription__c'] || null;        
					  	}

					  	//check if new groupings exist
					  	for(var i=0; i < newRollups.length; i++) {
					  		var newRollup = newRollups[i];
					  		if(typeof(oldMatchesByGroup[newRollup[nsPrefix+'GroupedByDescription__c'] || null]) === 'undefined') {
					  			summarySOs.push(newRollup);
					  		}         
					  	}      
					}

					// set field expression id and config id
					for(var i=0; i < summarySOs.length; i++) {
						var lineItemRollup = summarySOs[i];
						lineItemRollup['Name'] = this.appliedInfo.Name;
						lineItemRollup[nsPrefix+'FieldExpressionId__c'] = this.appliedInfo.expressionSOId;
					  	lineItemRollup[nsPrefix+'ConfigurationId__c'] = this.appliedInfo.configId;
					}

					//add new line item roll ups to created collection
					this.createdRollups = this.createdRollups.concat(summarySOs);
					this.RollupContext.addCompletedRollups(this.conditionParentId, summarySOs);
					return summarySOs;    
			  	},

			  	/**
			   	 * Clear the rollup accumulators      
			   	 */
			  	clearAccumulators: function() {
			  		this.accumulationMap = {};
					this.accumulationCounterMap = {};
			  	},
			  	getAccumulatorDetails: function() {
			  		return this.accumulationMap;
			  	},
			  	getCallbackExpression: function() {
					return this.appliedInfo.valueExpression;
			  	},
			  	getConditionSO:function() {
					return this.RollupContext.getContextSO(this.conditionParentId);      
			  	},
			  	getCreatedRollups:function() {    
					return this.createdRollups;
			  	},
			  	getFilter: function() {
					return this.appliedInfo.conditionExpression;
			  	},
			  	getGroupByField: function() {
					return this.appliedInfo.groupByField;    
			  	},
			  	getRollupOperation: function() {
					return this.appliedInfo.rollupOperation;
			  	},
			  	getRollupSObjects: function() {
					return this.RollupContext.getRollupSObjects();
			  	},
			  	getScopeField: function() {
					return this.appliedInfo.scopeField;
			  	},
			  	getScopeFieldId: function() {
			  		return this.conditionParentId;					
			  	},    
			  	getSummaryField: function() {
					return this.appliedInfo.updateField;
			  	}
			};
		
			return AppliedExpressionIterator;
		})();
	}	
})();