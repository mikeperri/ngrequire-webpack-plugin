var gulp = require('gulp');
var path = require('path');
var _ = require('lodash');
var webpack = require('webpack-stream');
var karma = require('karma');
var shell = require('gulp-shell');
var fs = require('fs-extra');
var async = require('async');


var ngRequirePlugin = require('./index');

var webpackConf = require('./test/config/webpack.conf.js');
var s = require('./src/string');


var base = path.resolve(__dirname);
var testFolder = base + '/test';
var outFolder = testFolder + '/out';
var fixtureFolder = testFolder + '/fixture';

var paths = {
    test: [
        __dirname + '/node_modules/angular/angular.js',
        __dirname + '/node_modules/angular-mocks/angular-mocks.js',
        __dirname + '/test/out/**/*.js',
        __dirname + '/test/spec_*.js'
    ]
};

var pluginConfig = {
    simple: {
        entry: './index.js',
        include: [
            './*.js',
            '!./moduleOutsideIndexingScope.js'
        ]
    },
    priority: {
        entry: ['./a.js', './b.js'],
        include: [
            './**/*.js'
        ]
    }
};

function pack(caseName, callback) {
    var fixturePath = path.join(fixtureFolder, caseName);
    var pathConfig = pluginConfig[caseName];

    var conf = _.cloneDeep(webpackConf);
    conf.context = fixturePath;
    conf.entry = pathConfig.entry;

    conf.plugins.push(new ngRequirePlugin({
        basePath: fixturePath,
        include: pathConfig.include
    }));

    gulp.src([ fixturePath + '/**/*.js' ])
        .pipe(webpack(conf))
        .pipe(gulp.dest('./test/out/' + caseName))
        .on('end', callback);
}

gulp.task('test', function(done) {
    // Clear out folder
    fs.removeSync(outFolder);

    // Pack cases
    var tasks = [];

    _.each(fs.readdirSync(testFolder), function (fileName) {
        var filePath = path.join(testFolder, fileName);

        if (fs.lstatSync(filePath).isFile() && !fileName.startsWith('.')) {

            var caseName = path.basename(fileName, '.js').replace(/spec_/g, '');
            tasks.push(pack.bind(null, caseName));
        }
    });

    async.parallel(tasks, function () {
        new karma.Server({
            files: paths.test,
            configFile: __dirname + '/test/config/karma.conf.js',
            action: 'run'
        }, done).start();
    });
});

gulp.task('release', function () {
    // copy file
    gulp.src('')
        .pipe(shell(['npm version patch']))
        .pipe(shell(['npm publish']));
});
