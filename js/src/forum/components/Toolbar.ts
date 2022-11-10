import app from 'flarum/forum/app';
import Component, {ComponentAttrs} from 'flarum/common/Component';
import PostStreamState from 'flarum/forum/states/PostStreamState';
import Button from 'flarum/common/components/Button';
import Tooltip from 'flarum/common/components/Tooltip';
import ItemList from 'flarum/common/utils/ItemList';
import withAttr from 'flarum/common/utils/withAttr';
import UserRelationshipSelect from 'flamarkt/backoffice/common/components/UserRelationshipSelect';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Post from 'flarum/common/models/Post';

interface ToolbarAttrs extends ComponentAttrs {
    stream: PostStreamState
}

export default class Toolbar extends Component<ToolbarAttrs> {
    searchDebounce: number = 0

    view() {
        const actions = this.actionItems().toArray();

        return m('.PostStreamToolbarWrapper', m('.container', m('.PostStreamToolbar', [
            this.filterItems().toArray(),
            m('.PostStreamToolbar-push'),
            actions,
            actions.length ? m('.PostStreamToolbar-separator') : null,
            this.toolbarControlItems().toArray(),
        ])));
    }

    filterItems() {
        const items = new ItemList();

        items.add('search', m('input.FormControl.js-post-toolbar-autofocus', {
            placeholder: app.translator.trans('clarkwinkelmann-post-stream-search.forum.toolbar.searchPlaceholder'),
            value: this.attrs.stream.filterSearch,
            oninput: withAttr('value', (value: string) => {
                this.attrs.stream.filterSearch = value;

                clearTimeout(this.searchDebounce);

                this.searchDebounce = setTimeout(() => {
                    this.attrs.stream.applyFilters();
                }, 300) as any;
            }),
        }), 100);

        items.add('user', m(UserRelationshipSelect, {
            relationship: this.attrs.stream.filterUsers,
            onchange: users => {
                this.attrs.stream.filterUsers = users;
                this.attrs.stream.applyFilters();
            },
            placeholder: app.translator.trans('clarkwinkelmann-post-stream-search.forum.toolbar.authorPlaceholder'),
            suggest: this.suggestUsers(),
        }), 50);

        if (this.attrs.stream.filterLoading) {
            items.add('loading', LoadingIndicator.component({
                display: 'inline',
            }), -50);
        } else if (Array.isArray(this.attrs.stream.filteredPostIds)) {
            items.add('summary', m('span.PostStreamToolbarText', app.translator.trans('clarkwinkelmann-post-stream-search.forum.toolbar.summary', {
                matching: this.attrs.stream.filteredPostIds.length,
                total: this.attrs.stream.discussion.postIds().length,
            })), -50);
        }

        return items;
    }

    suggestUsers() {
        const usersAndReplyCount = new Map<string, number>();

        this.attrs.stream.discussion.postIds().forEach(id => {
            const post = app.store.getById<Post>('posts', id);

            if (!post) {
                return;
            }

            const author = post.user();

            if (!author) {
                return;
            }

            const lastCount = usersAndReplyCount.get(author.id()!) || 0;

            usersAndReplyCount.set(author.id()!, lastCount + 1);
        });

        return Array.from(usersAndReplyCount.keys()).sort((idA, idB) => {
            const countA = usersAndReplyCount.get(idA)!;
            const countB = usersAndReplyCount.get(idB)!;

            if (countA > countB) {
                return 1;
            }

            if (countB > countA) {
                return 1;
            }

            return 0;
        }).map(id => app.store.getById('users', id));
    }

    actionItems() {
        return new ItemList();
    }

    toolbarControlItems() {
        const items = new ItemList();

        const pinned = !!window.localStorage.getItem('showPostStreamToolbar');

        items.add('pin', Tooltip.component({
            text: app.translator.trans('clarkwinkelmann-post-stream-search.forum.toolbar.pin'),
        }, Button.component({
            className: 'Button Button--icon' + (pinned ? ' active' : ''),
            icon: 'fas fa-thumbtack',
            onclick: () => {
                if (pinned) {
                    window.localStorage.removeItem('showPostStreamToolbar');
                } else {
                    window.localStorage.setItem('showPostStreamToolbar', '1');
                }
            },
        })), 100);

        items.add('close', Tooltip.component({
            text: app.translator.trans('clarkwinkelmann-post-stream-search.forum.toolbar.' + (pinned ? 'clear' : 'close')),
        }, Button.component({
            className: 'Button Button--icon',
            icon: 'fas fa-times',
            onclick: () => {
                if (!pinned) {
                    this.attrs.stream.showToolbar = false;
                }

                this.attrs.stream.clearFilters();
            },
        })), 50);

        return items;
    }
}
