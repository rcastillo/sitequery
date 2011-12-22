/**
 * @fileoverview Example reactive SiteQuery
 * @author roger.castillo@loku.com (Roger Castillo)
 */

var SiteQuery = require('../lib/sitequery').SiteQuery;
var fs = require('fs');

// load up sample jQuery extension script
var ext = fs.readFileSync('./sample-jquery-ext.js').toString();


// create a new SiteQuery of depth 2 with a delay of 1s between next page crawl
// selecting for `img` elements on each page
// Note: Webcrawling is delayed and will not be executed
// until Subscription
var siteQuery = new SiteQuery('http://loku.com', 2, 1000, 'img:regex(src,s3)', ext);

// ask for the observable sequence and subscribe for selected jQuery element(s)
siteQuery.toObservable().Subscribe(function(elem) {
  // output the img src                 
  console.log(elem.attr('src'));
},
// on err
function(exn) {
  console.log('Something blowd up with exception:' + exn);
},
// on crawl complete
function() {
  console.log('SiteQuery complete');
});