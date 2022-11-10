# Post Stream Search

[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/clarkwinkelmann/flarum-ext-post-stream-search/blob/master/LICENSE.txt) [![Latest Stable Version](https://img.shields.io/packagist/v/clarkwinkelmann/flarum-ext-post-stream-search.svg)](https://packagist.org/packages/clarkwinkelmann/flarum-ext-post-stream-search) [![Total Downloads](https://img.shields.io/packagist/dt/clarkwinkelmann/flarum-ext-post-stream-search.svg)](https://packagist.org/packages/clarkwinkelmann/flarum-ext-post-stream-search) [![Donate](https://img.shields.io/badge/paypal-donate-yellow.svg)](https://www.paypal.me/clarkwinkelmann)

This extension lets users filter the discussion post stream by keyword and other criteria.

The filter toolbar can be brought up by typing CTRL+F or CTRL+SHIFT+F while on a discussion page.
The browser might not allow intercepting CTRL+F.
In that case only the variant with SHIFT will work.
Other access methods can be enabled in the extension settings.

The toolbar contains fields to perform a text search or filter by one or multiple authors.

If the [Scout extension](https://github.com/clarkwinkelmann/flarum-ext-scout) is enabled (0.3.0+ required) the text search in posts will use the Scout index.

The toolbar can be "pinned" and will automatically appear anytime a discussion is opened.

When filters are applied, posts that don't match are hidden but a label remains saying how many posts have been hidden between posts that remain visible.
The sort order does not change, posts remain sorted chronologically.

At the moment filters cannot be perma-linked.
If the page is refreshed, the unfiltered page will be shown again.

The matched keywords are currently not highlighted in the search results.
The keywords could be found inside HTML attributes that aren't visible in the output.

## Installation

This extension will automatically install Flamarkt Backoffice to gain access to some of its re-usable components.
You must enable Backoffice in the extension list before enabling this extension.
The backoffice panel isn't used, you can ignore it.

    composer require clarkwinkelmann/flarum-ext-post-stream-search

## Support

This extension is under **minimal maintenance**.

It was developed for a client and released as open-source for the benefit of the community.
I might publish simple bugfixes or compatibility updates for free.

You can [contact me](https://clarkwinkelmann.com/flarum) to sponsor additional features or updates.

Support is offered on a "best effort" basis through the Flarum community thread.

## Links

- [GitHub](https://github.com/clarkwinkelmann/flarum-ext-post-stream-search)
- [Packagist](https://packagist.org/packages/clarkwinkelmann/flarum-ext-post-stream-search)
