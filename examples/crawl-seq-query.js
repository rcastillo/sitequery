/**
 * @fileoverview Example reactive SiteCrawl
 * @author roger.castillo@loku.com (Roger Castillo)
 */

var SiteQuery = require('../lib/sitequery').SiteQuery;
    CrawlSequence = require('../lib/crawlsequence').CrawlSequence,
    URL = require('url');


// create a new SiteCrawl of depth 2 with a delay of 1s between next page
// Note: Webcrawling is delayed and will not be executed
// until Subscription
var crawlSeq = new CrawlSequence([URL.parse('http://google.com'),
                                  URL.parse('http://loku.com'),
                                  URL.parse('http://austinchronicle.com')], 1000);


var crawlOpts = {crawlObservable: crawlSeq,
                 depth:2,
                 delay:1000,
                 maxCrawlTime: 100000};

// go get all the images out of the sequence of pages
var siteQuery = new SiteQuery(crawlOpts, 'img');


// ask for the observable sequence and subscribe for selected jQuery element(s)
siteQuery.toObservable().Subscribe(function(result) {
// output the img src
  console.log(result.sourceUrl, result.elem.attr('src'));
},
// on err
function(exn) {
  console.log('Something blowd up with exception:' + exn);
},
// on crawl complete
function() {
  console.log('SiteQuery complete');
});