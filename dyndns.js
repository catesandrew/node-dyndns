/*
 * This script downloads the shows from eztv.it/showlist/
 * Its used in conjunction with tvshows app to update your show list.
 * 1) This is called first to get available shows.
 */
var async = require('async')
  , fs = require('fs')
  , _ = require('underscore')
  , program = require('commander')
  , nodeio = require('node.io');

var utils = require('./utils.js').utils;
var consts = require('./dyndns-constants.js').constants;

program
  .version('0.1')
  .description( "This script updates your ip address" )
  .option('-s, --store-file [file]', 'optional destination file to save dyndns plist to', '~/Library/Application Support/DynDns/DynDns.plist')
  .option('-d, --debug', 'output extra debug information');

program.on('--help', function(){
  console.log(program.description());
});

program.parse(process.argv);

var verbose = function() {
  if (program.debug) {
    console.log.apply(null, arguments);
  }
};

var scrapeWhatIsMyIp = function(_callback) {
  var methods = {
    input:false,
    run:function() {
      var self = this;
      this.get(consts.IP_ADDRESS_SERVICE_URL, function(err, data) {
        if (err) {
          this.exit(err);
        } else {
          this.emit(data);
        }
      });
    }
  };

  var job = new nodeio.Job({auto_retry:true, timeout:10, retries:3}, methods);
  nodeio.start(job, {}, function(err, data) {
    if (err) { callback(err); }
    _callback(null, data);
  }, true);
};

var scrapeGeMyUpdateUrls = function(_callback, url) {
  var methods = {
    input:false,
    run:function() {
      var self = this;
      this.get(url, function(err, data) {
        if (err) {
          this.exit(err);
        } else {
          data = data || "";
          var records = data.split('\n');
          var emits = [];
          records.forEach(function(record) {
            record = record || "";
            var fields = record.split('|');
            if (fields.length > 1) {
              emits.push({
                host:fields[0],
                ip:fields[1],
                updateUrl:fields[2]
              });
            }
          });
          this.emit(emits);
        }
      });
    }
  };

  var job = new nodeio.Job({auto_retry:true, timeout:10, retries:3}, methods);
  nodeio.start(job, {}, function(err, data) {
    if (err) { callback(err); }
    _callback(null, data);
  }, true);
};

var scrapeUpdateMyIP = function(_callback, records) {
  var methods = {
    input:records,
    run:function(record) {
      var self = this;
      this.get(record.updateUrl, function(err, data) {
        if (err) {
          this.exit(err);
        } else {
          data = data || "";
          this.emit(record.host + " [" + record.ip  + "]: " + data);
        }
      });
    }
  };
  var job = new nodeio.Job({auto_retry:true, timeout:10, retries:3}, methods);
  nodeio.start(job, {}, function(err, data) {
    if (err) { callback(err); }
    _callback(null, data);
  }, true);
};

var readPlistsAndScrape = function(callback) {
  async.parallel({
    ip: function(callback) {
      scrapeWhatIsMyIp(function(err, ips) {
        if (err) { callback(err); }
        callback(null, ips);
      });
    },
    plists: function(callback) {
      utils.readPlists(function(err, plist) {
        if (err) { callback(err); }
        callback(null, plist);
      });
    }
  },
  function(err, results) {
    if (err) { callback(err); }
    callback(null, results);
  });
};

readPlistsAndScrape(function(err, data) {
  if (err) {
    console.error(err);
    process.exit();
  }

  var needIpUpdate = false;
  var dataStore = data.plists.dataStore || {};
  _.defaults(dataStore, {
    IPAddress: '',
    Version  : '1'
  });

  var current_ip = data.ip[0];
  if (dataStore.IPAddress !== current_ip) {
    needIpUpdate = true;
  }

  // to generate your sha-1
  // echo -n "username|password" | openssl sha1
  var userPrefs = data.plists.userPrefs;
  userPrefs = _.defaults(userPrefs || {}, {
    AccountHash: '',
    AdminEmail : '',
    Host       : ''
  });

  if (needIpUpdate) {
    var host_record_url = consts.UPDATE_URL + userPrefs.AccountHash;
    scrapeGeMyUpdateUrls(function(err, records) {
      if (err) { callback(err); }

      var found;
      _.some(records, function(record) {
        if (record && (record.host === userPrefs.Host)) {
          found = record;
        }
      }, this);

      if (found) {
        scrapeUpdateMyIP(function(err, data) {
          if (err) { callback(err); }

          dataStore.IPAddress = current_ip;
          var dbFile = utils.expandHomeDir(program.storeFile);
          utils.writePlist(function(err, obj) {
            if (err) { console.error(err); }
            verbose(obj);
            }, dataStore, dbFile
          );
        }, [found]);
      }
    }, host_record_url);
  }
});
