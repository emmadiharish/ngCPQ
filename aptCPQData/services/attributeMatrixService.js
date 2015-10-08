/**
 *  Apttus Config & Pricing
 *  AttributeMatrix
 *   
 *  @2015-2016 Apttus Inc. All rights reserved.
 *
 * This service, AttributeMatrixService, contains a single method
 * for processing ABC (Attribute Based Configuration) rules
 * 
 */
;(function() {
	angular.module('aptCPQData')
		.service('AttributeMatrix', AttributeMatrix);

	AttributeMatrix.$inject = ['lodash'];

	function AttributeMatrix(_) { 
		var service = this;

		/** -- Service scope variables -- */
		var dataBits,
			dataLength,
			padCount,
			nodeCount,
			directorySize,
			directoryStart,
			labelSize,
			letterStart,
			l2Size = 15,
			l1Size = l2Size*l2Size,
			l1Bits,
			l2Bits,
			sectionBits;

		/** -- Attach public methods -- */
		service.processAttributeMatrices = processAttributeMatrices;
		service.getAvailableValues = getAvailableValues;		
		service.getNodeByIndex = getNodeByIndex;

		/** -- Method declarations -- */
	    function init(data) {
	    	dataBits = new BitString( data );        
	        dataLength = dataBits.length;
	        //fetch pad count, from end of data (3 bits)
	        padCount = dataBits.getBitNumber(dataLength - 3, 3);
	        //get node count (20 bits ending at length - 3 bits)
	        nodeCount = dataBits.getBitNumber(dataLength - 23, 20);
	        //get directory size (20 bits ending at length - 23 bits)
	        directorySize = dataBits.getBitNumber(dataLength - 43, 20);
	        //calculate directory start index
	        directoryStart = directorySize <= 0 ? 0 : dataLength - padCount - directorySize - 43;
	        //calculate the label sizes (4 bits, after trie bit vector)
	        labelSize = dataBits.getBitNumber(nodeCount * 2 + 1, 4);
	        // The position of the first bit of the data in 0th node.
	        letterStart = nodeCount * 2 + 5;	        
	        // calculate L1 bits width
	        l1Bits = Math.floor(Math.log10(nodeCount * 2 + 1) / Math.log10(2)) + 1;
	        // calculate L2 bits width
	        l2Bits = Math.floor(Math.log10(l1Size) / Math.log10(2)) + 1;
	        // calculate bits in directory entry
	        sectionBits = (l1Size / l2Size - 1) * l2Bits + l1Bits;
	    }

	    /**
	      Retrieve the root node. You can use this node to obtain all of the other
	      nodes in the trie.
	      */
	    function getRoot() {
	    	return getNodeByIndex(0);

	    }

	    /**
	     * Retrieve the FrozenTrieNode of the trie, given its index in level-order.
	     */
	    function getNodeByIndex(index, parentNode) {
	    	// retrieve the node letter.   
	        var letterOffset = letterStart + ((index-1) * labelSize);    
	        var letter = dataBits.getBitNumber(letterOffset, labelSize);
	        // get index of first child
	        var firstChild = select(0, index+1) - index;
	        // Nodes are encoded in level order, so child of first node
	        // must be past the 0 in this position
	        var childOfNextNode = select( 0, index + 2) - index - 1;

	        return new AptValueMatrixNode(service, index, letter, firstChild, parentNode, childOfNextNode - firstChild);
	    }

	    /**
	     * Returns the position of the y'th 0 or 1 bit, depending on the "which"
	     * parameter.
	     */
	    function select(which, y) {
	    	var high = nodeCount * 2 + 1;        
	        var low = -1;
	        var val = -1;

	        while (high - low > 1) {
	            var probe = (high + low) / 2 | 0;            
	            var selectRank = rank(which, probe);

	            if (selectRank === y) {
	                // We have to continue searching after we have found it,
	                // because we want the _first_ occurrence.
	                val = probe;
	                high = probe;
	            } else if (selectRank < y) {
	                low = probe;
	            } else {
	                high = probe;
	            }
	        }

	        return val;
	    }

	    /**
	     * Returns the number of 1 or 0 bits (depending on the "which" parameter) to
	     * to and including position x.
	     */
	    function rank(which, x) {
	    	if ( which === 0 ) {
	            return x - rank(1, x) + 1;
	        }

	        var selectRank = 0;              
	        var o = x;
	        var sectionPos = 0;

	        if (o >= l1Size ) {
	            sectionPos = (o / l1Size | 0) * sectionBits;
	            selectRank = dataBits.getBitNumber(directoryStart + (sectionPos - l1Bits), l1Bits);
	            //calculate bits which have not been summarized
	            o = o % l1Size;            
	        }

	        if (o >= l2Size) {
	            sectionPos += (o / l2Size | 0) * l2Bits;
	            selectRank += dataBits.getBitNumber(directoryStart + (sectionPos - l2Bits), l2Bits);
	        }

	        selectRank += dataBits.countOnesBits(x - x % l2Size, x % l2Size + 1);

	        return selectRank;
	    }

	    /**
	     * Process the attribute matrix rules
	     * @param attributeSO context attribute object 
	     * @param matrixInfos the AttributeMatrixDO from server
	     * @param the attribute field metadata map
	     * @return a mapping of the available values by field API name
	     */
	    function processAttributeMatrices(attributeSO, matrixInfos, fieldMetadata) { //} bitMap, hashKeys, reverseKeys) {
			var availableValues = {};
			for(var i = 0, max = matrixInfos.length; i < max; i++) {				
				var matrixInfo = matrixInfos[i];
				//create reverse keys and regular keys object				
				if(angular.isUndefined(matrixInfo.reverseKeys)) {
					//store reverse key lookup
					matrixInfo.reverseKeys = {};
					var keyMap = JSON.parse(matrixInfo.hashKeys);
			        for (var key in keyMap) {
			        	if(keyMap.hasOwnProperty(key)) {
			        		matrixInfo.reverseKeys[keyMap[key]] = key;
			        	}
			        }
			        //update hash key with actual object bindings
			        matrixInfo.hashKeys = keyMap;
			    }

				var columns = JSON.parse(matrixInfo.columns).columns;
				var items = [];
				for(var columnIdx in columns) {
					if(columns.hasOwnProperty(columnIdx)) {
						var fieldName = columns[columnIdx];
						var fieldType = fieldMetadata[fieldName].FieldType.toLowerCase();
						var isSelectType = (fieldType === 'multipicklist') || (fieldType === 'picklist');							
						var isMultiSelect = fieldType === 'multipicklist';						
						var item = {
							'Id':fieldName,
							'value':attributeSO[fieldName],
							'isMultiSelect':isMultiSelect,
							'isSelectType':isSelectType
						};
						//add item to collection
						items.push(item);
					}
				}

				var validCombinations =  getAvailableValues(items, matrixInfo);
				for(fieldName in validCombinations) {
					var availableForField = availableValues[fieldName];
					if(angular.isUndefined(availableForField)) {
						availableForField = validCombinations[fieldName];
					} else {
						//intersection of available values
						availableForField = _.intersection(availableForField, validCombinations);
					}
					//set available values
					availableValues[fieldName] = availableForField;
				}
			}

			return availableValues;
		}

	    /**
	     * Get the available values for the given combination
	     * @param items the items to test
	     * @param matrixInfos the AttributeMatrixDO
	     * @return a mapping of the available values by item id
	     */
	    function getAvailableValues(items, matrixInfo) {
	        //init values
	        init(matrixInfo.bitMap);

	        var level = 0;
	        var nodesForLevel = getRoot().getChildren();
	        var availableValues = {};

	        while(level < items.length && 
	                nodesForLevel.length > 0) {
	        	var levelInput = items[level];
	            var levelSize = nodesForLevel.length;
	            var isMultiSelect = levelInput.isMultiSelect;
	            var isSelectType = levelInput.isSelectType;

	            var nodeKeys = {};
	            var hasNodeKey = false;
	            if(angular.isDefined(levelInput)
	            		&& angular.isDefined(levelInput.value)) {
	            	var nodeKey = matrixInfo.reverseKeys[levelInput.value];
	              	if(angular.isDefined(nodeKey)) {
	              		nodeKeys[nodeKey] = nodeKey;
	              		hasNodeKey = true;
	              	}
	            }
	             
	            //console.log('level=' + level + '  nodeKey=' + nodeKey + ' node.letter==' + node.letter);
	            if(!hasNodeKey) { //wildcards     
	            	if(level < items.length - 1) {
	                    for(var i=0; i < levelSize; i++) {                    
	                        var node = nodesForLevel.shift();                        
	                        var children = node.getChildren();
	                        for(var j=0; j < children.length; j++) {                        
	                            //add back for next level inspection
	                            var child = children[j];
	                            nodesForLevel.push(child);
	                        }
	                    }
	                }
	            } else {
	                for(var i=0; i < levelSize; i++) {
	                    var node = nodesForLevel.shift();
	                    var splitLetter = [node.letter];
	                    if(isMultiSelect) {
	                    	splitLetter = matrixInfo.hashKeys[node.letter].split(';');

	                    }

	                    for(var p=0; p < splitLetter.length; p++) {
	                    	var letter = splitLetter[p];	                    	
	                    	if(angular.isDefined(nodeKeys[letter])) { //matching node
	                        	if(level == items.length - 1) {
	                            	nodesForLevel.push(node);

		                        } else { //willd check next level
		                            var children = node.getChildren();
		                            for(var j=0; j < children.length; j++) {                        
		                                //add back for next level inspection
		                                var child = children[j];                        
		                                nodesForLevel.push(child);
		                            }
		                        }
	                      	}
	                    }
	                }                    
	            }

	            level+=1;
	        }
	        //console.log('results=');
	        //console.log(nodesForLevel);

	        //populate dropdowns
	        var addedColumns = {};
	        var addedColumnLabels = {};
	        if(angular.isDefined(items)
	                && items != null) {                
	            for(var i = level -1; i >= 0; i--) {                
	                addedColumns[i] = [];
	                addedColumnLabels[i] = [];

	                var valuesForLevel = [];
	                var item = items[i];
	                var levelSize = nodesForLevel.length;
	                for(var j=0; j < levelSize; j++) {
	                    var node = nodesForLevel.shift();
	                    if(!angular.isDefined(addedColumns[i][node.letter])) {                       
	                        var optionValue = matrixInfo.hashKeys[node.letter];
	                        if(isSelectType) {	                                 
	                          if(isMultiSelect) {
	                            var splitOptions = optionValue.split(';');
	                            valuesForLevel = valuesForLevel.concat(splitOptions);                           
	                          } else {
	                            valuesForLevel.push(optionValue);
	                          }
	                        } else {
	                          valuesForLevel.push(optionValue);

	                        }

	                        addedColumns[i][node.letter] = true;
	                        addedColumnLabels[i][optionValue] = node.letter;
	                    }

	                    var parentNode = node.getParent();
	                    if(parentNode != null) {
	                        nodesForLevel.push(parentNode);

	                    }
	                }

	                availableValues[item.Id] = valuesForLevel;
	            }
	        }

	        return availableValues;
	    }	
	}

	/**
	 * This class is used for traversing the succinctly encoded trie.
	 */
	function AptValueMatrixNode(trie, index, letter, firstChild, parent, childCount) {
	    var children = null;
	    var node = this;

	   	/** -- Attach public methods -- */
	    node.getParent = getParent;
	    node.getChild = getChild;
	    node.getChildren = getChildren;
	    node.getChildCount = getChildCount;

	    /** -- Attach public variables -- */
	    node.trie = trie;
	    node.index = index;
	    node.letter = letter;
	    node.firstChild = firstChild;
	    node.parent = parent;
	    node.childCount = childCount;

	    /**
	     * Returns the number of children.
	     */
	    function getChildCount() {
	        return node.childCount;
	    }

	    /**
	     * Returns the FrozenTrieNode for the given child.    
	     * @param index The 0-based index of the child of this node. For example, if
	     * the node has 5 children, and you wanted the 0th one, pass in 0.
	     */
	    function getChild(index) {
	        var result = null;        
	        return node.trie.getNodeByIndex(node.firstChild + index, node);

	    }

	    /**
	     * Returns the FrozenTrieNode for all children
	     */
	    function getChildren() {
	        if(node.children == null) {
	            node.children = [];
	            for(var i=0; i < node.childCount; i++) {
	                node.children.push(getChild(i));
	            }
	        }

	        return node.children;
	    }

	    /**
	     * Return the parent node
	     */
	    function getParent() {        
	        return node.parent;
	    }
	}

	BitString.MaskTop = [
	    0x3f, 0x1f, 0x0f, 0x07, 0x03, 0x01, 0x00 
	];

	BitString.BitsInByte = [ 
	    0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1, 2, 2, 3, 2, 3, 3, 4, 2,
	    3, 3, 4, 3, 4, 4, 5, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 5, 2, 3,
	    3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3,
	    4, 3, 4, 4, 5, 2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6, 2, 3, 3, 4,
	    3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6, 3, 4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5,
	    6, 6, 7, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 5, 2, 3, 3, 4, 3, 4,
	    4, 5, 3, 4, 4, 5, 4, 5, 5, 6, 2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5,
	    6, 3, 4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5, 6, 6, 7, 2, 3, 3, 4, 3, 4, 4, 5,
	    3, 4, 4, 5, 4, 5, 5, 6, 3, 4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5, 6, 6, 7, 3,
	    4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5, 6, 6, 7, 4, 5, 5, 6, 5, 6, 6, 7, 5, 6,
	    6, 7, 6, 7, 7, 8 
	];

	BitString.AlphabetDigits = {
	    "A" : 0, "B" : 1, "C" : 2, "D" : 3, "E" : 4, "F" : 5, 
	    "G" : 6, "H" : 7, "I" : 8, "J" : 9, "K" : 10, "L" : 11, 
	    "M" : 12, "N" : 13, "O" : 14, "P" : 15, "Q" : 16, "R" : 17, 
	    "S" : 18, "T" : 19, "U" : 20, "V" : 21, "W" : 22, "X" : 23, 
	    "Y" : 24, "Z" : 25, "a" : 26, "b" : 27, "c" : 28, "d" : 29, 
	    "e" : 30, "f" : 31, "g" : 32, "h" : 33, "i" : 34, "j" : 35, 
	    "k" : 36, "l" : 37, "m" : 38, "n" : 39, "o" : 40, "p" : 41, 
	    "q" : 42, "r" : 43, "s" : 44, "t" : 45, "u" : 46, "v" : 47, 
	    "w" : 48, "x" : 49, "y" : 50, "z" : 51, "0" : 52, "1" : 53, 
	    "2" : 54, "3" : 55, "4" : 56, "5" : 57, "6" : 58, "7" : 59, 
	    "8" : 60, "9" : 61, "-" : 62, "_" : 63
	};

	/**
	 * Given a string of data, the BitString class supports
	 * reading or counting a number of bits from an arbitrary position in the
	 * string.
	 */     
	function BitString(str) {
	    var encodingWidth = 6,
	    	bytes = str;
	    this.length = bytes.length * encodingWidth;
	    	

	    /** -- Attach public methods -- */
	   	this.getData = getData;
	   	this.getBitNumber = getBitNumber;
	   	this.countOnesBits = countOnesBits;

	    /**
	     * Returns the internal string of bytes
	     */
	    function getData() {
	        return bytes;

	    }

	    /**
	     * Returns a decimal number, consisting of a certain number, numDigits, of bits
	     * starting at a certain position, startPosition.
	     */
	    function getBitNumber(startPosition, numDigits) {
	        // case 1: bits lie within the given byte
	        if ((startPosition % encodingWidth) + numDigits <= encodingWidth) {
	            return (BitString.AlphabetDigits[ bytes[ startPosition / encodingWidth | 0] ] & BitString.MaskTop[ startPosition % encodingWidth ]) >> 
	                (encodingWidth - startPosition % encodingWidth - numDigits);

	        // case 2: bits lie incompletely in the given byte
	        } else {
	            var result = (BitString.AlphabetDigits[ bytes[startPosition / encodingWidth | 0]] & 
	                BitString.MaskTop[ startPosition % encodingWidth]);

	            var remainder = encodingWidth - startPosition % encodingWidth;
	            startPosition += remainder;
	            numDigits -= remainder;

	            while (numDigits >= encodingWidth) {
	                result = (result << encodingWidth) | BitString.AlphabetDigits[bytes[ startPosition / encodingWidth | 0]];
	                startPosition += encodingWidth;
	                numDigits -= encodingWidth;
	            }

	            if (numDigits > 0) {
	                result = (result << numDigits) | (BitString.AlphabetDigits[bytes[startPosition / encodingWidth | 0]] >> 
	                    (encodingWidth - numDigits));
	            }

	            return result;
	        }
	    }

	    /**
	     * Counts the number of bits set to 1 starting at position p and
	     * ending at position startPosition + numDigits
	     */
	    function countOnesBits(startPosition, numDigits) {
	        var count = 0;
	        while(numDigits >= 8) {
	            count += BitString.BitsInByte[getBitNumber(startPosition, 8)];
	            startPosition += 8;
	            numDigits -= 8;
	        }

	        return count + BitString.BitsInByte[getBitNumber(startPosition, numDigits)];
	    }
	}
})();