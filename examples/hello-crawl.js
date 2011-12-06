/**
 * @fileoverview Example reactive SiteCrawl
 * @author roger.castillo@loku.com (Roger Castillo)
 */

var SiteCrawl = require('../lib/sitecrawl').SiteCrawl;

// create a new SiteCrawl of depth 2 with a delay of 1s between next page
// Note: Webcrawling is delayed and will not be executed
// until Subscription
var siteCrawl = new SiteCrawl('http://loku.com',  2, 1000);

// ask for the observable sequence and subscribe for the CrawlResult(s)
siteCrawl.toObservable().Subscribe(function(crawlResult) {                 
  console.log(crawlResult.crawlLink.url.href);
},
// on err
function(exn){
  console.log('Ooo dem Dukes...with exception:' + exn);
},
// on crawl complete
function(){
  console.log('SiteCrawl complete');
});