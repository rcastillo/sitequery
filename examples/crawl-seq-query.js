/**
 * @fileoverview Example reactive SiteCrawl
 * @author roger.castillo@loku.com (Roger Castillo)
 */

var SiteQuery = require('../lib/sitequery').SiteQuery;
    createCrawlSequence = require('../lib/crawlsequence').createCrawlSequence,
    URL = require('url'),
    Rx = require('rx').Rx;


var hrefArray = ['http://google.com',
                 'http://loku.com',
                 'http://yahoo.com',
                 'http://bing.com'];


// convert the array of hrefs to URL objecs
var urlStream = Rx.Observable.FromArray(hrefArray).Select(function(r){
  return URL.parse(r);
});


// politness of 1s with crawl lasting no longer than 60s
var cs = createCrawlSequence(urlStream, 1000);

var crawlOpts = {crawlObservable: cs};

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