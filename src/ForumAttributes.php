<?php

namespace ClarkWinkelmann\PostStreamSearch;

use Flarum\Api\Serializer\ForumSerializer;
use Flarum\Settings\SettingsRepositoryInterface;

class ForumAttributes
{
    protected $settings;

    public function __construct(SettingsRepositoryInterface $settings)
    {
        $this->settings = $settings;
    }

    public function __invoke(ForumSerializer $serializer): array
    {
        return [
            'post-stream-search.dropdownAccess' => (bool)$this->settings->get('post-stream-search.dropdownAccess'),
            'post-stream-search.authorQuickFilter' => (bool)$this->settings->get('post-stream-search.authorQuickFilter'),
            'post-stream-search.originalPosterBadge' => (bool)$this->settings->get('post-stream-search.originalPosterBadge'),
        ];
    }
}
