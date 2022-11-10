<?php

namespace ClarkWinkelmann\PostStreamSearch\Filter;

use Flarum\Filter\FilterState;
use Flarum\Post\Filter\PostFilterer;
use Flarum\Query\QueryCriteria;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;

/**
 * This class extends the original filterer to get access to its protected methods.
 * There's otherwise no way to read the filters added by extenders.
 */
class PostFiltererWithoutPagination extends PostFilterer
{
    /**
     * Re-implementation of Flarum\Filter\AbstractFilterer::filter without applying pagination and returning the query object
     * @param PostFilterer $filterer
     * @param QueryCriteria $criteria
     * @return Builder
     */
    public static function filterWithoutPagination(PostFilterer $filterer, QueryCriteria $criteria): Builder
    {
        $actor = $criteria->actor;

        $query = $filterer->getQuery($actor);

        $filterState = new FilterState($query->getQuery(), $actor);

        foreach ($criteria->query as $filterKey => $filterValue) {
            $negate = false;
            if (substr($filterKey, 0, 1) == '-') {
                $negate = true;
                $filterKey = substr($filterKey, 1);
            }
            foreach (Arr::get($filterer->filters, $filterKey, []) as $filter) {
                $filterState->addActiveFilter($filter);
                $filter->filter($filterState, $filterValue, $negate);
            }
        }

        $filterer->applySort($filterState, $criteria->sort, $criteria->sortIsDefault);

        foreach ($filterer->filterMutators as $mutator) {
            $mutator($filterState, $criteria);
        }

        return $query;
    }
}
