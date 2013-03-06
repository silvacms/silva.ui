# -*- coding: utf-8 -*-
# Copyright (c) 2012-2013 Infrae. All rights reserved.
# See also LICENSE.txt
# this is a package

import json
import os
import lxml
import tempfile
import shutil
import subprocess
import unittest
import warnings

from zope.interface.interfaces import IInterface
from silva.fanstatic.extending import INTERFACES_RESOURCES


@apply
def HAVE_BUSTER():
    try:
        process = subprocess.Popen(
            ['buster', '--version'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
    except OSError as error:
        if error.args[0] == 2:
            return False
    return stdout.startswith('Buster.JS')


class BusterTestCase(unittest.TestCase):
    """A buster test case to run Javascript tests.
    """

    def __init__(self, filename, sources=None, name=None):
        unittest.TestCase.__init__(self)
        self._filename = filename
        self._sources = None
        self._name = name
        self._path = None
        if sources is not None:
            self.sources = sources

    @apply
    def sources():

        def setter(self, sources):
            if sources is None:
                self._sources = None
                return
            assert IInterface.providedBy(sources), 'Invalid source specifier.'
            self._sources = sources
            if not self._name:
                self._name = sources.__identifier__.split('.')[-1]

        def getter(self):
            if self._sources is not None:
                group = INTERFACES_RESOURCES.get(self._sources.__identifier__)
                if group is not None:
                    for resource in sorted(group.resources):
                        stack = [resource.library.path]
                        if resource.dirname:
                            stack.append(resource.dirname)
                        stack.append(resource.filename)
                        yield os.path.join(*stack)

        return property(getter, setter)

    def _writeConfiguration(self, directory):
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
           sources=json.dumps(list(self.sources)),
           filename=self._filename))

    def setUp(self):
        self._path = tempfile.mkdtemp()
        self._writeConfiguration(self._path)

    def runTest(self):
        if not HAVE_BUSTER:
            warnings.warn(
                u"Buster is not installed.",
                UserWarning)
            raise unittest.SkipTest()
        process = subprocess.Popen(
            ['buster', 'test', '-r', 'xml'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=self._path)
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
            shutil.rmtree(self._path)
            self._path = None
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

    def __str__(self):
        return self._filename

    def shortDescription(self):
        return 'Buster tests: ' + self._filename


try:
    import infrae.testing.testcase
except ImportError:
    pass
else:
    infrae.testing.testcase.TEST_FACTORIES['.js'] = BusterTestCase
