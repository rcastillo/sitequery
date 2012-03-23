/**
 * @fileoverview Example reactive SiteQuery
 * @author roger.castillo@loku.com (Roger Castillo)
 */

var SiteQuery = require('../lib/sitequery').SiteQuery,
                createObservablejQuery = require('../lib/rxjquery').createObservablejQuery;



var pagerLinks = function(body) {
  return createObservablejQuery(body,'td > a').Where(function(r){
    return r.elem.text() == 'Next';
  })
  .Select(function(r){
    return r.elem.attr('href');
  })
}

// create a new SiteQuery of depth 2 with a delay of 1s between next page crawl
// selecting for `img` elements on each page
// Note: Webcrawling is delayed and will not be executed
// until Subscription

// sample google crawl filter filtering for the outLinks where
// out links are in the bottom pager
var crawlOpts = {url:'http://www.google.com/search?as_epq=derp&num=10 &hl=en&as_qdr=m3',
                 maxDepth:4,
                 delay:1000,
                 maxCrawlTime: 100000,
                 // only crawl anchors in the pager
                 //outLinkQuery:'td > a'
                 createOutLinkSeq:pagerLinks
               }


var siteQuery = new SiteQuery(crawlOpts, 'h3 > a');

console.log('Searching for DERP.');

var rank = 1;

// ask for the observable sequence and subscribe for selected jQuery element(s)
siteQuery.toObservable().Subscribe(function(result) {
// output the img src
  console.log('Rank', rank++, 'Search Result Title', result.elem.text());
},
// on err
function(exn) {
  console.log('Something blowd up with exception:' + exn);
},
// on crawl complete
function() {
  console.log('SiteQuery complete');
  process.exit(0);
});
