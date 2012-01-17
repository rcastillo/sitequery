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
 * 
 * @param {Object} crawlOpts url, maxDepth, delay, pageTimeout, maxCrawlTime
 * @param {String}  selector
 * @param {Buffer}  ext loaded js src of jQuery ext
 * @todo Make crawl options and opt struct
 */
var SiteQuery = function (crawlOpts, selector, ext) {
  this.siteCrawl = new SiteCrawl(crawlOpts);
  this.ext = ext;
  this.selector = selector;
}


SiteQuery.prototype = {
  toObservable: function () {
    var self = this;
    return self.siteCrawl.toObservable().SelectMany(function(crawlResult){
      return createObservablejQuery(crawlResult.body, 
                                    self.selector, 
                                    self.ext, 
                                    crawlResult  && crawlResult.crawlLink.url ? 
                                      crawlResult.crawlLink.url.href : 'ROOT');
    });
  }
}

exports.SiteQuery = SiteQuery;