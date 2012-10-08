

(function($, infrae, jsontemplate) {

    // Define columns renderers
    var columns = infrae.views.Registry();

    columns.register({
        name: 'icon',
        factory: function($content, data, column, value) {
            var template = '<a class="preview-icon"><ins class="icon"></ins></a>';
            if (column.action){
                template = '<a class="open-screen preview-icon" href="{data.path|htmltag}" rel="{column.action|htmltag}"><ins class="icon"></ins></a>';
            };
            return {
                column: column,
                jsont: template,
                render: function() {
                    infrae.ui.icon($content.find('ins'), value);
                }
            };
        }
    });

    columns.register({
        name: 'text',
        factory: function($content, data, column, value) {
            var template = '{value}';
            if (column.action && (column.action_match === undefined || infrae.utils.test(data, column.action_match))) {
                template = '<a class="open-screen" rel="{column.action|htmltag}" href="{data.path|htmltag}">{value}</a>';
            };
            return {
                value: value,
                jsont: template,
                column: column
            };
        }
    });

    columns.register({
        name: 'move',
        factory: function($content, data, column, value) {
            return {
                render: function() {
                    if (value) {
                        $content.addClass('moveable icon silva_dotted_horizontal');
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
        name: 'workflow',
        factory: function($content, data, column, value) {
            if (value !== null) {
                var state = ["state", value].join(" ");

                return {
                    state: state,
                    description: column.status[value],
                    jsont: '<ins class="{state|htmltag}" title="{description|htmltag}"></ins>',
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
