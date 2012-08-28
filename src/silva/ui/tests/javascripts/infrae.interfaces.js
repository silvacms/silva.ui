
(function(buster, assert, interfaces) {
    buster.testCase("infrae.interfaces", {
        setUp: function() {
            interfaces.register('content');
            interfaces.register('container', ['content']);
            interfaces.register('root', ['container']);
            interfaces.register('file', ['content']);
        },
        tearDown: function() {
            interfaces.clear();
        },
        "implemented_by": function () {
            assert.equals(
                interfaces.implemented_by(""),
                ["string"]);
            assert.equals(
                interfaces.implemented_by({}),
                ['object']);
            assert.equals(
                interfaces.implemented_by(1),
                ['number']);
            assert.equals(
                interfaces.implemented_by({'ifaces': ['content']}),
                ['content', 'object']);
            assert.equals(
                interfaces.implemented_by({'ifaces': ['container']}),
                ['container', 'content', 'object']);
            assert.equals(
                interfaces.implemented_by({'ifaces': ['root']}),
                ['root',  'container', 'content','object']);
        },
        "is_implemented_by": function() {
            assert.equals(
                interfaces.is_implemented_by("number", 1),
                true);
            assert.equals(
                interfaces.is_implemented_by("object", 1),
                false);
            assert.equals(
                interfaces.is_implemented_by("file", {"ifaces": "root"}),
                false);
            assert.equals(
                interfaces.is_implemented_by("object", {"ifaces": "root"}),
                true);
            assert.equals(
                interfaces.is_implemented_by("content", {"ifaces": "root"}),
                true);
            assert.equals(
                interfaces.is_implemented_by("container", {"ifaces": "root"}),
                true);
            assert.equals(
                interfaces.is_implemented_by("root", {"ifaces": "root"}),
                true);
        }
    });
})(buster, assert, infrae.interfaces);
