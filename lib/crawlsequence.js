var request = require('request'),
    URL = require('url'),
    Rx = require('rx').Rx,
    CrawlLink = require('./sitecrawl').CrawlLink,
    CrawlResult = require('./sitecrawl').CrawlResult;


/**
 * Creates an observable sequence of crawl results given
 * an observable urlStream
 * @param {Rx.Observable} urlStream
 * @param {Integer} politenessDelay in ms
 * @param {Integer} maxCrawlTime in ms
 * @return {Rx.Observable} sequence of CrawlResult(s)
 */
function createCrawlSequence(urlStream, politenessDelay, maxCrawlTime){
  politenessDelay = politenessDelay || 1000;
  maxCrawlTime = maxCrawlTime || Number.MAX_VALUE;

  var urlsInFlight = 0;
  function crawl(url, obs){
    urlsInFlight++;
    request(url.href, function (error, response, body) {
      // in a sequence all items in the sequence are
      // have null roots
      var crawlLink = new CrawlLink(url, 0, null);
      if (error == null) {
        obs.OnNext(new CrawlResult(crawlLink, body));
      } else {
        // we don't error out, we continue and report
        // a null result'
        obs.OnNext(new CrawlResult(crawlLink, null));
      }
     urlsInFlight--;
    });
  }
  return Rx.Observable.Create(function(obs){
    // a domina will be crawled a speed no greater than
    // the configered politensess intervel
    var politenessInterval = Rx.Observable.Interval(politenessDelay);
    var waitingUrls = [];
    // by hostname
    var lastCrawlTimes = {};
    var intSubs = null;
    var urlStreamComplete = false;
    var urlSubs = urlStream.Subscribe(function(url){
      // check all waiting URL to see if any are ready
      // on a delayed asynchronous loop
      var crawlStartTime = Date.now();

      intSubs = politenessInterval.Subscribe(function(_){
        //console.log('politenes internval check');
        //console.log('waiting url count', waitingUrls.length, 'politeness delay', politenessDelay);
        for (var i in waitingUrls) {
          var curUrl = waitingUrls[i];
          //console.log('curUrl', curUrl, 'lastCrawlTime', lastCrawlTimes[curUrl.hostname], 'diff', Date.now() - lastCrawlTimes[curUrl.hostname]);
          if ((Date.now() - lastCrawlTimes[curUrl.hostname]) >= politenessDelay){
            lastCrawlTimes[curUrl.hostname] = Date.now();
            // remove the current item
            waitingUrls.splice(i);
            //console.log('crawling delayed url', url.href);
            crawl(url, obs);
          }
        }
        // check to see if we are completed
        // if we have recvd all urls and everything is finished
        //   OR maxCrawlTime exceeded
        if ((urlStreamComplete &&
             waitingUrls.length == 0 &&
             urlsInFlight == 0) ||
            ((Date.now() - crawlStartTime) >= maxCrawlTime)){
          obs.OnCompleted();
        }
      });
      if (lastCrawlTimes[url.hostname] == undefined ||
          ((Date.now() - lastCrawlTimes[url.hostname]) >= politenessDelay)){
          // add to lastCrawlTime
          lastCrawlTimes[url.hostname] = Date.now();
          // crawl url
          crawl(url, obs);
      } else {
        // url goes into waiting queue
        lastCrawlTimes[url.hostname] = Date.now();
        waitingUrls.push(url);
      }
    },
    function(err){
      obs.OnError(err);
    },
    function(){
      urlStreamComplete = true;
    });
    return function(){urlSubs.Dispose(); intSubs.Dispose()};
  });
}

exports.createCrawlSequence = createCrawlSequence;


/**
 * Maps a sequence on urls onto a sequence crawl results
 * @param {URL|String[]} urls
 * @param {Integer} delay ms
 * @depracated  will remove from interface for createCrawlSequence
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
       var parsedUrl;
       if (typeof(url) == 'string') {
         parsedUrl = URL.parse(url);
       } else {
         parsedUrl = url;
       }
       request(parsedUrl.href, function (error, response, body) {
        // in a sequence all items in the sequence are
        // have null roots
        var crawlLink = new CrawlLink(url, 0, null);
        if (error == null) {
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