# this is a package

import json
import os
import lxml
import tempfile
import shutil
import subprocess
import unittest
import warnings

from silva.fanstatic.extending import INTERFACES_RESOURCES


class BusterTestCase(unittest.TestCase):

    def __init__(self, filename, layer, name=None):
        unittest.TestCase.__init__(self)
        self._layer = layer
        self._filename = filename
        if name is None:
            name = layer.__identifier__.split('.')[-1]
        self._name = name
        self._working = None

    def _sources(self):
        group = INTERFACES_RESOURCES.get(self._layer.__identifier__)
        if group is not None:
            for resource in sorted(group.resources):
                stack = [resource.library.path]
                if resource.dirname:
                    stack.append(resource.dirname)
                stack.append(resource.filename)
                yield os.path.join(*stack)

    def _configuration(self, directory):
        with open(os.path.join(directory, 'buster.js'), 'w') as handle:
            handle.write("""
// Generated configuration
var config = module.exports;
""")
            handle.write("""
config["{name}"] = {{
   rootPath: "/",
   environment: "browser",
   sources: {sources},
   tests: ["{filename}"]
}};
""".format(name=self._name,
           sources=json.dumps(list(self._sources())),
           filename=self._filename))

    def setUp(self):
        self._working = tempfile.mkdtemp()
        self._configuration(self._working)

    def runTest(self):
        process = subprocess.Popen(
            ['buster', 'test', '-r', 'xml'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=self._working)
        stdout, stderr = process.communicate()
        if stderr:
            raise self.failureException(stderr)
        if not stdout:
            warnings.warn(
                u"Buster server is not running.",
                UserWarning)
            raise unittest.SkipTest()
        root = lxml.etree.fromstring(stdout)
        for testsuite in root.getchildren():
            assert testsuite.tag == 'testsuite'
            for testcase in testsuite.getchildren():
                assert testcase.tag == 'testcase'
                failures = testcase.xpath('//failure')
                if len(failures):
                    raise self.failureException(
                        "Test %s (%s) failed:\n%s" % (
                            testcase.attrib['name'],
                            testcase.attrib['classname'],
                            '\n'.join(
                                map(lambda f: "{type}: {message}".format(
                                    type=f.attrib['type'],
                                    message=f.attrib['message']),
                                    failures))))

    def tearDown(self):
        try:
            shutil.rmtree(self._working)
            self._working = None
        except:
            pass

    def id(self):
        return self._name

    def __eq__(self, other):
        if not isinstance(other, self.__class):
            raise TypeError
        return other._filename == self._filename

    def __ne__(self, other):
        if not isinstance(other, self.__class):
            raise TypeError
        return other._filename != self._filename

    def __hash__(self):
        return hash(self._filename)

    def shortDescription(self):
        return 'Buster tests: ' + self._filename


