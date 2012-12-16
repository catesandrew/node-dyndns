var define = function (object, name, value) {
  var key;

  // if an object, loop the properties for the definitions
  if (typeof name === "object") {
    for (key in name) {
      if (name.hasOwnProperty(key)) {
        define(object, key, name[key]);
      }
    }
    // otherwise, just operate on a single property
  } else {
    Object.defineProperty(object, name, {
      value:        value,
      enumerable:   true,
      writable:     false,
      configurable: false
    });
  }

  return object;
};

var constants = {};
define(constants, {
  IP_ADDRESS_SERVICE_URL : "http://automation.whatismyip.com/n09230945.asp",
	UPDATE_URL : "http://freedns.afraid.org/api/?action=getdyndns&sha="
});

exports.constants = constants;

