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
 */
var SiteQuery = function (url, maxDepth, delay, selector) {
  this.siteCrawl = new SiteCrawl(url, maxDepth, delay);
  this.selector = selector;
}


SiteQuery.prototype = {
  toObservable: function () {
    var self = this;
    return self.siteCrawl.toObservable().SelectMany(function(crawlResult){
      return createObservablejQuery(crawlResult.body, self.selector)
    });
  }
}

exports.SiteQuery = SiteQuery;