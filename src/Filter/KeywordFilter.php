<?php

namespace ClarkWinkelmann\PostStreamSearch\Filter;

use ClarkWinkelmann\Scout\ScoutStatic;
use Flarum\Extension\ExtensionManager;
use Flarum\Filter\FilterInterface;
use Flarum\Filter\FilterState;
use Flarum\Post\Post;

/**
 * Implements post search in Flarum. Re-uses most of the logic from Flarum\Discussion\Search\Gambit\FulltextGambit
 * As well as adding support for Scout.
 *
 * Default sort was intentionally not implemented because it's not needed for this extension.
 *
 * This is implemented as a filter and not a fulltext gambit because that would require implementing a whole SimpleFlarumSearcher for no real benefit.
 */
class KeywordFilter implements FilterInterface
{
    public function getFilterKey(): string
    {
        return 'q';
    }

    public function filter(FilterState $filterState, string $filterValue, bool $negate)
    {
        $query = $filterState->getQuery();

        if (!resolve(ExtensionManager::class)->isEnabled('clarkwinkelmann-scout')) {
            // Replace all non-word characters with spaces.
            // We do this to prevent MySQL fulltext search boolean mode from taking
            // effect: https://dev.mysql.com/doc/refman/5.7/en/fulltext-boolean.html
            $bit = preg_replace('/[^\p{L}\p{N}\p{M}_]+/u', ' ', $filterValue);

            $grammar = $query->getGrammar();

            $query->whereRaw('MATCH(' . $grammar->wrap('posts.content') . ') AGAINST (? IN BOOLEAN MODE)', [$bit]);

            return;
        }

        $builder = ScoutStatic::makeBuilder(Post::class, $filterValue);

        $ids = $builder->keys();

        $query->whereIn('id', $ids);
    }
}
