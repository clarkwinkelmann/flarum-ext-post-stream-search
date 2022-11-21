// Without importing PhpStorm doesn't validate the native methods in the code
import PostStreamState from 'flarum/forum/states/PostStreamState';
import User from 'flarum/common/models/User';
import {ApiPayloadPlural} from 'flarum/common/Store';

declare module 'flarum/forum/states/PostStreamState' {
    export default interface PostStreamState {
        showToolbar: boolean
        filterSearch: string
        filterUsers: User[]
        filteredPostIds: string[] | null
        filterLoading: boolean

        retrieveFilteredDiscussion(near?: number): Promise<ApiPayloadPlural>

        applyFilters(near?: number): void

        clearFilters(near?: number): void
    }
}
