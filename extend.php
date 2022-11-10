<?php

namespace ClarkWinkelmann\PostStreamSearch;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Extend;
use Flarum\Post\Filter\PostFilterer;

return [
    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    (new Extend\Routes('api'))
        ->get('/discussions/{id}/posts-search', 'post-stream-search', Controller\DiscussionPostSearchController::class),

    new Extend\Locales(__DIR__ . '/locale'),

    (new Extend\ApiSerializer(ForumSerializer::class))
        ->attributes(ForumAttributes::class),

    (new Extend\Filter(PostFilterer::class))
        ->addFilter(Filter\KeywordFilter::class),
];
