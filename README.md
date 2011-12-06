# sitequery
*An impractical reactive framework for asynchronous web crawling.*

## Overview
sitequery is reactive webcrawling framework that enables web crawling through server-side execution of jQuery selectors.

## npm install
[sudo] npm install sitequery

## Features
`sitequery` models web crawls as an infinite streams using the rx.js and jsdom.

  - Any valid jQuery selector can be executed across an entire website (or crawl sequence)
  - Crawls can be paramerized to only go *n* levels deep
  - Site crawls have use a redis store to track visitation and insure a crawl is cycle-free


