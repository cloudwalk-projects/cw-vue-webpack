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

const PluginError = gutil.PluginError;

const SCRIPT = "script";
const STYLE = "style";
const TEMPLATE = "template";

const TEMPLATE_ESCAPE_REG = /'/mg
const TEMPLATE_ESCAPE_REG2 = /\r?\n/mg;
const SCRIPT_REPLACER_REG = /^\s*export\s+default\s*/im;
const VUE_COMPONENT_IMPORT_REG = /^\s*import\s+([^\s]+)\s+from\s+([^;\n]+)[\s;]+?$/mg;

module.exports = function (options) {
    return through2.obj(vuePack);
};

/**
 * 打包组件成js和css文件
 * @param file
 * @param encoding
 * @param callback
 */
function vuePack(file, encoding, callback) {
    console.log(file);
    if (!file) {
        throw new PluginError('gulp-vue-pack', 'file不存在');
    }

    if (file.isStream()) {
        throw new PluginError('gulp-vue-pack', '只支持.vue文件');
    }

    if (!file.contents) {
        // 非文件,是目录
        callback();
        return;
    }

    // 设置文件名称
    let fileName = path.basename(file.path, ".vue");
    // 设置文件内容
    let fileContent = file.contents.toString(encoding);

    let data = parseVueFile(fileContent, fileName, path.dirname(file.path));
    
    let fpath = path.dirname(file.path);

    // console.log('path:' + fpath);

    var result = babel.transform(contents.script, {
        presets: ['es2015'],
        plugins: ['transform-runtime', 'transform-es2015-modules-amd'],
        comments: false,
    });

    this.push(createFile(file.base, file.cwd, fpath + '/' + fileName, "index.html", contents.template));

    this.push(createFile(file.base, file.cwd, fpath + '/' + fileName, "index.js", result.code));

    // 如果css文件无内容，则不生成css文件
    if (contents.style.length > 0) {
        this.push(createFile(file.base, file.cwd, fpath + '/' + fileName, "index.css", contents.style));
    }

    callback();

}

function createFile(base, cwd, fpath, fileName, content) {
    return new File({
        base: base,
        cwd: cwd,
        path: path.join(fpath, fileName),
        contents: new Buffer(content)
    });
}

function parseVueFile(vueContent, fileName, filePath) {
    console.log('vueContent:' + vueContent);
    console.log('fileName:' + fileName);
    console.log('filePath:' + filePath);

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