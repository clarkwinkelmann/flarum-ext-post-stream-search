<?php

namespace ClarkWinkelmann\PostStreamSearch\Controller;

use ClarkWinkelmann\PostStreamSearch\Filter\PostFiltererWithoutPagination;
use Flarum\Api\Controller\AbstractListController;
use Flarum\Api\Serializer\PostSerializer;
use Flarum\Http\RequestUtil;
use Flarum\Post\Filter\PostFilterer;
use Flarum\Post\Post;
use Flarum\Query\QueryCriteria;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

/**
 * This is a hybrid of ShowDiscussionController and ListPostsController that will return the full list of matching IDs and pre-load a page
 */
class DiscussionPostSearchController extends AbstractListController
{
    public $sort = ['number' => 'asc'];
    public $sortFields = ['number'];

    public $serializer = PostSerializer::class;

    // Same as from ShowDiscussionController
    public $include = [
        'discussion',
        'user',
        'user.groups',
        'editedUser',
        'hiddenUser'
    ];

    protected $filterer;

    public function __construct(PostFilterer $filterer)
    {
        $this->filterer = $filterer;
    }

    protected function data(ServerRequestInterface $request, Document $document)
    {
        $actor = RequestUtil::getActor($request);

        $filters = $this->extractFilter($request);
        $sort = $this->extractSort($request);
        $sortIsDefault = $this->sortIsDefault($request);

        // Ensure there's always a discussion filter set since we are going to return the full list of matching IDs
        // Without a discussion filter we might end up with the entire forum's worth of posts
        $filters['discussion'] = Arr::get($request->getQueryParams(), 'id');

        $filterQuery = PostFiltererWithoutPagination::filterWithoutPagination($this->filterer, new QueryCriteria($actor, $filters, $sort, $sortIsDefault));

        $limit = $this->extractLimit($request);

        $allPosts = $this->loadPostIds($filterQuery);
        $offset = $this->getPostsOffset($allPosts, $request, $limit);
        $loadedPosts = $this->loadPosts($filterQuery, $offset, $limit, $this->extractInclude($request));

        array_splice($allPosts, $offset, $limit, $loadedPosts);

        return $allPosts;
    }

    protected function loadPostIds(Builder $filterQuery)
    {
        return $filterQuery->pluck('id')->all();
    }

    protected function getPostsOffset(array $allPostIds, ServerRequestInterface $request, $limit)
    {
        $queryParams = $request->getQueryParams();

        if (($near = Arr::get($queryParams, 'page.near')) > 1) {
            // Re-implementation of PostRepository::getIndexForNumber that works with our filtered results
            $offset = Post::query()
                ->whereIn('id', $allPostIds)
                ->where('created_at', '<', function ($query) use ($allPostIds, $near) {
                    $query->select('created_at')
                        ->from('posts')
                        ->whereIn('id', $allPostIds)
                        ->whereNotNull('number')
                        ->take(1)
                        ->orderByRaw('ABS(CAST(number AS SIGNED) - ' . (int)$near . ')');
                })->count();
            $offset = max(0, $offset - $limit / 2);
        } else {
            $offset = $this->extractOffset($request);
        }

        return $offset;
    }

    protected function loadPosts(Builder $filterQuery, $offset, $limit, array $include)
    {
        $filterQuery->skip($offset)->take($limit)->with($include);

        $posts = $filterQuery->get();

        $this->loadRelations($posts, $include);

        return $posts->all();
    }
}
