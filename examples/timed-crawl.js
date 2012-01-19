/**
 * @fileoverview Example reactive SiteCrawl
 * @author roger.castillo@loku.com (Roger Castillo)
 */

var SiteCrawl = require('../lib/sitecrawl').SiteCrawl;


// Crawl will run for 10s
var siteCrawl = new SiteCrawl({url:'http://loku.com', maxCrawlTime:30000});

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

