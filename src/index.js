/**
 * 作者: bullub
 * 日期: 16/10/14 15:18
 * 用途:
 */
"use strict";

const gutil = require("gulp-util");
const through2 = require("through2");
const path = require("path");
const File = require("vinyl");
const HTMLParser = require("htmlparser2");

const babel = require("babel-core");

/**
 * postcss
 */
const postcss = require('postcss'),
  autoprefixer = require('autoprefixer'),
  cssnext = require('cssnext'),
  precss = require('precss');

const PluginError = gutil.PluginError;

const SCRIPT = "script";
const STYLE = "style";
const TEMPLATE = "template";

const TEMPLATE_ESCAPE_REG = /'/mg
const TEMPLATE_ESCAPE_REG2 = /\r?\n/mg;
const SCRIPT_REPLACER_REG = /^\s*export\s+default\s*/im;
const VUE_COMPONENT_IMPORT_REG = /^\s*import\s+([^\s]+)\s+from\s+([^;\n]+)[\s;]+?$/mg;

module.exports = function (options) {
  options = options || {
    presets: ['es2015'],
    plugins: ['transform-runtime', 'transform-es2015-modules-amd'],
    comments: false,
  };

  /**
   * 打包组件成js和css文件
   * @param file
   * @param encoding
   * @param callback
   */
  return through2.obj(function (file, encoding, callback) {
    if (!file) {
      throw new PluginError('gulp-cw-vue-app-pack', 'file不存在');
    }

    if (file.isStream()) {
      throw new PluginError('gulp-cw-vue-app-pack', '只支持.vue文件');
    }

    if (!file.contents) {
      // 非文件,是目录
      callback();
      return;
    }

    let fileId = 'cw-file-' + createFileId();

    // 设置文件名称
    let fileName = path.basename(file.path, ".vue");
    // 设置文件内容
    let fileContent = file.contents.toString(encoding);
    // 设置文件路径
    let filePath = path.dirname(file.path);

    let data = parseVueFile(fileContent, fileName, filePath);
    // 目标目录
    let destPath = filePath + '\\' + fileName;

    let hasTemplate = false;

    let _this = this;

    if (data.template.length > 0) {
      let templateContent = fixParentPath(data.template);

      let DomUtils = HTMLParser.DomUtils;
      let domEls = HTMLParser.parseDOM(templateContent, { lowerCaseTags: true });

      templateContent = '';

      let setFileIdAttr = (elements) => {
        for (let i = 0, len = elements.length; i < len; i++) {
          if (elements[i].attribs) {
            elements[i].attribs[fileId] = '';
          }

          if (elements[i].children) {
            setFileIdAttr(elements[i].children);
          }
        }
      };

      for (let i = 0, len = domEls.length; i < len; i++) {
        if (domEls[i].attribs) {
          // var attr = DomUtils.createAttribute("good");
          // document.getElementById("sss").setAttributeNode(d);
          domEls[i].attribs[fileId] = '';
          // DomUtils.setAttributeNode(attr);
        }
        if (domEls[i].children) {
          setFileIdAttr(domEls[i].children);
        }

        templateContent += DomUtils.getOuterHTML(domEls[i], { xmlMode: false });
      }

      this.push(createFile(file.base, file.cwd, destPath, "index.html", templateContent));
      data.script = 'import template from "text!./index.html";\n' + data.script;
      hasTemplate = true;
      // gutil.log(destPath + '\\index.html created.');
    }

    // 如果css文件无内容，则不生成css文件
    if (data.style.length > 0) {
      let styleContent = fixParentPath(data.style);

      let result = postcss([cssnext])
        .process(styleContent, { parser: postcss.parser });
      /*
      .then(result => {
        result.root.walkRules(rule => {
          result.warn(rule.selector);
          rule.selector = rule.selector + '[cw-page-1]';
          // selectors.push(rule.selector);
        });

        styleContent = result.root.toString();
        gutil.log(styleContent);

        _this.push(createFile(file.base, file.cwd, destPath, "index.css", styleContent));
      });*/
      result.root.walkRules(rule => {
        // 处理 css 名称后缀
        let selectors = rule.selector.split(',');

        for (let i = 0; i < selectors.length; i++) {
          let index = selectors[i].lastIndexOf(':');

          if (index > 0) {
            selectors[i] = selectors[i].substr(0, index) + '[' + fileId + ']' + selectors[i].substr(index, selectors[i].length - index);
          }
          else {
            selectors[i] = selectors[i] + '[' + fileId + ']';
          }
        }
        rule.selector = selectors.join(',');
      });

      styleContent = result.root.toString();
      // gutil.log(styleContent);

      _this.push(createFile(file.base, file.cwd, destPath, "index.css", styleContent));

      data.script = 'import style from "css!./index.css";\n' + data.script;
      // gutil.log(destPath + '\\index.css created.');
    }

    let lines = fixParentPath(data.script).split('\n');

    // 是否定义了模板变量
    let definedTemplate = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      // 处理引用文件
      if (line.indexOf('import') == 0) {
        // 处理 vue 文件引用
        line = line.replace('.vue";', '/index.js";').replace('.vue\';', '/index.js\';');
        lines[i] = line;
      }
      // 处理模板文件
      else if (line.indexOf('"{template-content}"') > -1 || line.indexOf('\'{template-content}\'') > -1) {
        lines[i] = lines[i].replace('"{template-content}"', 'template').replace('\'{template-content}\'', 'template');
        definedTemplate = true;
      }

      // console.log(lines[i]);
    }

    if (hasTemplate && !definedTemplate) {
      // 最后一个大括号出现的位置
      let lastLineIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('template:') > -1) {
          definedTemplate = true;
          break;
        }
        if (lines[i].lastIndexOf('}') > -1) {
          lastLineIndex = i;
        }
      }

      if (!definedTemplate && lastLineIndex > 0) {
        let text = lines[lastLineIndex];
        let index = text.lastIndexOf('}');
        lines[lastLineIndex] = text.substr(0, index) + ',\ntemplate:template' + text.substr(index, text.length - index);
      }
    }

    data.script = lines.join('\n');

    let result = babel.transform(data.script, options);

    this.push(createFile(file.base, file.cwd, destPath, "index.js", result.code));
    // gutil.log(destPath + '\\index.js created.');
    callback();
  });
};

/**
 * 创建 Gulp File Stream
 */
const createFile = (base, cwd, fpath, fileName, content) => {
  return new File({
    base: base,
    cwd: cwd,
    path: path.join(fpath, fileName),
    contents: new Buffer(content)
  });
}

/**
 * 解析 vue 文件内容
 */
const parseVueFile = (vueContent, fileName, filePath) => {
  let scriptContents = "";
  let styleContents = "";
  let templateContents = "";

  let DomUtils = HTMLParser.DomUtils;
  let domEls = HTMLParser.parseDOM(vueContent, { lowerCaseTags: true });

  for (let i = 0, len = domEls.length; i < len; i++) {
    switch (domEls[i].name) {
      case SCRIPT:
        scriptContents = DomUtils.getText(domEls[i]);
        break;
      case TEMPLATE:
        templateContents = DomUtils.getInnerHTML(domEls[i]);
        break;
      case STYLE:
        styleContents = DomUtils.getText(domEls[i]).trim();
        break;
    }
  }

  return {
    script: scriptContents,
    template: templateContents,
    style: styleContents
  }
}

/**
 * 处理父级路径
 */
const fixParentPath = (content) => {
  // gutil.log(content);
  let lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 处理引用文件
    // (*) 这里可能用正则表达式性能更佳
    if (line.indexOf('"./') > -1 || line.indexOf('\'./') > -1 || line.indexOf('"../') > -1 || line.indexOf('\'../') > -1) {
      // 处理相对路径
      line = line.replace('"./', '"../')
        .replace('\'./', '\'../')
        .replace('"../', '"../../')
        .replace('\'../', '\'../../');
      lines[i] = line;
    }
  }

  return lines.join('\n');
}

/**
 * 生成八位随机数
 */
const createFileId = () => {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (S4() + S4());
}
