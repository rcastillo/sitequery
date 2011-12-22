/**
 * @fileoverview Reactive SiteQuery module
 * @author roger.castillo@loku.com (Roger Castillo)
 */

var Rx = require('rx').Rx;
var request = require('request');
var jsdom = require('jsdom');
var _ = require('underscore');
var URL = require('url');


var createObservablejQuery = require('./rxjquery.js').createObservablejQuery;

var SiteCrawl = require('./sitecrawl').SiteCrawl;


/**
 * SiteQuery create a observable sequence of jQuery element(s)
 * @constructor
 * @param {String}  url
 * @param {Integer} maxDepth
 * @param {Integer} delay
 * @param {String}  selector
 * @param {Buffer}  ext loaded js src of jQuery ext
 */
var SiteQuery = function (url, maxDepth, delay, selector, ext) {
  this.siteCrawl = new SiteCrawl(url, maxDepth, delay);
  this.ext = ext;
  this.selector = selector;
}


SiteQuery.prototype = {
  toObservable: function () {
    var self = this;
    return self.siteCrawl.toObservable().SelectMany(function(crawlResult){
      return createObservablejQuery(crawlResult.body, self.selector, self.ext)
    });
  }
}

exports.SiteQuery = SiteQuery;