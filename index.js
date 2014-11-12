var ModuleParserHelpers = require('webpack/lib/ModuleParserHelpers');
var NullFactory = require('webpack/lib/NullFactory');
var PushDependency = require('./src/PushDependency');
var ngrequire = require('ngrequire');
var s = require('./src/string');

function apply(options, compiler) {
    compiler.plugin('compilation', function(compilation, params) {
        compilation.dependencyFactories.set(PushDependency, new NullFactory());
        compilation.dependencyTemplates.set(PushDependency, new PushDependency.Template());
    });

    compiler.parser.plugin('call angular.module', function (expression) {
        var self = this;
        var filePath = self.state.current.resource || self.state.module.resource;
        var requireStatement = "require('{0}')";
        var angularDecoratorStatement = requireStatement.f(path.resolve(__dirname, './src/angularDecorator'));
        var moduleLoaderStatement = requireStatement.f(path.resolve(__dirname, './src/moduleLoader'));

        ModuleParserHelpers.addParsedVariable(compiler.parser, 'angular', angularDecoratorStatement);

        // Update cache
        ngrequire.update(options.include, options.options);

        // Add dependencies
        var meta = ngrequire.getMeta(filePath);

        if (meta) {
            ModuleParserHelpers.addParsedVariable(compiler.parser, '__ngrequire_load__', moduleLoaderStatement);
            var deps = ngrequire.getMissingDependencies(filePath);
            var currentModule = meta.moduleName, requiredModules = {};
            deps.forEach(function (dep) {
                requiredModules[dep.moduleName] = dep.relativePath;

                var normalizedName = '__ngrequire_module_{0}__'.f(dep.moduleName.replace(/[\W]/g, ''));
                ModuleParserHelpers.addParsedVariable(compiler.parser, normalizedName, requireStatement.f(dep.relativePath));
            });

            self.state.current.addDependency(new PushDependency(currentModule, requiredModules, expression));
        }
    });
}

module.exports = function(options) {
    if (options instanceof Array) {
        options = {
            include: options
        };
    }

    if (!Array.isArray(options.include)) {
        options.include = [ options.include ];
    }

    // Change all path to absolute
    var cwd = process.cwd();
    options.include = options.include.map(function (include) {
        return path.resolve(cwd, include);
    });

    return {
        apply: apply.bind(this, options)
    };
};