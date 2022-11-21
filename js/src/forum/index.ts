import {extend, override} from 'flarum/common/extend';
import app from 'flarum/forum/app';
import {ApiPayloadPlural} from 'flarum/common/Store';
import Button from 'flarum/common/components/Button';
import Tooltip from 'flarum/common/components/Tooltip';
import CommentPost from 'flarum/forum/components/CommentPost';
import DiscussionPage from 'flarum/forum/components/DiscussionPage';
import PostStream from 'flarum/forum/components/PostStream';
import PostStreamState from 'flarum/forum/states/PostStreamState';
import DiscussionControls from 'flarum/forum/utils/DiscussionControls';
import PostControls from 'flarum/forum/utils/PostControls';
import Post from 'flarum/common/models/Post';
import icon from 'flarum/common/helpers/icon';
import Toolbar from './components/Toolbar';

app.initializers.add('clarkwinkelmann-post-stream-search', () => {
    extend(DiscussionPage.prototype, 'pageContent', function (items) {
        if (!this.stream || !this.stream.showToolbar) {
            return;
        }

        items.add('stream-toolbar', m(Toolbar, {
            stream: this.stream,
        }), -200);
    });

    // Use show() as a way to extend the constructor
    extend(PostStreamState.prototype, 'show', function () {
        if (typeof this.showToolbar !== 'undefined') {
            return;
        }

        this.showToolbar = !!window.localStorage.getItem('showPostStreamToolbar');
        this.filterSearch = '';
        this.filterUsers = [];
        this.filteredPostIds = null;
        this.filterLoading = false;
    });

    override(PostStreamState.prototype, 'loadRange', function (original, start, end) {
        if (!Array.isArray(this.filteredPostIds)) {
            return original(start, end);
        }

        const loadIds: string[] = [];
        const loaded: Post[] = [];

        this.filteredPostIds.slice(start, end)
            .forEach((id) => {
                const post = app.store.getById<Post>('posts', id);

                if (post && post.discussion() && typeof post.canEdit() !== 'undefined') {
                    loaded.push(post);
                } else {
                    loadIds.push(id);
                }
            });

        if (loadIds.length) {
            return app.store.find<Post[]>('posts', loadIds).then((newPosts) => {
                return loaded.concat(newPosts).sort((a, b) => a.number() - b.number());
            });
        }

        return Promise.resolve(loaded);
    });

    override(PostStreamState.prototype, 'show', function (original, posts) {
        if (!Array.isArray(this.filteredPostIds)) {
            return original(posts);
        }

        this.visibleStart = posts.length ? this.filteredPostIds.indexOf(posts[0].id() ?? '0') : 0;
        this.visibleEnd = this.sanitizeIndex(this.visibleStart + posts.length);
    });

    override(PostStreamState.prototype, 'posts', function (original) {
        if (!Array.isArray(this.filteredPostIds)) {
            return original();
        }

        return this.filteredPostIds.slice(this.visibleStart, this.visibleEnd)
            .map((id) => {
                const post = app.store.getById<Post>('posts', id);

                return post && post.discussion() && typeof post.canEdit() !== 'undefined' ? post : null;
            });
    });

    override(PostStreamState.prototype, 'count', function (original) {
        if (!Array.isArray(this.filteredPostIds)) {
            return original();
        }

        return this.filteredPostIds.length;
    });

    override(PostStreamState.prototype, 'loadNearNumber', function (original, number) {
        if (!Array.isArray(this.filteredPostIds)) {
            return original(number);
        }

        if (this.posts().some((post) => post && Number(post.number()) === Number(number))) {
            return Promise.resolve();
        }

        const suggestRemovingFilter = () => {
            let alert: any;
            const viewButton = Button.component({
                className: 'Button Button--link',
                onclick: () => {
                    this.clearFilters(number);
                    app.alerts.dismiss(alert);
                },
            }, app.translator.trans('clarkwinkelmann-post-stream-search.forum.cannotGoToPost.action'));

            alert = app.alerts.show({
                controls: [viewButton],
            }, app.translator.trans('clarkwinkelmann-post-stream-search.forum.cannotGoToPost.message'));
        }

        const postExistsInStore = app.store.all<Post>('posts').some(post => Number(post.number()) === Number(number) && post.discussion() === this.discussion);

        if (postExistsInStore) {
            suggestRemovingFilter();

            return Promise.resolve();
        }

        this.reset();

        // Replicate what loadNearNumber did in a way that's compatible with the filtered data
        return this.retrieveFilteredDiscussion(number).then(payload => {
            const fullPosts: Post[] = [];
            let numberFound = false;

            payload.data.forEach(entry => {
                if (entry.attributes) {
                    const post = app.store.pushObject<Post>(entry)!;
                    fullPosts.push(post);

                    if (Number(post.number()) === Number(number)) {
                        numberFound = true;
                    }
                }
            });

            this.show(fullPosts);

            if (!numberFound) {
                suggestRemovingFilter();
            }
        });
    });

    override(PostStreamState.prototype, 'update', function (original) {
        if (!Array.isArray(this.filteredPostIds)) {
            return original();
        }

        return new Promise<void>(resolve => {
            // Retrieve the updated list of matching posts and then show the end
            // It doesn't matter too much to load with the correct "near" value because this is used when writing
            // a new post and the end is probably already loaded and the new post as well
            // Even if we are not going to move in the discussion, it still made sense to refresh for the meta-data
            this.retrieveFilteredDiscussion().then(() => {
                original().then(() => {
                    resolve();
                });
            });
        });
    });

    PostStreamState.prototype.retrieveFilteredDiscussion = function (near?: number) {
        const filter: any = {};

        if (this.filterSearch) {
            filter.q = this.filterSearch;
        }

        if (this.filterUsers.length > 0) {
            filter.author = this.filterUsers.map(user => user.username()).join(',');
        }

        this.filterLoading = true;

        return app.request<ApiPayloadPlural>({
            method: 'GET',
            url: app.forum.attribute('apiUrl') + '/discussions/' + this.discussion.id() + '/posts-search',
            params: {
                filter,
                page: {
                    near,
                },
            },
        }).then(payload => {
            this.filteredPostIds = [];

            payload.data.forEach(entry => {
                this.filteredPostIds!.push(entry.id);
            });

            this.filterLoading = false;

            return payload;
        });
    }

    PostStreamState.prototype.applyFilters = function (near?: number) {
        // We can't read the up to date value for near from m.route.param because the value is updated through history.replaceState
        const expectedPathPrefix = app.route.discussion(this.discussion) + '/';
        const urlPath = window.location.pathname;

        if (!near && urlPath.indexOf(expectedPathPrefix) === 0) {
            near = parseInt(urlPath.substr(expectedPathPrefix.length));
        }

        if (!this.filterSearch && this.filterUsers.length === 0) {
            this.filteredPostIds = null;

            if (near) {
                // When clearing the search, we can be pretty sure the post that was visible while filtered will also be visible in the complete view
                this.goToNumber(near);
            } else {
                this.goToFirst();
            }

            return;
        }

        this.retrieveFilteredDiscussion(near).then(payload => {
            let closestPost: Post | null = null;
            let closestDistance = 1000;

            const fullPosts: Post[] = [];

            payload.data.forEach(entry => {
                // Not all entries in payload.data will be complete
                if (entry.attributes) {
                    const post = app.store.pushObject<Post>(entry)!;
                    fullPosts.push(post);

                    // In case none of the posts are anywhere close, we'll focus the first found
                    if (closestPost === null) {
                        closestPost = post;
                    }

                    // Find the closest post in the results compared to the place we were before searching
                    if (near) {
                        const distance = Math.abs(post.number() - near);

                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestPost = post;
                        }
                    }
                }
            });

            this.show(fullPosts);

            m.redraw();

            // These methods shouldn't load any more data since the target post is already loaded
            // However it will set the correct post target for the stream to auto-scroll to
            if (closestPost) {
                this.goToNumber(closestPost.number());
            } else {
                this.goToFirst();
            }
        });
    }

    PostStreamState.prototype.clearFilters = function (near?: number) {
        this.filterSearch = '';
        this.filterUsers = [];

        this.applyFilters(near);
    }

    window.addEventListener('keydown', function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'F' && app.current.matches(DiscussionPage)) {
            const stream = app.current.get('stream');

            if (stream) {
                event.preventDefault();

                stream.showToolbar = true;
                m.redraw();

                setTimeout(() => {
                    // Do this every time, even if the toolbar was already open
                    $('.js-post-toolbar-autofocus').trigger('focus');
                }, 0);
            }
        }
    });

    extend(PostStream.prototype, 'view', function (vdom) {
        if (!Array.isArray(this.stream.filteredPostIds)) {
            return;
        }

        if (this.stream.filteredPostIds.length === 0) {
            vdom.children.unshift(m('.PostStream-filterNoResults', [
                icon('fas fa-search'),
                m('div', app.translator.trans('clarkwinkelmann-post-stream-search.forum.stream.noResults')),
            ]));

            return;
        }

        const allPostIds = this.discussion.postIds();

        // If there is no text search, we switch the message to just say other users
        const translation = 'clarkwinkelmann-post-stream-search.forum.stream.' + (this.stream.filterSearch ? 'unmatchedGap' : 'otherAuthorsGap');

        vdom.children.forEach(item => {
            if (!item.attrs || !item.attrs['data-id']) {
                return;
            }

            const indexInDiscussion = allPostIds.indexOf(item.attrs['data-id']);
            const indexInResults = this.stream.filteredPostIds.indexOf(item.attrs['data-id']);

            // If the post is not found, abort
            if (indexInDiscussion < 0 || indexInResults < 0) {
                return;
            }

            // All the checks are done between current and next post
            // But for the very first we also need to check before
            if (indexInResults === 0 && indexInDiscussion > 0) {
                item.children.unshift(m('.PostStream-timeGap', app.translator.trans(translation, {
                    count: indexInDiscussion,
                })));
            }

            // If this is the last post in the full discussion, there won't be anything to show
            if (indexInDiscussion === allPostIds.length - 1) {
                return;
            }

            const nextPostIdInResults = this.stream.filteredPostIds[indexInResults + 1];
            const indexOfNextPostInAllDiscussion = indexInResults + 1 >= this.stream.filteredPostIds.length ? allPostIds.length : allPostIds.indexOf(nextPostIdInResults);

            // If the post is not found, abort
            if (indexOfNextPostInAllDiscussion < 0) {
                return;
            }

            const numberOfUnmatchedPostsBetween = indexOfNextPostInAllDiscussion - indexInDiscussion - 1;

            if (numberOfUnmatchedPostsBetween <= 0) {
                return;
            }

            item.children.push(m('.PostStream-timeGap', app.translator.trans(translation, {
                count: numberOfUnmatchedPostsBetween,
            })));
        });
    });

    extend(DiscussionControls, 'userControls', function (items) {
        if (!app.forum.attribute('post-stream-search.dropdownAccess')) {
            return;
        }

        items.add('filter-toolbar', Button.component({
            onclick() {
                const stream = app.current.get('stream');

                if (stream) {
                    stream.showToolbar = true;

                    setTimeout(() => {
                        $('.js-post-toolbar-autofocus').trigger('focus');
                    }, 0);
                }
            },
            icon: 'fas fa-search',
        }, app.translator.trans('clarkwinkelmann-post-stream-search.forum.discussionControls.searchInDiscussion')));
    });

    extend(PostControls, 'userControls', function (items, post) {
        if (!app.forum.attribute('post-stream-search.authorQuickFilter')) {
            return;
        }

        const author = post.user();

        if (!author) {
            return;
        }

        items.add('filter-author', Button.component({
            onclick() {
                const stream = app.current.get('stream');

                if (stream) {
                    stream.showToolbar = true;
                    stream.filterSearch = '';
                    stream.filterUsers = [author];
                    stream.applyFilters();
                }
            },
            icon: 'fas fa-filter',
        }, app.translator.trans('clarkwinkelmann-post-stream-search.forum.postControls.authorFilter')));
    });

    extend(CommentPost.prototype, 'headerItems', function (items) {
        if (!app.forum.attribute('post-stream-search.originalPosterBadge')) {
            return;
        }

        const user = this.attrs.post.user();
        const discussion = this.attrs.post.discussion();

        if (user && user === discussion.user()) {
            items.add('original-poster', Tooltip.component({
                text: app.translator.trans('clarkwinkelmann-post-stream-search.forum.post.opBadgeTooltip')
            }, m('span.OriginalPosterBadge', {
                onclick() {
                    const stream = app.current.get('stream');

                    if (stream) {
                        stream.showToolbar = true;
                        stream.filterSearch = '';
                        stream.filterUsers = [user];
                        stream.applyFilters();
                    }
                },
            }, app.translator.trans('clarkwinkelmann-post-stream-search.forum.post.opBadge'))))
        }
    });
});
