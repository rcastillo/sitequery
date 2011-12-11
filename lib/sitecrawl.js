/**
 * @fileoverview Reactive SiteCrawl module
 * @author roger.castillo@loku.com (Roger Castillo)
 */
var Rx = require('rx').Rx;
var request = require('request');
var jsdom = require('jsdom');
var _ = require('underscore');
var URL = require('url');
var redis = require('redis');
var rclient = redis.createClient();
var createObservablejQuery = require('./rxjquery.js').createObservablejQuery;


var RobotsParser = require('robots').RobotsParser;
var robotsParser = new RobotsParser();



/**
 * Link parsed from crawl result
 * @constructor
 * @param {URL} url
 * @param {Integer} depth
 * @param {URL} parentUrl
 */
var CrawlLink = function(url, depth, parentUrl){
  var urlObj;
  if ((typeof url) == 'string') {
    urlObj = URL.parse(url);
  } else {
    urlObj = url;
  }
  this.url = urlObj;
  this.depth = depth;
  this.parentUrl = parentUrl;
}

exports.CrawlLink = CrawlLink;

/**
 * Output of crawled web page
 * @constructor
 * @param {CrawlLink} crawlLink
 * @param {String} body
 */
var CrawlResult = function(crawlLink, body) {
  this.crawlLink = crawlLink;
  this.body = body;
}

exports.CrawlResult = CrawlResult;

/**
  * Creates the observable crawl step
  * @param {String} crawlKey a key that identifies a crawl traversal instance
  * @param {CrawlLink} crawlLink
  * @return {Rx.Observable}
  */
function crawlStep(crawlKey, crawlLink) {
  return Rx.Observable.Create(function(obs) {
    rclient.sismember(crawlKey + '-crawlist', crawlLink.url.href, function(err, crawled){
      if (!err && !crawled) {
        request(crawlLink.url.href, function (error, response, body) {
          if (error == null) {
            // successful crawl steps add to list
            rclient.sadd(crawlKey + '-crawlist', crawlLink.url.href);
            var result = new CrawlResult(crawlLink, body);
            //console.log(result);
            obs.OnNext(result); 
            obs.OnCompleted();
          } else {
            obs.OnError(error);
          }
        });
      } else {
        obs.OnCompleted();
      }
    });
    return function(){};
  });
}

exports.crawlStep = crawlStep;

/**
 * Object that represents a breadth-first traversal of a site, filtering
 * filtered for robots.txt up to n levels deep
 * @contructor
 * @param {String} url
 * @param {Integer} maxDepth
 * @param {Integer} delay time between request to the site
 * @param {Integer} maxCrawlTime [default 5x delay] maximum time the crawl will wait for new pages 
 */
var SiteCrawl = function (url, maxDepth, delay, maxCrawlTime) {
  self = this;
  this.url = URL.parse(url);
  
  // setup the robots parser
  robotsParser.setUrl(URL.resolve(url, '/robots.txt'), function(parser, success) {
    if (success) {
      self.robotsParser = parser;
    }
  });
  
  this.maxDepth = maxDepth
  this.delay = delay;
  this.maxCrawlTime = maxCrawlTime || (delay * 5);
  this.instanceKey = 'sitecrawl-' + Math.floor(Math.random() * 100000);
  this.crawling = false;
  this.crawlQueue = [];
}

SiteCrawl.prototype = {
  
  stopCrawler:function() {
    this.crawling = false;
  },
  
  runCrawler:function(obs) {
    var self = this;
    // flag to control start/stop
    self.crawling = true;
    Rx.Observable.While(
      function() {return self.crawling},
      Rx.Observable.If(
        function(){return self.crawlQueue.length > 0;},
        // if there are items in the crawl queue
        Rx.Observable.Defer(function (){
          var nextCrawlStep = self.crawlQueue.pop();
          // stagger the crawls by self.delay ms
          var delayedCrawlStep = nextCrawlStep.Delay(self.delay);
          return self.selectForCrawlLinks(delayedCrawlStep)}),
        // no items, pulse the heartbeat
        Rx.Observable.Return('nop')
        .Delay(self.maxCrawlTime))
    ).Subscribe(function(crawlResult){
        // if not a heartbeat pulse
        if (crawlResult != 'nop') {
          // return the crawlResult to the
          // crawl observer
          obs.OnNext(crawlResult);
        } else {
          if (self.crawlQueue.length ==0) {
            // we have waited maxCrawlTime for new pages
            // and the queue is empty, signal complete
            obs.OnCompleted();
          }
        }
      },
      function(exn){
        obs.OnError(exn);
      });
  },
  
  selectForCrawlLinks: function(cs){
    var self = this;
    return cs.Select(function (crawlResult) {
            createObservablejQuery(crawlResult.body, 'a')
              .Where(function(elem) {                
                // filter non-nul and anchor elem with hrefs
                return elem && elem.attr('href') != null;}) 
                .Select(function(elem) {
                  // project next crawl links
                  return new CrawlLink(URL.parse(URL.resolve(crawlResult.crawlLink.url, elem.attr('href'))), 
                                                             crawlResult.crawlLink.depth + 1,
                                                             crawlResult.crawlLink.url);
            })
              .Where(function(crawlLink){
                // filter craw links stream for this domain
                //   whose depth is  no greater that the set
                //   max depth AND that are crawlable per robots.txt
                
                //console.log(self.robotsParser);
                //console.log('can crawl:' + self.robotsParser.canFetchSync(crawlLink.url.pathname));
                return (crawlLink.url.host == self.url.host) && self.robotsParser.canFetchSync(crawlLink.url.pathname); 
              })
                .Subscribe(function(crawlLink){
                  if (crawlLink.depth < self.maxDepth){
                    // queue the next crawl step
                    self.crawlQueue.push(crawlStep(self.instanceKey, crawlLink));
                  }
                },
                function(exn){
                  // handle parse error
                }, 
                function(){
                  // parsing complete
                });
           return crawlResult;
         }) 
  },
  
  toObservable: function () {
    var self = this;
    return Rx.Observable.Create(function(obs){
      // prime the crawl
      self.crawlQueue.push(crawlStep(self.instanceKey, new CrawlLink(self.url, 0)));
     
      // run the observed crawl
      self.runCrawler(obs);
      return function(){};
    });
  }
}
exports.SiteCrawl = SiteCrawl;
