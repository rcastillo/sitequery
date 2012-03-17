/**
 * @fileoverview Example reactive SiteQuery
 * @author roger.castillo@loku.com (Roger Castillo)
 */

var SiteQuery = require('../lib/sitequery').SiteQuery;

// create a new SiteQuery of depth 2 with a delay of 1s between next page crawl
// selecting for `img` elements on each page
// Note: Webcrawling is delayed and will not be executed
// until Subscription

// sample google crawl filter filtering for the outLinks where
// out links are in the bottom pager
var crawlOpts = {url:'http://www.google.com/search?as_epq=derp&num=25&hl=en&as_qdr=m3',
                 maxDepth:2,
                 delay:1000,
                 maxCrawlTime: 100000,
                 // only crawl anchors in the pager
                 outLinkQuery:'td > a'}


var siteQuery = new SiteQuery(crawlOpts, 'h3 > a');

console.log('Searching for DERP.');

// ask for the observable sequence and subscribe for selected jQuery element(s)
siteQuery.toObservable().Subscribe(function(result) {
// output the img src
  console.log('Search Result Title', result.elem.text());
},
// on err
function(exn) {
  console.log('Something blowd up with exception:' + exn);
},
// on crawl complete
function() {
  console.log('SiteQuery complete');
});
