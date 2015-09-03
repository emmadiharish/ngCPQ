
/*
* @prependString - pattern which will be repeated and prepended to current String
* @times -  number of times the pattern will be repated
* 
This function will prepend the String with the specified  pattern repeated by the specified number of times
*/
String.prototype.lpad = function ( prependString , repeat) {
			
	if ( repeat == undefined || repeat <= 0 || prependString == undefined || prependString == "") {
		return this;
	}
	
	var padding = "";

	for (var index = 0; index < repeat ; index++ ) {
		padding = padding + prependString;
	}

	return padding + this;
};