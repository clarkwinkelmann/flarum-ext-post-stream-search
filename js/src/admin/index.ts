import app from 'flarum/admin/app';

app.initializers.add('clarkwinkelmann-post-stream-search', () => {
    app.extensionData
        .for('clarkwinkelmann-post-stream-search')
        .registerSetting({
            type: 'switch',
            setting: 'post-stream-search.dropdownAccess',
            label: app.translator.trans('clarkwinkelmann-post-stream-search.admin.settings.dropdownAccess'),
            help: app.translator.trans('clarkwinkelmann-post-stream-search.admin.settings.dropdownAccessHelp'),
        })
        .registerSetting({
            type: 'switch',
            setting: 'post-stream-search.sideNavAccess',
            label: app.translator.trans('clarkwinkelmann-post-stream-search.admin.settings.sideNavAccess'),
            help: app.translator.trans('clarkwinkelmann-post-stream-search.admin.settings.sideNavAccessHelp'),
        })
        .registerSetting({
            type: 'switch',
            setting: 'post-stream-search.authorQuickFilter',
            label: app.translator.trans('clarkwinkelmann-post-stream-search.admin.settings.authorQuickFilter'),
            help: app.translator.trans('clarkwinkelmann-post-stream-search.admin.settings.authorQuickFilterHelp'),
        })
        .registerSetting({
            type: 'switch',
            setting: 'post-stream-search.originalPosterBadge',
            label: app.translator.trans('clarkwinkelmann-post-stream-search.admin.settings.originalPosterBadge'),
            help: app.translator.trans('clarkwinkelmann-post-stream-search.admin.settings.originalPosterBadgeHelp'),
        });
});
