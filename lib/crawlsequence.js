var request = require('request'),
    Rx = require('rx').Rx,
    CrawlLink = require('./sitecrawl').CrawlLink,
    CrawlResult = require('./sitecrawl').CrawlResult;


/**
 * Maps a sequence on urls onto a sequence crawl results
 * @param {URl[]} urls
 * @param {Integer} delay ms
 */
function CrawlSequence(urls, delay){
  return Rx.Observable.Create(function(obs){
    var subs = Rx.Observable.GenerateWithTime(
      0,
      function(index){return index < urls.length},
      function(index){return index + 1},
      function(index){return urls[index];},
      function(index){return delay;}
    ).Subscribe(function(url){
       request(url.href, function (error, response, body) {
        // in a sequence all items in the sequence are
        // have null roots
        var crawlLink = new CrawlLink(url, 0, null);
        if (error == null) {
          console.log(url);
          obs.OnNext(new CrawlResult(crawlLink, body));
        } else {
          // we don't error out, we continue and report
          // a null result'
          obs.OnNext(new CrawlResult(crawlLink, null));
        }
     });
    },
    function(err){
      obs.OnError(err);
    },
    function(){
      // Every url has been fired off and we wait at most 5 * delay
      // for all to return
      Rx.Observable.Timer(10 * delay).Subscribe(function(tick){
        obs.OnCompleted();
      });
    })
    return function(){subs.Dispose();};
  });
}

exports.CrawlSequence = CrawlSequence;