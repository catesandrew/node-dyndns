var async = require('async'),
    fs    = require('fs'),
    _     = require('underscore'),
    plist = require('plist'),
    path  = require('path'),
    exec  = require('child_process').exec;

var readPlist = function(callback, path) {
  async.series([
    function(callback){
      path = path || "";
      var safe_path = path.replace(' ', '\\ ');

      try {
        // Query the entry
        var stats = fs.lstatSync(path);

        if (stats.isFile()) {
          exec('plutil -convert xml1 ' + safe_path,
            function (err, stdout, stderr) {
              if (err) { callback(err); }
              callback(null);
          });
        }
      }
      catch (e) {
        callback(e);
      }
    },
    function(callback){
      plist.parseFileSync(path, function(err, obj) {
        if (err) { callback(err); }
        callback(null, obj);
      });
    },
  ],
  function(err, results){
    if (err) { callback(err); }
    if (results.length > 1) {
      callback(null, results[1]);
    }
  });
};

var Utils = function(){};
Utils.prototype = {
  readPlists:function(callback) {
    async.parallel({
      userPrefs: function(callback) {
        var user_prefs_file = utils.expandHomeDir("~/Library/Preferences/org.afraid.dyndns.plist");
        readPlist(function(err, data) {
          //if (err) { callback(err); }
          if (err) {
            callback(null, {});
          }
          else if (data) {
            if (data.length > 0) {
              callback(null, data[0]);
            } else {
              callback(null, data);
            }
          }
        }, user_prefs_file);
      },
      dataStore: function(callback) {
        var data_file = utils.expandHomeDir("~/Library/Application Support/DynDns/DynDns.plist");
        readPlist(function(err, data) {
          //if (err) { callback(err); }
          if (err) {
            callback(null, {});
          }
          else if (data) {
            if (data.length > 0) {
              callback(null, data[0]);
            } else {
              callback(null, data);
            }
          }
        }, data_file);
      }
    },
    function(err, results) {
      if (err) { callback(err); }
      callback(null, results);
    });
  },
  writePlist:function(callback, obj, output) {
    var data = utils.exportToPlist(obj);
    fs.writeFile(output, data, function (err) {
      if (err) { callback(err); }
      callback(null, 'successfully saved file to ' + output);
    });
  },
  exportToPlist:function(obj) {
    var headers = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0">'
    ];

    var data =
      headers.join('\n') +
      plist.stringify(obj) +
      "\n</plist>";

    return data;
  },
  expandHomeDir:function(dir){
    dir = dir || "";
    if (dir.indexOf("~") === 0) {
      var home = process.env.HOME;
      var splits = dir.split("~");

      if (splits.length > 0){
        dir = home + splits[1];
      } else {
        dir = home;
      }
    }
    return dir;
  }
};
var utils = new Utils();
exports.utils = utils;

