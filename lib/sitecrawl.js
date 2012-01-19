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
var createObservableSAX = require('./rxsax').createObservableSAX;


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
 * @param {Object} crawlOpts 
 *     url, root URL
 *     [maxDepth], depth from root to crawl - default 2
 *     [delay], (ms) between hits to site - default 1s, 
 *     [pageTimeout], (ms) max time to wait for new page default 5s, 
 *     [maxCrawlTime], (ms) - default 10s
 */
var SiteCrawl = function (crawlOpts) {
  var self = this;
  var originalUrl = URL.parse(crawlOpts.url);
  // default protocol HTTP if not spec'd
  this.url = originalUrl.protocol ? originalUrl : URL.parse('http://' + crawlOpts.url);
  
  // setup the robots parser
  robotsParser.setUrl(URL.resolve(crawlOpts.url, '/robots.txt'), function(parser, success) {
    if (success) {
      self.robotsParser = parser;
    }
  });
  
  this.maxDepth    = crawlOpts.maxDepth || 2;
  this.delay       = crawlOpts.delay || 1000;
  this.pageTimeout = crawlOpts.pageTimeout || (crawlOpts.delay * 5);
  this.maxCrawlTime = crawlOpts.maxCrawlTime || 10000;
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
    
    // setup the delayed end signal for crawl
    var endSignal = Rx.Observable.Return('end').Delay(this.maxCrawlTime);
    
    // flag to control start/stop
    self.crawling = true;
    Rx.Observable.While(
      function() {return self.crawling},
      Rx.Observable.If(
        function(){return self.crawlQueue.length > 0;},
        // if there are items in the crawl queue
        Rx.Observable.Defer(function (){
          // dequeue
          var nextCrawlStep = self.crawlQueue[0];
          self.crawlQueue = self.crawlQueue.slice(1);
          // stagger the crawls by self.delay ms
          var delayedCrawlStep = nextCrawlStep.Delay(self.delay);
          return self.selectForCrawlLinks(delayedCrawlStep)}),
        // ELSE no items, pulse the heartbeat
        Rx.Observable.Return('nop')
        .Delay(self.pageTimeout)
     )
    ).Merge(endSignal)
      .Subscribe(function(crawlResult){
        // check for end signal
        if (crawlResult == 'end'){
          obs.OnCompleted();
        }
        
        // if not a heartbeat pulse
        if (crawlResult != 'nop') {
          // return the crawlResult to the
          // crawl observer
          obs.OnNext(crawlResult);
        } else {
          if (self.crawlQueue.length ==0) {
            // we have waited pageTimeout for new pages
            // and the queue is empty, signal complete
            obs.OnCompleted();
          }
        }
      },
      function(exn){
        obs.OnError(exn);
      },
      function(){
        // handle case where crawler stopped
        // and invariant sets completed
        obs.OnCompleted();
      });
  },
  
  selectForCrawlLinks: function(cs){
    var self = this;
    return cs.Select(function (crawlResult) {
            createObservableSAX(crawlResult.body, 'a')
              .Where(function(elem) {
                // filter non-nul and anchor elem with hrefs
                return elem && elem.attributes.href != null;}) 
                .Select(function(elem) {
                  // project next crawl links
                  return new CrawlLink(URL.parse(URL.resolve(crawlResult.crawlLink.url, elem.attributes.href)), 
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
      return function(){
        // Disposing stops the crawler
        self.stopCrawler();
      };
    });
  }
}
exports.SiteCrawl = SiteCrawl;
