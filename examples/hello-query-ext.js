/**
 * @fileoverview Example reactive SiteQuery
 * @author roger.castillo@loku.com (Roger Castillo)
 */

var SiteQuery = require('../lib/sitequery').SiteQuery;
var fs = require('fs');

// load up sample jQuery extension script
var ext = fs.readFileSync('./sample-jquery-ext.js').toString();


// jQuery extension example broken due (I think) to jsdom
// change...ToDo: Need to fix
//######  ######  ####### #    # ####### #     # 
//#     # #     # #     # #   #  #       ##    # 
//#     # #     # #     # #  #   #       # #   # 
//######  ######  #     # ###    #####   #  #  # 
//#     # #   #   #     # #  #   #       #   # # 
//#     # #    #  #     # #   #  #       #    ## 
//######  #     # ####### #    # ####### #     # 


var siteQuery = new SiteQuery({url:'http://loku.com'}, 'img:regex(src,s3)', ext);

// ask for the observable sequence and subscribe for selected jQuery element(s)
siteQuery.toObservable().Subscribe(function(result) {
  // output the img src                 
  console.log(result.elem.attr('src'));
},
// on err
function(exn) {
  console.log('Something blowd up with exception:' + exn);
},
// on crawl complete
function() {
  console.log('SiteQuery complete');
});