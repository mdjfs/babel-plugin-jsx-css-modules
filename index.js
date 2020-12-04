"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});

const filepath = require("path");

exports["default"] = function ({ types: t }) {
  // Check the arguments to say if you don't set someone
  const checkArguments = (state) => {
    const argumentsRequired = ["rootDir", "componentName", "componentDir"];
    var isArguments = true;
    for (var argumentRequired of argumentsRequired) {
      if (state.opts[argumentRequired] === undefined) {
        isArguments = false;
        process.stderr.write(
          `[ERROR] babel-plugin-css-jsx-modules: Please set the ${argumentRequired} in plugin options\n`
        );
      }
    }
    return isArguments;
  };

  // Returns the component in charge of handling the CSS
  // link: link of the CSS file
  // childrens: any javascripts element
  // name: name of the handler component
  const getComponentForCss = (name, link, childrens) => {
    const identifier = t.JSXIdentifier(name);
    return t.JSXElement(
      t.JSXOpeningElement(identifier, [
        t.JSXAttribute(t.JSXIdentifier("link"), t.StringLiteral(link)),
      ]),
      t.JSXClosingElement(identifier),
      [...childrens]
    );
  };

  // re-transpile if CSS dir is founded
  const updateComponentWithCss = {
    JSXElement(path) {
      if (
        this.reactDomVar !== null &&
        path.parent.type === "CallExpression" &&
        path.parent.callee.object.name === this.reactDomVar &&
        path.parent.callee.property.name === "render"
      ) {
        const identifier = t.JSXIdentifier(this.opts.componentName.toString());
        path.parent.arguments[0] = t.JSXElement(
          t.JSXOpeningElement(identifier, [
            t.JSXAttribute(
              t.JSXIdentifier("link"),
              t.StringLiteral(this.cssPath.toString())
            ),
          ]),
          t.JSXClosingElement(identifier),
          [path.node]
        );
      }
    },
    ExportDefaultDeclaration(path) {
      const name = path.node.declaration.name;
      // detect if is export default Component;
      if (name) {
        // construct the JSX for the default export if the default export is a name
        const JSXExport = t.JSXElement(
          t.JSXOpeningElement(t.JSXIdentifier(name), []),
          t.JSXClosingElement(t.JSXIdentifier(name)),
          [],
          false
        );
        const JSXGlobal = getComponentForCss(
          this.opts.componentName,
          this.cssPath,
          [JSXExport]
        );
        path.node.declaration = t.functionDeclaration(
          t.identifier("_default_css_jsx"),
          [],
          t.blockStatement([t.returnStatement(JSXGlobal)]),
          false,
          false
        );
      } else if (path.node.declaration.type == "FunctionDeclaration") {
        // construct the JSX for the default export if the default export is a function
        const func = path.node.declaration.body;
        if (func.body.length > 0) {
          for (var statement of func.body) {
            if (
              statement.type === "ReturnStatement" &&
              statement.argument.type === "JSXElement"
            ) {
              statement.argument = getComponentForCss(
                this.opts.componentName,
                this.cssPath,
                [statement.argument]
              );
            }
          }
        }
      }
    },
  };

  return {
    visitor: {
      ImportDeclaration(path, state) {
        // check if the value of the import is a .css file
        if (path.node.source.value.includes(".css")) {
          // validate arguments of plugin
          if (checkArguments(state)) {
            //check if module react-dom exists and get the identifier
            var reactDomName = null;
            for (var node of path.parent.body) {
              if (node.type === "ImportDeclaration") {
                if (node.source.value.includes("react-dom")) {
                  for (var specifier of node.specifiers) {
                    if (specifier.type === "ImportDefaultSpecifier") {
                      reactDomName = specifier.local.name;
                    }
                  }
                }
              }
            }
            // get source and re-transpile file to transform exports or render of components
            const source = path.node.source.value.toString();
            path.parentPath.traverse(updateComponentWithCss, {
              cssPath: filepath.join(state.opts.rootDir, source),
              reactDomVar: reactDomName,
              opts: {
                ...state.opts,
              },
            });
            // set default name of import to componentName
            path.node.specifiers.push(
              t.ImportDefaultSpecifier(t.identifier(state.opts.componentName))
            );
            // set source of the import to the dir of the component
            if (filepath.isAbsolute(state.opts.componentDir))
              path.node.source.value = state.opts.componentDir;
            else
              path.node.source.value = filepath.join(
                state.opts.rootDir,
                state.opts.componentDir
              );
          }
        }
      },
    },
  };
};

module.exports = exports["default"];
