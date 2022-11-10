// Without importing PhpStorm doesn't validate the native methods in the code
import PostStreamState from 'flarum/forum/states/PostStreamState';
import User from 'flarum/common/models/User';

declare module 'flarum/forum/states/PostStreamState' {
    export default interface PostStreamState {
        showToolbar: boolean
        filterSearch: string
        filterUsers: User[]
        filteredPostIds: string[] | null
        filterLoading: boolean

        applyFilters(): void

        clearFilters(): void
    }
}
