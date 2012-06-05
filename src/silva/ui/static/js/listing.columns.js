

(function($, infrae, jsontemplate) {

    // Define columns renderers
    var columns = infrae.views.Registry();

    columns.register({
        name: 'action',
        factory: function($content, data, column, value) {
            return {
                column: column,
                value: value,
                jsont: '<a class="open-screen" rel="{column.action|htmltag}" href="{data.path|htmltag}">{value}</a>'
            };
        }
    });

    columns.register({
        name: 'text',
        factory: function($content, data, column, value) {
            return {
                value: value,
                jsont: '{value}'
            };
        }
    });

    columns.register({
        name: 'move',
        factory: function($content, data, column, value) {
            return {
                render: function() {
                    if (value) {
                        $content.addClass('moveable ui-icon ui-icon-grip-dotted-horizontal');
                    };
                }
            };
        }
    });

    columns.register({
        name: 'goto',
        factory: function($content, data, column, value) {
            var entries = [];

            for (var i=0, len=column.menu.length; i < len; i++) {
                var entry = column.menu[i];

                if (entry.item_match === undefined ||
                    infrae.utils.test(data, entry.item_match)){
                    entries.push(
                        '<li><a class="ui-state-default open-screen" href="' + data.path +
                            '" rel="' + entry.screen + '"><span>' +
                            entry.caption + '</span></a></li>');
                };
            };
            return {
                column: column,
                value: value,
                dropdown: entries.join(''),
                jsont: '<div class="actions"><ol><li class="last-action"><a class="ui-state-default open-screen" rel="{column.index.screen|htmltag}" href="{data.path|htmltag}"><div class="dropdown-icon"><ins class="ui-icon ui-icon-triangle-1-s" /></div><span>{column.index.caption}</span></a><div class="dropdown"><ol>{dropdown}</ol></div></li></ol></div>',
                render: function() {
                    $content.addClass('hasdropdown active');
                }
            };
        }
    });

    columns.register({
        name: 'action-icon',
        factory: function($content, data, column, value) {
            return {
                column: column,
                jsont: '<a class="open-screen preview-icon" href="{data.path|htmltag}" rel="{column.action|htmltag}"><ins class="icon"></ins></a>',
                render: function() {
                    infrae.ui.icon($content.find('ins'), value);
                    $content.addClass('active');
                }
            };
        }
    });

    columns.register({
        name: 'workflow',
        factory: function($content, data, column, value) {
            if (value !== null) {
                var state = ["state", value].join(" ");

                return {
                    state: state,
                    jsont: '<ins class="{state|htmltag}"></ins>',
                    render: function() {
                        $content.addClass(column.name);
                    }
                };
            };
            // Ensure the icon is empty.
            return {
                html: ''
            };
        }
    });

    infrae.smi.listing.columns = columns;

})(jQuery, infrae, jsontemplate);
