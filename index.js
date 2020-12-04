const filepath = require("path");

export default function ({ types: t }) {
  const updateComponentWithCss = {
    JSXElement(path, state) {
      if (
        path.parent.type === "CallExpression" &&
        path.parent.callee.object.name === "ReactDOM" &&
        path.parent.callee.property.name === "render"
      ) {
        const identifier = t.JSXIdentifier(state.componentName);
        path.parent.arguments[0] = t.JSXElement(
          t.JSXOpeningElement(t.JSXIdentifier(identifier), [
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
    ExportDefaultDeclaration(path, state) {
      const name = path.node.declaration.name;
      const JSXExport = t.JSXElement(
        t.JSXOpeningElement(t.JSXIdentifier(name), []),
        t.JSXClosingElement(t.JSXIdentifier(name)),
        [],
        false
      );
      const identifier = t.JSXIdentifier(state.componentName);
      const JSXGlobal = t.JSXElement(
        t.JSXOpeningElement(identifier, [
          t.JSXAttribute(
            t.JSXIdentifier("link"),
            t.StringLiteral(this.cssPath.toString())
          ),
        ]),
        t.JSXClosingElement(identifier),
        [JSXExport]
      );
      path.node.declaration = t.functionDeclaration(
        t.identifier("_default_css_jsx"),
        [],
        t.blockStatement([t.returnStatement(JSXGlobal)]),
        false,
        false
      );
    },
  };

  return {
    visitor: {
      ImportDeclaration(path, state) {
        if (path.node.source.value.includes(".css")) {
          path.parentPath.traverse(updateComponentWithCss, {
            cssPath: filepath.join(state.rootDir, path.node.source.value),
          });
        }
      },
    },
  };
}
